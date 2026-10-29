import { useEffect, useMemo, useRef, useState } from 'react'
import DeviceFrame from './DeviceFrame.jsx'
import { startDictation } from './dictation.js'
import ElementPicker from './ElementPicker.jsx'
import { LOADING_FADE_MS } from './SelectionLoading.jsx'
import { expandDuration, sideDuration, usePreviewFullscreen } from './previewFullscreen.js'
import SelectionEditor from './SelectionEditor.jsx'
import StudyRoomPage from './StudyRoomPage.jsx'
import { backspace, createDraft, insertTag, insertText, moveCursor, plainCaret, plainText, removeTag } from './selectionDraft.js'
import { appendSoloSpeech, createSoloDraft, formatSoloMessage, replaceSoloTag } from './soloDraft.js'
import { cn } from '../lib/cn.js'
import { useMobileStage } from '../lib/useMobileStage.js'
import { useVisualFrame } from './useVisualFrame.js'

/** 发出后若没点停止，大约 5 秒回到空闲底栏 */
const AGENT_RUN_MS = 5000

/** 发出当时的选区几何。元素留引用，自由形状抄一份页面比例，清草稿后点阵还能跟着走 */
function snapshotSelection(regions) {
  const shapes = []
  for (const region of regions) {
    if (region.free?.length) {
      shapes.push({
        el: null,
        free: region.free.map((point) => ({ x: point.x, y: point.y })),
      })
      continue
    }
    if (region.el) shapes.push({ el: region.el, free: null })
  }
  return shapes
}

