import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import BarDraftLine from './BarDraftLine.jsx'
import { draftEnterAction } from './draftEnterKey.js'
import { SoloScrollLine, SoloWave } from './SoloComposer.jsx'
import { INSPECT_GLASS_CLASS } from './glassChrome.js'
import { scrollChildIntoView } from './ScrollFadeLine.jsx'
import { padCaretTextarea } from './syncImeScroll.js'
import {
  FS_EDGE_RADIUS,
  FS_SIDE_INSET,
  expandDuration,
  inputDuration,
  sideDuration,
} from './previewFullscreen.js'

/**
 * 预览页外层的系统框：状态栏、顶部模式切换、底部全屏和一行输入。
 * 点选按钮由 ElementPicker 挂进 fabSlotRef。
 * 键盘没收起时，多选草稿写在底部这枚单行 textarea 里。
 * 点选遮罩盖住整框，含状态栏和按钮之间的空隙；只有上下系统按钮浮在遮罩上。
 * 全屏分两段：先收起顶栏和输入框，再把两侧按钮贴边；选中态把输入框收回来。
 */

/** 按纯文本宽度把光标滚进 textarea 的可视区，高度仍锁在一行 */
function scrollCaretIntoView(el, caret) {
  const view = el.clientWidth
  if (view <= 0) return
  const pos = Math.max(0, Math.min(caret ?? el.value.length, el.value.length))
  const style = getComputedStyle(el)
  const mirror = document.createElement('span')
  mirror.textContent = el.value.slice(0, pos)
  mirror.style.position = 'absolute'
  mirror.style.visibility = 'hidden'
  mirror.style.whiteSpace = 'pre'
  mirror.style.font = style.font
  mirror.style.letterSpacing = style.letterSpacing
  document.body.appendChild(mirror)
  const width = mirror.getBoundingClientRect().width
  mirror.remove()
  const padding = 8
  if (width < el.scrollLeft + padding) el.scrollLeft = Math.max(0, width - padding)
  else if (width > el.scrollLeft + view - padding) el.scrollLeft = Math.max(0, width - view + padding)
}

export default function DeviceFrame({
  fabSlotRef,
  text = '',
  caret = 0,
  segments = null,
  cursor = null,
  running = false,
  onActivate,
  onStop,
  onInsert,
  onSend,
  solo = null,
  fsPhase = 'off',
  fsEntering = false,
  onToggleFullscreen,
  barHoldEnabled = false,
  selectMode = null,
  onExitSelect,
  armedN = null,
  scheme = 'click',
}) {
  const inputRef = useRef(null)
  const rowRef = useRef(null)
  const composeRef = useRef(null)
  const composingRef = useRef('')
  const pendingExpandRef = useRef(false)
  const panRef = useRef(null)
  const onInsertRef = useRef(onInsert)
  const onActivateRef = useRef(onActivate)
  const dictatingRef = useRef(false)
  const showInputRef = useRef(true)
  const [focused, setFocused] = useState(false)
  // 插槽节点一出现就通知点选按钮。回调保持稳定，避免每次提交先清空再重挂
  const bindFabSlot = useCallback((node) => {
    if (!fabSlotRef) return
    fabSlotRef.current = node
    fabSlotRef.bind?.(node)
  }, [fabSlotRef])
  onInsertRef.current = onInsert
  onActivateRef.current = onActivate
  const dictating = !!solo
  dictatingRef.current = dictating
  const fullscreen = fsPhase !== 'off'
  // 贴边只在全屏空闲；选中态和普通布局都把圆钮留在能夹住输入框的位置
  const edge = fsPhase === 'dock'
  const showInput = !fullscreen || fsPhase === 'pick'
  showInputRef.current = showInput
  // 缩略态用芯片层画草稿；textarea 仍是真正的焦点，给拼音用
  // 生成中如果又进入了选择，草稿仍要露出来，不要被进行中的文案盖住
  const rich = (!running || !!selectMode) && !dictating && Array.isArray(segments)
  const topMotion = expandDuration(fsEntering)
  const sideMotion = sideDuration(fsPhase)
  const inputMotion = inputDuration(fsPhase, fsEntering)

  // 直接听原生 compositionend。组词过程不改草稿，上屏整段再插入
  useEffect(() => {
    const el = inputRef.current
    if (!el) return undefined
    const paint = () => {
      const node = composeRef.current
      if (node && node.textContent !== composingRef.current) node.textContent = composingRef.current
      const row = rowRef.current
      if (row && node && composingRef.current) {
        scrollChildIntoView(row, node)
        row.dispatchEvent(new Event('scroll'))
      }
    }
    const onCompositionStart = () => {
      composingRef.current = ''
      el.dataset.inspectComposing = '1'
      paint()
    }
    const onCompositionUpdate = (e) => {
      if (el.readOnly) return
      composingRef.current = e.data || ''
      paint()
    }
    const onCompositionEnd = (e) => {
      composingRef.current = ''
      delete el.dataset.inspectComposing
      paint()
      if (el.readOnly) return
      const data = e.data
      if (!data) return
      // 上屏后立刻写进受控 value，避免读到组词前的旧文本
      flushSync(() => onInsertRef.current?.(data))
    }
    el.addEventListener('compositionstart', onCompositionStart)
    el.addEventListener('compositionupdate', onCompositionUpdate)
    el.addEventListener('compositionend', onCompositionEnd)
    return () => {
      el.removeEventListener('compositionstart', onCompositionStart)
      el.removeEventListener('compositionupdate', onCompositionUpdate)
      el.removeEventListener('compositionend', onCompositionEnd)
    }
  }, [])

  // 父级重绘时把还在组的词补回去，避免受控 value 把组词清掉
  useLayoutEffect(() => {
    const node = composeRef.current
    if (node && node.textContent !== composingRef.current) node.textContent = composingRef.current
  })

  // 捕获阶段先于点选逻辑清掉 armed 标记，短按才能展开，长按仍留给听写
  useEffect(() => {
    const onUp = (e) => {
      if (e.button !== 0) return
      const pan = panRef.current
      panRef.current = null
      if (!pendingExpandRef.current) return
      pendingExpandRef.current = false
      const el = inputRef.current
      if (!el) return
      if (el.dataset.inspectHold === 'armed') return
      // 进行中或队列里已有内容也不挡住短按。听写中仍不展开
      if (!showInputRef.current || dictatingRef.current) return
      if (pan && pan.id === e.pointerId) {
        const dx = e.clientX - pan.x
        const dy = e.clientY - pan.y
        if (pan.scrolling || pan.locked || dx * dx + dy * dy > 64) return
      }
      onActivateRef.current?.()
    }
    window.addEventListener('pointerup', onUp, true)
    return () => window.removeEventListener('pointerup', onUp, true)
  }, [])

  // 滚动条藏掉之后，滚轮仍推动芯片行
  useEffect(() => {
    const el = inputRef.current
    if (!el) return undefined
    const onWheel = (e) => {
      const row = rowRef.current
      if (!row || row.scrollWidth - row.clientWidth <= 2) return
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!delta) return
      row.scrollLeft += delta
      e.preventDefault()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // 芯片行按实际渲染宽度滚光标；拼音框的 scrollLeft 跟着这一行，不按纯文本另算
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el || running || dictating) return
    if (rich && rowRef.current) {
      const row = rowRef.current
      const caretEl = row.querySelector('[data-inspect-caret]')
      const caretX = caretEl ? caretEl.offsetLeft : 0
      if (!el.dataset.inspectComposing && (caretX > 1 || row.scrollWidth > row.clientWidth + 2)) {
        padCaretTextarea(el, caretX, row.scrollWidth)
      }
      if (el.scrollLeft !== row.scrollLeft) el.scrollLeft = row.scrollLeft
      return
    }
    scrollCaretIntoView(el, caret)
  })

  useEffect(() => {
    const row = rowRef.current
    const el = inputRef.current
    if (!row || !el || !rich) return undefined
    const sync = () => {
      const caretEl = row.querySelector('[data-inspect-caret]')
      const caretX = caretEl ? caretEl.offsetLeft : 0
      if (!el.dataset.inspectComposing && (caretX > 1 || row.scrollWidth > row.clientWidth + 2)) {
        padCaretTextarea(el, caretX, row.scrollWidth)
      }
      if (el.scrollLeft !== row.scrollLeft) el.scrollLeft = row.scrollLeft
    }
    row.addEventListener('scroll', sync, { passive: true })
    return () => row.removeEventListener('scroll', sync)
  }, [rich])

  return (
    <div className="pointer-events-none absolute inset-0" data-inspect-ui>
      <header
        aria-label="状态栏"
        aria-hidden={fullscreen ? 'true' : undefined}
        className="absolute inset-x-0 top-0 flex h-[52px] items-center justify-between px-[22px] text-[15px] font-semibold tracking-[-0.02em] text-[#111113]"
        style={{
          opacity: fullscreen ? 0 : 1,
          transform: fullscreen ? 'translateY(-12px)' : 'none',
          transition: `opacity ${topMotion}, transform ${topMotion}`,
        }}
      >
        <span>9:41</span>
        <span className="flex items-center gap-[5px]">
          <SignalIcon />
          <WifiIcon />
          <BatteryIcon />
        </span>
      </header>

      {/* 五个独立玻璃控件，浮在点选遮罩之上；间隙不挡遮罩 */}
      <div
        aria-hidden={fullscreen ? 'true' : undefined}
        className={
          'pointer-events-none absolute inset-x-0 top-[50px] z-30 flex items-center px-4 ' +
          (selectMode ? 'justify-start' : 'justify-center gap-3') +
          (fullscreen ? ' [&_button]:!pointer-events-none' : '')
        }
        style={{
          opacity: fullscreen ? 0 : 1,
          transform: fullscreen ? 'translateY(-12px)' : 'none',
          transition: `opacity ${topMotion}, transform ${topMotion}`,
        }}
      >
        <CircleButton
          label="返回"
          locked={fullscreen}
          onClick={selectMode ? onExitSelect : undefined}
        >
          <ChevronLeftIcon />
        </CircleButton>
        {selectMode ? (
          <>
            {/* 选择态标题用细字重，颜色和位置不动。链路 4 字色是黑且去掉投影，其余方案仍是白字带投影 */}
            <p
              data-select-title=""
              className={
                'pointer-events-none absolute left-16 right-16 top-1/2 -translate-y-1/2 text-center text-[19px] font-light tracking-[-0.01em] ' +
                (scheme === 'long-press'
                  ? 'text-black'
                  : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]')
              }
            >
              {selectMode === 'solo' ? '选择元素, 松开发送' : '选择元素'}
            </p>
          </>
        ) : (
          <>
            <CircleButton label="对话" locked={fullscreen}>
              <ChatIcon />
            </CircleButton>
            {/* 占满这一行左右圆钮之间的剩余宽度，圆钮仍是 48 */}
            <button
              type="button"
              aria-pressed="true"
              data-inspect-ui
              data-inspect-chrome
              className={`flex h-12 w-full min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-4 text-[15px] font-medium tracking-[-0.01em] text-[#1c1c1e] shadow-[0_2px_10px_rgba(0,0,0,0.06)] ${INSPECT_GLASS_CLASS}`}
              style={{ pointerEvents: fullscreen ? 'none' : 'auto' }}
            >
              <PhoneIcon />
              Preview
            </button>
            <CircleButton label="桌面预览" locked={fullscreen}>
              <MonitorIcon />
            </CircleButton>
            <CircleButton label="工具" locked={fullscreen}>
              <WrenchIcon />
            </CircleButton>
          </>
        )}
      </div>

      {/* 底栏按钮同样浮在遮罩上，整条灰底不再挡住遮罩 */}
      {/* 胶囊下方始终留出语音轴高度，听写开关时输入框不跳动；非听写只留空 */}
      {/* 三个控件排成一行，位置跟着底栏走，不各自钉在屏幕坐标上 */}
      {/* 再抬起 Home 指示条的高度；桌面 env 为 0，仍是原来的 6px，贴边动画不改左右 */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-[calc(6px+env(safe-area-inset-bottom,0px))] z-30 flex items-start gap-2.5"
        style={{
          height: 70,
          paddingLeft: edge ? 0 : FS_SIDE_INSET,
          paddingRight: edge ? 0 : FS_SIDE_INSET,
          transition: `padding ${sideMotion}`,
        }}
        data-solo={dictating ? 'true' : undefined}
      >
        <button
          type="button"
          aria-label={fullscreen ? '退出全屏' : '全屏'}
          aria-pressed={fullscreen}
          data-inspect-ui
          data-inspect-chrome
          data-fs-edge={edge ? '1' : '0'}
          onClick={onToggleFullscreen}
          style={{
            pointerEvents: 'auto',
            borderRadius: edge ? `0 ${FS_EDGE_RADIUS}px ${FS_EDGE_RADIUS}px 0` : '24px',
            transition: `border-radius ${sideMotion}`,
          }}
          className={`relative flex h-12 shrink-0 items-center justify-center text-[#1c1c1e] shadow-[0_2px_10px_rgba(0,0,0,0.06)] ${INSPECT_GLASS_CLASS} ${edge ? 'w-fit px-1 [&_svg]:h-4 [&_svg]:w-4' : 'w-12 p-0'}`}
        >
          <span className="inline-flex">
            <span
              key={fullscreen ? 'exit' : 'enter'}
              className={fullscreen ? 'inspect-fs-icon-enter inline-flex' : 'inspect-fs-icon-exit inline-flex'}
            >
              {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            </span>
          </span>
        </button>

        <div
          data-fs-input={showInput ? '1' : '0'}
          className="relative min-w-0 flex-1"
          style={{
            opacity: showInput ? 1 : 0,
            transform: showInput ? 'none' : 'translateY(12px)',
            pointerEvents: 'none',
            transition: `opacity ${inputMotion}, transform ${inputMotion}`,
          }}
        >
          <div
            className={
              `flex h-12 min-w-0 items-center rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.06)] ${INSPECT_GLASS_CLASS} ` +
              (dictating ? 'px-4' : 'pl-1.5 pr-1.5')
            }
            data-inspect-ui
            data-inspect-chrome
            style={{ pointerEvents: 'auto' }}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              // 加号、麦克风、停止各自处理，不从胶囊空白这里展开
              if (e.target instanceof Element && e.target.closest('button')) return
              // 文字框只有一行高。点在胶囊上下留白或芯片上时，目标不是 textarea，也要能短按展开
              // 正在跑或队列里已有内容时仍展开。听写中不展开
              if (dictating || !showInput) return
              pendingExpandRef.current = true
              panRef.current = {
                id: e.pointerId,
                x: e.clientX,
                y: e.clientY,
                left: rowRef.current?.scrollLeft || 0,
                scrolling: false,
                locked: false,
              }
            }}
            onPointerCancel={() => {
              pendingExpandRef.current = false
              panRef.current = null
            }}
          >
            {dictating ? null : (
              <button
                type="button"
                aria-label="添加"
                data-inspect-chrome
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-[#8a8a8e] hover:bg-black/5 active:bg-black/8"
              >
                <PlusIcon />
              </button>
            )}
            {/* 空闲显示草稿；进行中占位留空，不叠进程文案。这一层文字用细体 */}
            {/* 生成中右侧已是停止按钮，但草稿为空时仍显示 Hold to talk。有文字时 placeholder 自己不出现；听写中 value 被清空，不能再叠这句 */}
            <div className="relative h-6 min-w-0 flex-1 overflow-hidden font-light">
              <textarea
                ref={inputRef}
                rows={1}
                wrap="off"
                readOnly={running || dictating}
                data-inspect-ime="bar"
                aria-label={dictating ? '听写输入' : text ? '选区输入' : '按住说话'}
                placeholder={dictating ? '' : 'Hold to talk...'}
                value={dictating ? '' : text}
                onChange={() => {
                  // value 始终跟草稿 plainText，上屏文字在 compositionend 写入
                }}
                style={{ height: 24, minHeight: 24, maxHeight: 24 }}
                className={
                  'box-border block h-6 w-full min-w-0 resize-none overflow-hidden whitespace-nowrap border-0 bg-transparent px-0 py-0 font-light text-[15px] leading-6 outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden placeholder:font-light placeholder:text-[#b1b1b6] ' +
                  (rich ? 'text-transparent caret-transparent ' : 'text-[#1c1c1e] ') +
                  (dictating ? 'pointer-events-none' : '')
                }
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  // 听写不在这条框里改成编辑，Enter 也不打断长按
                  if (dictating) return
                  const action = draftEnterAction(e.nativeEvent)
                  if (!action) return
                  // 展开卡片在 window 上处理同一套按键，这里让开，避免发两次
                  if (document.querySelector('[data-inspect-ime="editor"]')) return
                  e.preventDefault()
                  if (action === 'break') {
                    onInsert?.('\n')
                    return
                  }
                  if (!text.trim()) return
                  onSend?.()
                }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return
                  // 听写中不把焦点送进这条框，避免组词写进多选草稿
                  if (dictating) {
                    e.preventDefault()
                    return
                  }
                  // 全屏把输入框藏起来时，短按不抢焦点；长按仍由外层计时
                  if (!showInput) {
                    e.preventDefault()
                    return
                  }
                  // 正在跑或队列里已有内容时，多选短按仍展开。长按成立前不 preventDefault
                  pendingExpandRef.current = true
                  panRef.current = {
                    id: e.pointerId,
                    x: e.clientX,
                    y: e.clientY,
                    left: rowRef.current?.scrollLeft || 0,
                    scrolling: false,
                    locked: false,
                  }
                }}
                onPointerMove={(e) => {
                  const pan = panRef.current
                  if (!pan || pan.id !== e.pointerId) return
                  const row = rowRef.current
                  if (!row) return
                  const dx = e.clientX - pan.x
                  const dy = e.clientY - pan.y
                  if (!pan.scrolling) {
                    if (Math.abs(dx) < 6) return
                    if (Math.abs(dy) > Math.abs(dx)) {
                      pan.locked = true
                      return
                    }
                    pan.scrolling = true
                  }
                  if (pan.locked) return
                  row.scrollLeft = pan.left - dx
                }}
                onPointerCancel={() => {
                  pendingExpandRef.current = false
                  panRef.current = null
                }}
              />
              {rich ? (
                <div className="pointer-events-none absolute inset-0">
                  {/* 折叠态不把点击交给芯片，否则热区挡住短按，输入框展不开。删除只在展开态 */}
                  <BarDraftLine
                    ref={rowRef}
                    segments={segments}
                    cursor={cursor}
                    showCaret={focused}
                    composeRef={composeRef}
                    armedN={armedN}
                  />
                </div>
              ) : null}
              {dictating ? (
                <div className="absolute inset-0">
                  <SoloScrollLine
                    prefix={solo.prefix}
                    segments={solo.segments}
                    label={solo.label}
                    summary={solo.summary}
                    speech={solo.speech}
                  />
                </div>
              ) : null}
            </div>
            {dictating ? null : running ? (
              <button
                type="button"
                aria-label="停止"
                data-inspect-chrome
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-[#1c1c1e] p-0 text-white"
                onPointerDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onStop?.()
                }}
              >
                <span className="block h-[11px] w-[11px] rounded-[3px] bg-white" />
              </button>
            ) : (
              <button
                type="button"
                aria-label="按住说话"
                data-inspect-chrome
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-[#1c1c1e] p-0 text-white"
              >
                <MicIcon />
              </button>
            )}
          </div>
          {/* 和听写波形同一块高度；没在听写时不画条，避免底栏被顶上去 */}
          <div className="pointer-events-none mt-1 flex h-[18px] w-full items-end">
            {dictating ? <SoloWave /> : null}
          </div>
        </div>

        {/* 点选按钮挂在这里，和全屏、输入框同一行。贴边靠底栏左右内边距一起收到 0 */}
        <div
          ref={bindFabSlot}
          data-fs-edge={edge ? '1' : '0'}
          data-fs-fab-slot=""
          className={edge ? 'relative h-12 w-fit shrink-0' : 'relative h-12 w-12 shrink-0'}
        />
      </div>
    </div>
  )
}