/** 移动端点选编辑实验台：手机框里放预约页，右下角进入检查元素 */
export default function InspectLab() {
  const phoneRef = useRef(null)
  const pageRef = useRef(null)
  const fabSlotRef = useRef(null)
  const [regions, setRegions] = useState([])
  const [draft, setDraft] = useState(() => createDraft())
  const [editing, setEditing] = useState(false)
  const [soloDraft, setSoloDraft] = useState(null)
  const [lastSent, setLastSent] = useState('')
  const [resetEpoch, setResetEpoch] = useState(0)
  const [running, setRunning] = useState(false)
  const [picking, setPicking] = useState(false)
  const [armedN, setArmedN] = useState(null)
  const runTimerRef = useRef(0)
  const runSeqRef = useRef(0)
  const { phase, entering, fullscreen, toggle, syncInput } = usePreviewFullscreen()
  // 窄屏或粗指针放不下说明时，整台手机铺满视口。不调用全屏 toggle，phase 仍由产品按钮决定
  const mobileStage = useMobileStage()
  // 窄屏壳子跟可视区，而不是 100vh 的 layout 视口
  const visualFrame = useVisualFrame(mobileStage)
  // 全屏输入框只跟正在点选走：多选（picking）或单选听写（soloDraft）。
  // 退出点选后即使选区还在，以及 running 为真，都不 syncInput(true)。
  // 非全屏 phase 是 off，syncInput 不会改显示，底栏输入框始终在。
  const showBar = picking || !!soloDraft
  const selectMode = soloDraft ? 'solo' : picking ? 'multi' : null

  useEffect(() => {
    syncInput(showBar)
  }, [showBar, syncInput])

  useEffect(() => () => window.clearTimeout(runTimerRef.current), [])

  // 正在跑的一条占着计时器。后面发出的内容只排队，等当前这条结束再接着跑。
  // 每条带上发出时的选区，点阵只活到这一轮结束，不跟后面新录入一起拆掉
  const [runQueue, setRunQueue] = useState([])
  const runQueueRef = useRef([])

  const beginHead = () => {
    const queue = runQueueRef.current
    if (!queue.length) {
      setRunning(false)
      return
    }
    const startedAt = performance.now()
    const head = { ...queue[0], startedAt }
    const next = [head, ...queue.slice(1)]
    runQueueRef.current = next
    setRunQueue(next)
    setLastSent(head.message)
    setRunning(true)
    // 进度走完后再留 50ms，遮罩淡出才卸载。停止仍是立刻清掉
    runTimerRef.current = window.setTimeout(settleHead, AGENT_RUN_MS + LOADING_FADE_MS)
  }

  const settleHead = () => {
    runTimerRef.current = 0
    const rest = runQueueRef.current.slice(1)
    runQueueRef.current = rest
    setRunQueue(rest)
    if (!rest.length) {
      setRunning(false)
      return
    }
    beginHead()
  }

  const enqueueRun = (message, shapes = []) => {
    if (!message) return
    const id = ++runSeqRef.current
    const item = {
      id,
      message,
      startedAt: 0,
      shapes: shapes.map((shape, index) => ({
        key: `${id}-${index}`,
        el: shape.el || null,
        free: shape.free?.length ? shape.free.map((point) => ({ x: point.x, y: point.y })) : null,
      })),
    }
    const next = [...runQueueRef.current, item]
    runQueueRef.current = next
    // 已经有一条在跑就不要清掉它的计时，新内容留在后面
    if (runTimerRef.current) {
      setRunQueue(next)
      return
    }
    beginHead()
  }

  // 点等候序号删掉这一个选框。正在跑的那一轮没有 tag，这里也不动它的计时
  // 同一轮还剩别的选框就留着，序号不变。删光才整轮移出，后面按新位置再减 1
  const removeQueuedShape = (key) => {
    if (!key) return
    const next = []
    let changed = false
    for (const run of runQueueRef.current) {
      if (run.startedAt) {
        next.push(run)
        continue
      }
      const shapes = run.shapes.filter((shape) => shape.key !== key)
      if (shapes.length === run.shapes.length) {
        next.push(run)
        continue
      }
      changed = true
      if (shapes.length) next.push({ ...run, shapes })
    }
    if (!changed) return
    runQueueRef.current = next
    setRunQueue(next)
  }

  const stopRunning = () => {
    window.clearTimeout(runTimerRef.current)
    runTimerRef.current = 0
    runQueueRef.current = []
    setRunQueue([])
    setRunning(false)
  }

  // 事件回调里读最新值，避免塞进 setState 更新函数里做副作用
  const regionsRef = useRef(regions)
  const draftRef = useRef(draft)
  const soloRef = useRef(null)
  const stopSoloRef = useRef(null)
  const armedRef = useRef(null)
  const pickingRef = useRef(false)
  const exitSelectRef = useRef(null)
  regionsRef.current = regions
  draftRef.current = draft
  armedRef.current = armedN
  pickingRef.current = picking

  const addSelection = (info) => {
    // 自由选区没有元素，不能按 el 去重，否则后面的圈选会被丢掉
    if (info.el && regionsRef.current.some((region) => region.el === info.el)) return
    const n = regionsRef.current.reduce((max, region) => Math.max(max, region.n), 0) + 1
    const nextRegions = [
      ...regionsRef.current,
      {
        n,
        el: info.el || null,
        summary: info.summary,
        text: info.text,
        ...(info.free ? { free: info.free } : null),
      },
    ]
    const nextDraft = insertTag(draftRef.current, { n, summary: info.summary })
    regionsRef.current = nextRegions
    draftRef.current = nextDraft
    setRegions(nextRegions)
    setDraft(nextDraft)
  }

  const onInsert = (text) => {
    const next = insertText(draftRef.current, text)
    draftRef.current = next
    setDraft(next)
  }

  const onMove = (delta) => {
    const next = moveCursor(draftRef.current, delta)
    draftRef.current = next
    setDraft(next)
  }

  const onBackspace = () => {
    const { draft: next, removed } = backspace(draftRef.current)
    if (removed != null) {
      const nextRegions = regionsRef.current.filter((region) => region.n !== removed)
      regionsRef.current = nextRegions
      setRegions(nextRegions)
      if (armedRef.current === removed) {
        armedRef.current = null
        setArmedN(null)
      }
      if (nextRegions.length === 0) {
        const empty = createDraft()
        draftRef.current = empty
        setDraft(empty)
        setEditing(false)
        return
      }
    }
    draftRef.current = next
    setDraft(next)
  }

  const stopSoloDictation = () => {
    stopSoloRef.current?.()
    stopSoloRef.current = null
  }

  // 删掉一个多选，后面的序号跟着往前补
  const removeSelection = (n) => {
    const nextRegions = regionsRef.current
      .filter((region) => region.n !== n)
      .map((region) => (region.n > n ? { ...region, n: region.n - 1 } : region))
    const nextDraft = removeTag(draftRef.current, n)
    regionsRef.current = nextRegions
    draftRef.current = nextDraft
    setRegions(nextRegions)
    setDraft(nextDraft)
    const armed = armedRef.current
    const nextArmed = armed == null ? null : armed === n ? null : armed > n ? armed - 1 : armed
    armedRef.current = nextArmed
    setArmedN(nextArmed)
  }

  // 多选里点一次标签进入删除态，再点一次才真正删
  const onTagPress = (n) => {
    if (soloRef.current || !pickingRef.current) return
    if (armedRef.current === n) {
      removeSelection(n)
      return
    }
    armedRef.current = n
    setArmedN(n)
  }

  // 放弃已插入的选区并退出。不发送，单选也不走松开发送
  const discardSelections = () => {
    stopSoloDictation()
    soloRef.current = null
    setSoloDraft(null)
    const empty = createDraft()
    regionsRef.current = []
    draftRef.current = empty
    setRegions([])
    setDraft(empty)
    setEditing(false)
    armedRef.current = null
    setArmedN(null)
    exitSelectRef.current?.()
  }

  // 单选用临时草稿，不改多选的 regions / draft
  const onSoloStart = () => {
    stopSoloDictation()
    const next = createSoloDraft()
    soloRef.current = next
    setSoloDraft(next)
    setEditing(false)
    stopSoloRef.current = startDictation((chunk) => {
      const cur = soloRef.current
      if (!cur) return
      const updated = appendSoloSpeech(cur, chunk)
      soloRef.current = updated
      setSoloDraft(updated)
    })
  }

  const onSoloTarget = (info) => {
    const cur = soloRef.current
    if (!cur) return
    const tag = info ? { text: info.text, summary: info.summary } : null
    if ((cur.tag?.text || '') === (tag?.text || '') && (cur.tag?.summary || '') === (tag?.summary || '')) return
    const updated = replaceSoloTag(cur, tag)
    soloRef.current = updated
    setSoloDraft(updated)
  }

  const onSoloFinish = (info) => {
    stopSoloDictation()
    const cur = soloRef.current
    const tag = info ? { text: info.text, summary: info.summary } : null
    const message = formatSoloMessage(tag, cur?.speech || '')
    soloRef.current = null
    setSoloDraft(null)
    const shapes = info?.el ? [{ el: info.el, free: null }] : []
    if (message) enqueueRun(message, shapes)
  }

  // 多选发送：记下这条消息，选区、键盘和跟手都回到进入点选前；有内容才进入进行中
  const onSend = () => {
    const message = plainText(draftRef.current.segments).trim()
    const shapes = snapshotSelection(regionsRef.current)
    if (message) enqueueRun(message, shapes)
    const empty = createDraft()
    regionsRef.current = []
    draftRef.current = empty
    setRegions([])
    setDraft(empty)
    setEditing(false)
    setResetEpoch((n) => n + 1)
  }

  // 队列里每一轮的选区都留着，进度从该轮真正开始跑才走
  // 序号是当前队列位置（从 1 开始）再减 1。正在跑的是第 1 项，减完是 0，那边不画序号
  // 紧挨着的下一轮显示 1。同一轮的每个选区共用。队头移出后按剩下的位置再减 1
  const loadingShapes = useMemo(
    () =>
      runQueue.flatMap((run, roundIndex) =>
        run.shapes.map((shape) => ({
          key: shape.key,
          n: roundIndex + 1 - 1,
          el: shape.el,
          free: shape.free,
          startedAt: run.startedAt,
        })),
      ),
    [runQueue],
  )

  const onRestore = (next) => {
    const restored = {
      segments: next.segments.map((seg) => ({ ...seg })),
      cursor: { ...next.cursor },
    }
    draftRef.current = restored
    setDraft(restored)
  }

  return (
    <div
      className={cn(
        'flex min-h-0 items-center justify-center gap-10 px-5 py-4',
        // 窄屏用动态视口高度，避免 100vh 把整页撑到地址栏下面
        mobileStage ? 'h-dvh overflow-hidden' : 'h-full',
      )}
    >
      <div
        ref={phoneRef}
        data-fs-phase={phase}
        data-fs-entering={entering ? '1' : '0'}
        className={cn(
          'shrink-0 overflow-hidden bg-[#e8e9eb]',
          // 移动端不要和 relative 同时写：Tailwind 里后出现的 position 会盖住 fixed
          // 不用 inset-0：那跟着 layout 视口。高用 100dvh 兜底，再写 visualViewport 的顶和尺寸
          // 只去掉浮在深色页面上的圆角阴影和 390 居中，壳内仍是普通布局
          mobileStage
            ? 'fixed z-10 h-dvh rounded-none shadow-none'
            : 'relative h-[min(844px,100%)] w-[390px] max-w-full rounded-[40px] shadow-[0_24px_70px_rgba(0,0,0,0.45)]',
        )}
        style={
          mobileStage
            ? {
                top: visualFrame.top,
                left: visualFrame.left,
                width: visualFrame.width,
                height: visualFrame.height,
              }
            : undefined
        }
      >
        <div
          className="h-full"
          style={{
            paddingTop: fullscreen ? 0 : 112,
            paddingRight: fullscreen ? 0 : 24,
            paddingBottom: fullscreen ? 0 : 86,
            paddingLeft: fullscreen ? 0 : 24,
            transition: `padding ${expandDuration(entering)}`,
          }}
        >
          <div
            ref={pageRef}
            className="h-full overflow-y-auto overscroll-contain bg-white shadow-[0_8px_28px_rgba(0,0,0,0.08)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
              borderRadius: fullscreen ? 0 : 28,
              transition: `border-radius ${expandDuration(entering)}`,
            }}
          >
            <StudyRoomPage showStatusBar={false} />
          </div>
        </div>
        {/* 草稿在系统框单行输入里，点选按钮留在底栏，不再被另一条白条顶起 */}
        <ElementPicker
          phoneRef={phoneRef}
          pageRef={pageRef}
          regions={regions}
          onSelect={addSelection}
          editing={editing}
          onDismiss={() => setEditing(false)}
          onSoloStart={onSoloStart}
          onSoloTarget={onSoloTarget}
          onSoloFinish={onSoloFinish}
          resetEpoch={resetEpoch}
          fabSlotRef={fabSlotRef}
          docked={false}
          running={running}
          loadingShapes={loadingShapes}
          runMs={AGENT_RUN_MS}
          edgeDock={phase === 'dock'}
          sideMotion={sideDuration(phase)}
          onPickingChange={setPicking}
          onDiscard={discardSelections}
          deletingN={selectMode === 'multi' ? armedN : null}
          onDeleteSelection={() => {
            if (armedRef.current != null) removeSelection(armedRef.current)
          }}
          onBadgePress={selectMode === 'multi' ? onTagPress : undefined}
          onRemoveQueuedShape={removeQueuedShape}
          exitSelectRef={exitSelectRef}
        />
        <DeviceFrame
          fabSlotRef={fabSlotRef}
          text={plainText(draft.segments)}
          caret={plainCaret(draft.segments, draft.cursor)}
          segments={draft.segments}
          cursor={draft.cursor}
          running={running}
          onActivate={() => {
            // 空胶囊短按也进入键盘，不要求已经有选区
            setEditing(true)
          }}
          onStop={stopRunning}
          onInsert={onInsert}
          onSend={onSend}
          fsPhase={phase}
          fsEntering={entering}
          onToggleFullscreen={toggle}
          barHoldEnabled={!editing && !picking && !soloDraft}
          selectMode={selectMode}
          onExitSelect={discardSelections}
          armedN={selectMode === 'multi' ? armedN : null}
          solo={
            soloDraft
              ? {
                  prefix: plainText(draft.segments),
                  segments: draft.segments,
                  label: soloDraft.tag?.text || '',
                  summary: soloDraft.tag?.summary || '',
                  speech: soloDraft.speech || '',
                }
              : null
          }
        />
        <p
          className="pointer-events-none sr-only"
          data-inspect-ui
          data-last-sent={lastSent}
          data-run-pending={Math.max(0, runQueue.length - (running ? 1 : 0))}
        >
          {lastSent}
        </p>
        {!soloDraft && editing ? (
          <SelectionEditor
            expanded
            segments={draft.segments}
            cursor={draft.cursor}
            onActivate={() => setEditing(true)}
            onCollapse={() => setEditing(false)}
            onInsert={onInsert}
            onBackspace={onBackspace}
            onMove={onMove}
            onRestore={onRestore}
            onSend={onSend}
            armedN={selectMode === 'multi' ? armedN : null}
            onTagPress={selectMode === 'multi' ? onTagPress : undefined}
          />
        ) : null}
      </div>
    </div>
  )
}