function CircleButton({ label, children, bare = false, locked = false, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      data-inspect-ui
      data-inspect-chrome
      tabIndex={locked ? -1 : undefined}
      onClick={onClick}
      style={{ pointerEvents: locked ? 'none' : 'auto' }}
      className={
        bare
          ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-[#1c1c1e]'
          : `flex h-12 w-12 shrink-0 items-center justify-center rounded-full p-0 text-[#1c1c1e] shadow-[0_2px_10px_rgba(0,0,0,0.06)] ${INSPECT_GLASS_CLASS}`
      }
    >
      {children}
    </button>
  )
}

function SignalIcon() {
  return (
    <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor" aria-hidden="true">
      <rect x="0" y="8" width="3" height="4" rx="0.6" />
      <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.6" />
      <rect x="9" y="3" width="3" height="9" rx="0.6" />
      <rect x="13.5" y="0.5" width="3" height="11.5" rx="0.6" />
    </svg>
  )
}

function WifiIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
      <path d="M1 4.2C4.6 1.2 11.4 1.2 15 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3.3 6.6c2.4-1.8 6.9-1.8 9.4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5.7 8.9c1.3-1 3.3-1 4.6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="10.6" r="1" fill="currentColor" />
    </svg>
  )
}

function BatteryIcon() {
  return (
    <svg width="25" height="12" viewBox="0 0 25 12" fill="none" aria-hidden="true">
      <rect x="0.6" y="0.6" width="21" height="10.8" rx="2.4" stroke="currentColor" strokeWidth="1.2" />
      <rect x="2" y="2" width="16" height="8" rx="1.2" fill="currentColor" />
      <path d="M23 4.2v3.6c.8-.3 1.2-1 1.2-1.8s-.4-1.5-1.2-1.8Z" fill="currentColor" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" opacity="0.9">
      <path d="M12.7274 3.63623L6.36377 9.99987L12.7274 16.3635" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" opacity="0.9">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M15.3389 9.73291C17.7819 9.73292 19.7627 11.7137 19.7627 14.1567C19.7627 14.7471 19.6466 15.312 19.4355 15.8286C19.3369 16.0701 19.3206 16.279 19.3682 16.438L19.7363 17.6685C19.7973 17.8725 19.7503 18.0939 19.6113 18.2554C19.4723 18.4167 19.2606 18.4962 19.0498 18.4663L17.6152 18.2622C17.3255 18.221 17.0008 18.2769 16.6143 18.3931C16.2099 18.5146 15.7811 18.5796 15.3389 18.5796C12.896 18.5795 10.9162 16.5996 10.916 14.1567C10.9161 11.7138 12.8959 9.73305 15.3389 9.73291ZM9.64648 3.23877C12.2631 3.23877 14.5685 4.57167 15.9209 6.59229C16.1129 6.87916 16.0359 7.26751 15.749 7.45947C15.4622 7.65115 15.0747 7.57435 14.8828 7.2876C13.7525 5.59867 11.8287 4.48877 9.64648 4.48877C6.17012 4.48898 3.35171 7.30731 3.35156 10.7837C3.35156 11.6407 3.52303 12.4567 3.83203 13.1997C4.10282 13.8508 4.24665 14.6238 4.04297 15.3931L3.7002 16.687C3.67666 16.7759 3.75577 16.8592 3.8457 16.8403L5.69336 16.4478C6.17801 16.345 6.65409 16.4243 7.05176 16.5298C7.42167 16.6279 7.86466 16.7943 8.13477 16.8794C8.36996 16.9535 8.64238 17.0046 8.91895 17.0366C9.2617 17.0764 9.50737 17.3872 9.46777 17.73C9.42791 18.0725 9.118 18.3183 8.77539 18.2788C8.44672 18.2408 8.09151 18.1766 7.75879 18.0718C7.35921 17.9459 7.08354 17.8312 6.73145 17.7378C6.40702 17.6517 6.15539 17.6276 5.95312 17.6704L4.10449 18.063C3.10345 18.2749 2.23033 17.3569 2.49219 16.3677L2.83496 15.0728C2.94689 14.6497 2.88058 14.1669 2.67773 13.6792C2.30662 12.7868 2.10156 11.8083 2.10156 10.7837C2.10171 6.61695 5.47976 3.23898 9.64648 3.23877ZM15.3389 10.9829C13.5863 10.983 12.1661 12.4041 12.166 14.1567C12.1662 15.9093 13.5864 17.3295 15.3389 17.3296C15.6578 17.3296 15.965 17.2836 16.2539 17.1968C16.6921 17.0651 17.2281 16.9448 17.791 17.0249L18.2598 17.0913L18.1709 16.7964C18.0164 16.2799 18.1103 15.7671 18.2783 15.356C18.4291 14.9868 18.5127 14.5823 18.5127 14.1567C18.5127 12.4041 17.0915 10.9829 15.3389 10.9829Z"
      />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" opacity="0.9">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 1.19287C12.7533 1.19287 13.3567 1.19222 13.8428 1.23193C14.3359 1.27225 14.7639 1.3573 15.1582 1.55811C15.7889 1.87949 16.3027 2.39227 16.624 3.02295C16.825 3.41739 16.9099 3.84601 16.9502 4.33936C16.9899 4.82537 16.9893 5.42804 16.9893 6.18115V13.8179C16.9893 14.571 16.9899 15.1736 16.9502 15.6597C16.9099 16.1529 16.8249 16.5817 16.624 16.9761C16.3026 17.6068 15.7889 18.1195 15.1582 18.4409C14.7639 18.6418 14.3359 18.7268 13.8428 18.7671C13.3567 18.8068 12.7533 18.8062 12 18.8062H8C7.24685 18.8062 6.64423 18.8068 6.1582 18.7671C5.66485 18.7268 5.23624 18.6419 4.8418 18.4409C4.21124 18.1195 3.6983 17.6067 3.37695 16.9761C3.17601 16.5817 3.0911 16.153 3.05078 15.6597C3.0111 15.1736 3.01172 14.571 3.01172 13.8179V6.18115C3.01172 5.42802 3.01108 4.82538 3.05078 4.33936C3.09109 3.84596 3.17598 3.41742 3.37695 3.02295C3.69832 2.39232 4.21117 1.87947 4.8418 1.55811C5.23628 1.35712 5.66479 1.27225 6.1582 1.23193C6.64423 1.19223 7.24685 1.19287 8 1.19287H12ZM8 2.44287C7.22624 2.44287 6.68311 2.44345 6.25977 2.47803C5.8438 2.51203 5.59805 2.57614 5.40918 2.67236C5.01398 2.87385 4.6927 3.19513 4.49121 3.59033C4.395 3.77919 4.33087 4.02498 4.29688 4.44092C4.2623 4.86425 4.26172 5.40742 4.26172 6.18115V13.8179C4.26172 14.5917 4.26229 15.1347 4.29688 15.5581C4.33088 15.9741 4.39497 16.2198 4.49121 16.4087C4.69274 16.804 5.01383 17.1261 5.40918 17.3276C5.59802 17.4238 5.84392 17.487 6.25977 17.521C6.6831 17.5556 7.22626 17.5562 8 17.5562H12C12.7739 17.5562 13.3178 17.5556 13.7412 17.521C14.1567 17.487 14.4021 17.4237 14.5908 17.3276C14.9863 17.1261 15.3082 16.8042 15.5098 16.4087C15.606 16.2198 15.6701 15.9741 15.7041 15.5581C15.7387 15.1347 15.7393 14.5917 15.7393 13.8179V6.18115C15.7393 5.40743 15.7387 4.86425 15.7041 4.44092C15.6701 4.02505 15.6059 3.77918 15.5098 3.59033C15.3082 3.19499 14.9862 2.87386 14.5908 2.67236C14.402 2.57619 14.1569 2.51203 13.7412 2.47803C13.3178 2.44343 12.774 2.44287 12 2.44287H8ZM11.8184 13.9204C12.1634 13.9206 12.4434 14.2004 12.4434 14.5454C12.4431 14.8903 12.1632 15.1702 11.8184 15.1704H8.18164C7.83679 15.1702 7.55688 14.8903 7.55664 14.5454C7.55664 14.2004 7.83665 13.9206 8.18164 13.9204H11.8184Z"
      />
    </svg>
  )
}

function MonitorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" opacity="0.9">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12.4512 17.8975C12.7046 17.8975 12.9385 17.8979 13.125 17.8809C13.305 17.8644 13.5558 17.8242 13.7734 17.6592C14.0466 17.4519 14.216 17.1353 14.2354 16.793C14.2507 16.5205 14.1435 16.2904 14.0566 16.1318C13.9667 15.9676 13.8358 15.7736 13.6943 15.5635L13.4297 15.1699H13.8184C14.5716 15.1699 15.1741 15.1705 15.6602 15.1309C16.1535 15.0905 16.5821 15.0056 16.9766 14.8047C17.6071 14.4834 18.12 13.9703 18.4414 13.3398C18.6423 12.9455 18.7273 12.5166 18.7676 12.0234C18.8073 11.5374 18.8066 10.9338 18.8066 10.1807V7.08984C18.8066 6.33683 18.8073 5.73401 18.7676 5.24805C18.7272 4.75481 18.6423 4.32601 18.4414 3.93164C18.12 3.30118 17.6071 2.78808 16.9766 2.4668C16.5822 2.2659 16.1535 2.18093 15.6602 2.14062C15.1741 2.10094 14.5715 2.10156 13.8184 2.10156H6.18164C5.42844 2.10156 4.82589 2.10092 4.33984 2.14062C3.84649 2.18093 3.41788 2.26586 3.02344 2.4668C2.39293 2.78811 1.87997 3.30117 1.55859 3.93164C1.35765 4.32601 1.27275 4.75481 1.23242 5.24805C1.19272 5.734 1.19336 6.33684 1.19336 7.08984V10.1807C1.19336 10.9338 1.19274 11.5374 1.23242 12.0234C1.27273 12.5167 1.35774 12.9455 1.55859 13.3398C1.87995 13.9704 2.3929 14.4833 3.02344 14.8047C3.41792 15.0057 3.84643 15.0905 4.33984 15.1309C4.82589 15.1706 5.42843 15.1699 6.18164 15.1699H6.57129L6.30664 15.5635C6.16506 15.7738 6.03338 15.9675 5.94336 16.1318C5.85655 16.2904 5.7503 16.5205 5.76562 16.793C5.78503 17.1353 5.95346 17.4519 6.22656 17.6592C6.4442 17.8243 6.69493 17.8644 6.875 17.8809C7.06156 17.8979 7.29531 17.8975 7.54883 17.8975H12.4512ZM6.18164 13.9199C5.40781 13.9199 4.86477 13.9194 4.44141 13.8848C4.02543 13.8508 3.77969 13.7867 3.59082 13.6904C3.19552 13.4889 2.87431 13.1669 2.67285 12.7715C2.57678 12.5827 2.51249 12.3374 2.47852 11.9219C2.44396 11.4985 2.44336 10.9544 2.44336 10.1807V7.08984C2.44336 6.31625 2.44393 5.77289 2.47852 5.34961C2.51253 4.93389 2.57665 4.68783 2.67285 4.49902C2.87435 4.10399 3.19574 3.78248 3.59082 3.58105C3.77967 3.48487 4.02555 3.42071 4.44141 3.38672C4.86476 3.35213 5.40783 3.35156 6.18164 3.35156H13.8184C14.5923 3.35156 15.1352 3.35214 15.5586 3.38672C15.9746 3.42071 16.2203 3.48485 16.4092 3.58105C16.8045 3.78252 17.1266 4.10378 17.3281 4.49902C17.4243 4.68782 17.4875 4.93391 17.5215 5.34961C17.5561 5.77289 17.5566 6.31625 17.5566 7.08984V10.1807C17.5566 10.9544 17.556 11.4985 17.5215 11.9219C17.4875 12.3372 17.4241 12.5827 17.3281 12.7715C17.1266 13.167 16.8046 13.4889 16.4092 13.6904C16.2203 13.7867 15.9747 13.8508 15.5586 13.8848C15.1352 13.9193 14.5923 13.9199 13.8184 13.9199H6.18164ZM7.54883 16.6475C7.34606 16.6475 7.20316 16.6439 7.0957 16.6396C7.15213 16.5482 7.2299 16.4284 7.34277 16.2607L8.07715 15.1699H11.9229L12.6572 16.2607C12.7699 16.4281 12.8469 16.5483 12.9033 16.6396C12.796 16.6439 12.6532 16.6475 12.4512 16.6475H7.54883Z"
      />
    </svg>
  )
}

function WrenchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" opacity="0.9">
      <path d="M17.9355 6.66283C17.9355 9.2027 15.8766 11.2617 13.3367 11.2617C12.9176 11.2617 12.5116 11.2056 12.1258 11.1006C11.976 11.0598 11.6861 10.9566 11.6861 10.9566L7.70437 16.2363C6.6753 17.6008 4.6773 17.7401 3.4688 16.5316C2.26046 15.3233 2.39958 13.3256 3.76373 12.2964L9.04293 8.31344C9.04293 8.31344 8.93968 8.02347 8.89892 7.87373C8.79389 7.48791 8.73782 7.08191 8.73782 6.66283C8.73782 4.12294 10.7968 2.06396 13.3367 2.06396C14.1134 2.06396 14.8451 2.25652 15.4868 2.59651L13.5283 4.55501C12.9992 5.08416 12.9992 5.94206 13.5283 6.4712C14.0574 7.00035 14.9154 7.00035 15.4445 6.4712L17.403 4.5127C17.743 5.15436 17.9355 5.88612 17.9355 6.66283Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ExitFullscreenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13.3975 3C12.9833 3 12.6475 3.3358 12.6475 3.75V7.86765C12.6475 9.52451 13.9906 10.8677 15.6475 10.8677H20.2504C20.6646 10.8677 21.0004 10.5319 21.0004 10.1177C21.0004 9.70343 20.6646 9.36765 20.2504 9.36765H15.6475C14.8191 9.36765 14.1475 8.69607 14.1475 7.86765V3.75C14.1475 3.3358 13.8117 3 13.3975 3Z" fill="black" fillOpacity="0.6" />
      <path d="M8.35295 14.6323C9.18138 14.6323 9.85295 15.3039 9.85295 16.1323V20.25C9.85295 20.6642 10.1887 21 10.603 21C11.0172 21 11.353 20.6642 11.353 20.25V16.1323C11.353 14.4754 10.0098 13.1323 8.35295 13.1323H3.75C3.3358 13.1323 3 13.4681 3 13.8823C3 14.2965 3.3358 14.6323 3.75 14.6323H8.35295Z" fill="black" fillOpacity="0.6" />
    </svg>
  )
}

function FullscreenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10.5596 16.2974L4.9149 16.2974C4.24546 16.2974 3.70278 15.7547 3.70278 15.0852L3.70278 9.44057" stroke="black" strokeOpacity="0.9" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.44043 3.70264L15.0851 3.70264C15.7545 3.70264 16.2972 4.24532 16.2972 4.91476L16.2972 10.5594" stroke="black" strokeOpacity="0.9" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlusIcon() {
  return (
    // 跟 Preview 手机图标一样：#1c1c1e，不透明度 0.9。只换加号路径，颜色仍走这里，不写死新 SVG 的黑
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true" opacity="0.9">
      <path d="M8 1.40039C8.33137 1.40039 8.59961 1.66863 8.59961 2V7.40039H14C14.3314 7.40039 14.5996 7.66863 14.5996 8C14.5996 8.33137 14.3314 8.59961 14 8.59961H8.59961V14C8.59961 14.3314 8.33137 14.5996 8 14.5996C7.66863 14.5996 7.40039 14.3314 7.40039 14V8.59961H2C1.66863 8.59961 1.40039 8.33137 1.40039 8C1.40039 7.66863 1.66863 7.40039 2 7.40039H7.40039V2C7.40039 1.66863 7.66863 1.40039 8 1.40039Z" fill="#1c1c1e" />
    </svg>
  )
}

function MicIcon() {
  return (
    // 只换麦形。描边用 currentColor（圆钮上的白），不填实，避免黑块贴在深色圆上
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" opacity="0.92">
      <rect
        x="5.23633"
        y="1.4541"
        width="5.52727"
        height="8.36364"
        rx="2.76364"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.00005 12.468L8.00003 14.5454M8.00005 12.468C10.3065 12.468 12.293 11.0983 13.1905 9.12793M8.00005 12.468C5.69362 12.468 3.70711 11.0983 2.80957 9.12793"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
