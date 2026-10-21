import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/cn.js'
import { describeElement, pickElement, readRadius } from './pickElement.js'

/** 与悬浮按钮同尺寸，未吸附时选框保持这个大小 */
const BUTTON = 48

const SNAP_TRANSITION =
  'top 180ms cubic-bezier(.2,.8,.2,1), left 180ms cubic-bezier(.2,.8,.2,1), width 180ms cubic-bezier(.2,.8,.2,1), height 180ms cubic-bezier(.2,.8,.2,1), border-radius 180ms cubic-bezier(.2,.8,.2,1)'

const FREE_TRANSITION =
  'top 36ms linear, left 36ms linear, width 150ms cubic-bezier(.2,.8,.2,1), height 150ms cubic-bezier(.2,.8,.2,1), border-radius 150ms cubic-bezier(.2,.8,.2,1)'

function InspectIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M7.38525 5.95898C8.63673 5.47945 10.0404 6.1046 10.521 7.35449L11.4917 9.88184L11.6274 9.83496C12.406 9.56024 13.1831 9.38363 13.9204 9.33594C14.9188 9.27146 15.8951 9.4418 16.6899 9.98535C18.3338 11.1098 18.7775 13.4692 17.9048 16.958C17.8211 17.2927 17.4817 17.4965 17.147 17.4131C16.8123 17.3294 16.6085 16.99 16.6919 16.6553C17.5405 13.263 16.929 11.6641 15.9839 11.0176C15.4893 10.6794 14.8187 10.5303 14.0015 10.583C13.4019 10.6218 12.7385 10.7684 12.0435 11.0137L11.3354 11.2637C11.0165 11.3762 10.666 11.214 10.5444 10.8984L9.35498 7.80371C9.12212 7.19776 8.44022 6.89412 7.83252 7.12695C7.22533 7.36015 6.92327 8.04001 7.15576 8.64551L8.84521 13.0459C8.9228 13.2479 8.89013 13.4761 8.75928 13.6484C8.6283 13.8206 8.41701 13.9132 8.20166 13.8926L6.96045 13.7725V13.7715C6.18509 13.6971 5.55886 14.0457 5.34326 14.4365C5.35168 14.4476 5.36217 14.4601 5.37549 14.4717L8.55615 17.2363C8.81626 17.4625 8.84428 17.8567 8.61865 18.1172C8.39237 18.3776 7.99738 18.4057 7.73682 18.1797L4.55615 15.416C4.2382 15.1397 3.90402 14.5796 4.17725 13.9746L4.2749 13.7842C4.80777 12.8673 5.98979 12.4234 7.08057 12.5283L7.31592 12.5508L5.98877 9.09375C5.50854 7.84311 6.13367 6.43926 7.38525 5.95898ZM5.90869 2.11621C9.26706 0.828171 13.03 2.40034 14.2896 5.67871C14.3176 5.75167 14.3444 5.82558 14.3696 5.89941C14.4811 6.22592 14.3063 6.58164 13.98 6.69336C13.6535 6.80464 13.2986 6.63012 13.187 6.30371C13.167 6.2451 13.1451 6.18575 13.1226 6.12695C12.1257 3.53248 9.11131 2.22686 6.35693 3.2832C3.60253 4.33997 2.23732 7.32596 3.23389 9.9209C3.30451 10.1048 3.38492 10.2818 3.47412 10.4512C3.63485 10.7564 3.51747 11.1349 3.2124 11.2959C2.90708 11.4567 2.5286 11.3394 2.36768 11.0342C2.25537 10.8209 2.15501 10.5985 2.06689 10.3691C0.807584 7.09016 2.55015 3.40503 5.90869 2.11621Z"
        fill="currentColor"
      />
    </svg>
  )
}

function nearly(a, b) {
  return Math.abs(a - b) < 0.4
}

/** 超过这个位移才算拖拽，避免轻点被当成拖 */
const DRAG_DISTANCE = 8

/** 按住超过这个时间才进入单选，轻点不会开麦 */
const PRESS_HOLD = 280

/** 选区序号徽标边长，圆角方块贴在选区角上 */
const BADGE = 26

function elementTitle(el) {
  const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('alt') || '')
    .replace(/\s+/g, ' ')
    .trim()
  const name = text || el.tagName.toLowerCase()
  return name.length > 24 ? `${name.slice(0, 24)}…` : name
}

function radiusPx(radius) {
  const n = parseFloat(radius)
  return Number.isFinite(n) ? n : 0
}

function samePins(a, b) {
  if (a.length !== b.length) return false
  return a.every(
    (pin, i) =>
      pin.n === b[i].n &&
      pin.radius === b[i].radius &&
      nearly(pin.top, b[i].top) &&
      nearly(pin.left, b[i].left) &&
      nearly(pin.width, b[i].width) &&
      nearly(pin.height, b[i].height),
  )
}

/** 序号贴在选区左上角外侧，贴边时收回屏幕内 */
function badgePosition(pin, phoneW, phoneH) {
  let top = pin.top - BADGE + 8
  let left = pin.left - 6
  if (top < 4) top = Math.min(pin.top + 6, Math.max(4, phoneH - BADGE - 4))
  if (left < 4) left = 4
  if (left + BADGE > phoneW - 4) left = Math.max(4, phoneW - BADGE - 4)
  return { top, left }
}

function releasedOnChrome(x, y) {
  const el = document.elementFromPoint(x, y)
  return el instanceof Element && !!el.closest('[data-inspect-chrome]')
}

/**
 * 悬浮按钮 + 点选遮罩。
 * 轻点悬浮按钮进入多选；移动超过阈值或按住约 280ms 进入单选跟手。
 * 多选确认后不退出：遮罩、已选高亮和序号都留着，可继续点下一个。
 * 输入卡片和键盘展开时，点页面只收起键盘，不确认新选区。
 */
export default function ElementPicker({
  phoneRef,
  pageRef,
  regions,
  onSelect,
  onDismiss,
  onSoloStart,
  onSoloTarget,
  onSoloFinish,
  docked,
  editing,
  resetEpoch,
  fabSlotRef,
}) {
  const fabRef = useRef(null)
  const [active, setActive] = useState(false)
  const [solo, setSolo] = useState(false)
  const [box, setBox] = useState(null)

  const [pins, setPins] = useState([]) // 已确认选区的实时矩形
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [fabSlot, setFabSlot] = useState(null)

  // 底部系统栏先挂上插槽，点选按钮再挪进去，和全屏、输入框对齐
  useLayoutEffect(() => {
    setFabSlot(fabSlotRef?.current ?? null)
  }, [fabSlotRef])

  const activeRef = useRef(false)
  const soloRef = useRef(false)
  const lastSoloElRef = useRef(null)
  const pointRef = useRef(null)
  const updateRef = useRef(() => {})
  const rafRef = useRef(0)
  const snappedRef = useRef(null) // 当前吸附到的真实元素
  const dragRef = useRef(null) // 从悬浮按钮按下的手势
  const pagePressRef = useRef(false) // 点选模式里再次按下页面
  const onSelectRef = useRef(onSelect)
  const onDismissRef = useRef(onDismiss)
  const onSoloStartRef = useRef(onSoloStart)
  const onSoloTargetRef = useRef(onSoloTarget)
  const onSoloFinishRef = useRef(onSoloFinish)
  const regionsRef = useRef(regions)
  const editingRef = useRef(editing)
  const syncPinsRef = useRef(() => {})
  onSelectRef.current = onSelect
  onDismissRef.current = onDismiss
  onSoloStartRef.current = onSoloStart
  onSoloTargetRef.current = onSoloTarget
  onSoloFinishRef.current = onSoloFinish
  regionsRef.current = regions
  editingRef.current = editing

  const phoneBox = () => phoneRef.current?.getBoundingClientRect()

  const insideFab = (x, y) => {
    const rect = fabRef.current?.getBoundingClientRect()
    if (!rect) return false
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }

  const freeBox = (x, y) => {
    const phone = phoneBox()
    return {
      top: y - BUTTON / 2 - phone.top,
      left: x - BUTTON / 2 - phone.left,
      width: BUTTON,
      height: BUTTON,
      radius: `${BUTTON / 2}px`,
      label: '',
      snapped: false,
    }
  }

  const snapBox = (el) => {
    const phone = phoneBox()
    const rect = el.getBoundingClientRect()
    return {
      top: rect.top - phone.top,
      left: rect.left - phone.left,
      width: rect.width,
      height: rect.height,
      radius: readRadius(el),
      label: describeElement(el, rect),
      snapped: true,
    }
  }

  // 每帧根据指针位置决定：落在按钮上 / 空白处保持原尺寸，否则吸附元素
  updateRef.current = (x, y) => {
    if ((!activeRef.current && !soloRef.current) || !phoneRef.current || !pageRef.current) return
    const phone = phoneBox()
    const outside =
      x < phone.left || x > phone.right || y < phone.top || y > phone.bottom
    // 松手在手机外不算选中，清掉上一次吸附
    if (outside) {
      snappedRef.current = null
      if (soloRef.current && lastSoloElRef.current) {
        lastSoloElRef.current = null
        onSoloTargetRef.current?.(null)
      }
      return
    }

    let next
    if (insideFab(x, y)) {
      snappedRef.current = null
      next = freeBox(x, y)
      if (soloRef.current && lastSoloElRef.current) {
        lastSoloElRef.current = null
        onSoloTargetRef.current?.(null)
      }
    } else {
      const el = pickElement(x, y, pageRef.current)
      snappedRef.current = el
      next = el ? snapBox(el) : freeBox(x, y)
      if (el) next.pinned = !soloRef.current && regionsRef.current.some((region) => region.el === el)
      if (soloRef.current && lastSoloElRef.current !== el) {
        lastSoloElRef.current = el
        onSoloTargetRef.current?.(
          el ? { el, summary: next.label, text: elementTitle(el) } : null,
        )
      }
    }

    setBox((prev) => {
      if (
        prev &&
        prev.snapped === next.snapped &&
        !!prev.pinned === !!next.pinned &&
        prev.radius === next.radius &&
        prev.label === next.label &&
        nearly(prev.top, next.top) &&
        nearly(prev.left, next.left) &&
        nearly(prev.width, next.width) &&
        nearly(prev.height, next.height)
      ) {
        return prev
      }
      return next
    })
  }

  const enter = (x, y) => {
    activeRef.current = true
    pointRef.current = { x, y }
    snappedRef.current = null
    setActive(true)
    setBox(freeBox(x, y))
  }

  const exit = () => {
    activeRef.current = false
    pointRef.current = null
    snappedRef.current = null
    dragRef.current = null
    pagePressRef.current = false
    setActive(false)
    setBox(null)
  }

  // 多选点发送后父级递增 resetEpoch，退出跟手，遮罩随选区一起消失
  const exitRef = useRef(exit)
  exitRef.current = exit
  useEffect(() => {
    if (!resetEpoch) return
    exitRef.current()
  }, [resetEpoch])

  // 位移或按住达标后才进单选，这时才开听写，避免轻点闪一下麦克风
  const beginSolo = (x, y) => {
    if (!soloRef.current) {
      soloRef.current = true
      lastSoloElRef.current = null
      setSolo(true)
      onSoloStartRef.current?.()
    }
    pointRef.current = { x, y }
    updateRef.current(x, y)
  }

  const endSolo = (keepMulti) => {
    soloRef.current = false
    lastSoloElRef.current = null
    snappedRef.current = null
    pointRef.current = null
    setSolo(false)
    setBox(null)
    if (!keepMulti) {
      activeRef.current = false
      setActive(false)
    }
  }

  // 确认后留在点选里，父级负责把选区留在遮罩上并插入输入框
  const confirm = (el) => {
    if (!el) return
    const rect = el.getBoundingClientRect()
    const summary = describeElement(el, rect)
    const text = elementTitle(el)
    onSelectRef.current?.({ el, summary, text })
  }

  // 已选元素会滚动，序号和高亮跟着元素边界走
  syncPinsRef.current = () => {
    const phone = phoneRef.current
    if (!phone) return
    const origin = phone.getBoundingClientRect()
    const next = []
    for (const region of regionsRef.current) {
      const el = region.el
      if (!el?.isConnected) continue
      const rect = el.getBoundingClientRect()
      next.push({
        n: region.n,
        top: rect.top - origin.top,
        left: rect.left - origin.left,
        width: rect.width,
        height: rect.height,
        radius: readRadius(el),
      })
    }
    setPins((prev) => (samePins(prev, next) ? prev : next))
    setViewport((prev) =>
      prev.width === phone.clientWidth && prev.height === phone.clientHeight
        ? prev
        : { width: phone.clientWidth, height: phone.clientHeight },
    )
  }

  useEffect(() => {
    const schedule = (x, y) => {
      pointRef.current = { x, y }
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0
        const point = pointRef.current
        if (point) updateRef.current(point.x, point.y)
      })
    }

    const onMove = (e) => {
      const drag = dragRef.current
      if (drag && !drag.armed) {
        const dx = e.clientX - drag.x
        const dy = e.clientY - drag.y
        if (dx * dx + dy * dy > DRAG_DISTANCE * DRAG_DISTANCE) {
          drag.moved = true
          drag.armed = true
          if (drag.holdTimer) {
            clearTimeout(drag.holdTimer)
            drag.holdTimer = 0
          }
          beginSolo(e.clientX, e.clientY)
        }
      }
      if (!activeRef.current && !soloRef.current) return
      if (drag && !drag.moved) {
        const dx = e.clientX - drag.x
        const dy = e.clientY - drag.y
        if (dx * dx + dy * dy > DRAG_DISTANCE * DRAG_DISTANCE) drag.moved = true
      }
      schedule(e.clientX, e.clientY)
    }

    // 松开时才确认多选。单选松手交给父级发送，不插入选区序号
    const onUp = (e) => {
      const drag = dragRef.current
      const pagePress = pagePressRef.current
      dragRef.current = null
      pagePressRef.current = false
      if (drag?.holdTimer) clearTimeout(drag.holdTimer)
      if (e.button !== 0 && (drag || pagePress)) return

      if (drag?.armed || soloRef.current) {
        updateRef.current(e.clientX, e.clientY)
        const el = snappedRef.current
        const info = el
          ? { el, summary: describeElement(el, el.getBoundingClientRect()), text: elementTitle(el) }
          : null
        const keepMulti = !!drag?.startedActive && activeRef.current
        endSolo(keepMulti)
        onSoloFinishRef.current?.(info)
        return
      }

      if (drag) {
        // 还没超过位移、也没到按住时间：这是点击
        if (drag.startedActive && !drag.moved && insideFab(e.clientX, e.clientY)) {
          exit()
          return
        }
        if (!drag.startedActive) enter(e.clientX, e.clientY)
        return
      }

      if (!activeRef.current || !pagePress) return
      updateRef.current(e.clientX, e.clientY)
      const el = snappedRef.current
      const onChrome = releasedOnChrome(e.clientX, e.clientY)
      if (!onChrome && !editingRef.current && el) confirm(el)
    }

    const onKey = (e) => {
      // 键盘修改态的 Esc 只收起键盘，不退出点选
      if (e.key !== 'Escape' || !activeRef.current || editingRef.current) return
      e.preventDefault()
      exit()
    }

    const scroller = pageRef.current
    const onScroll = () => {
      syncPinsRef.current()
      const point = pointRef.current
      if (!activeRef.current || !point) return
      schedule(point.x, point.y)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('keydown', onKey)
    scroller?.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', onKey)
      scroller?.removeEventListener('scroll', onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (dragRef.current?.holdTimer) clearTimeout(dragRef.current.holdTimer)
    }
  }, [pageRef])

  useLayoutEffect(() => {
    syncPinsRef.current()
  }, [regions])

  const phoneWidth = viewport.width || phoneRef.current?.clientWidth || 390
  const phoneHeight = viewport.height || phoneRef.current?.clientHeight || 844
  const tracking = active || solo
  const locked = tracking || regions.length > 0
  const holes = []
  for (const pin of pins) {
    holes.push({
      key: `pin-${pin.n}`,
      top: pin.top,
      left: pin.left,
      width: pin.width,
      height: pin.height,
      rx: radiusPx(pin.radius),
    })
  }
  if (tracking && box) {
    holes.push({
      key: 'live',
      top: box.top,
      left: box.left,
      width: box.width,
      height: box.height,
      rx: radiusPx(box.radius),
    })
  }
  const labelBelow = box ? box.top < 34 : false
  // 已有序号时调试标签靠右，避开左上角徽标
  const alignEnd = box ? pins.length > 0 || box.left + 170 > phoneWidth : false

  // 键盘或一行选区输入挡住底栏时，按钮回到手机框里并抬高；平时停在底栏插槽
  const parked = Boolean(fabSlot) && !docked && !editing
  const fabButton = (
    <button
      ref={fabRef}
      type="button"
      data-inspect-ui
      data-inspect-chrome
      aria-pressed={active || solo}
      aria-label={solo ? '单选听写' : active ? '退出点选' : '进入点选'}
      title={solo ? '单选听写' : active ? '退出点选' : '进入点选'}
      style={parked ? { pointerEvents: 'auto' } : { pointerEvents: 'auto', bottom: docked ? 72 : 18 }}
      className={cn(
        'z-40 flex h-12 w-12 touch-none cursor-pointer items-center justify-center rounded-full border-0 bg-white text-black/90 shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-[bottom,transform,box-shadow,color] duration-150',
        parked ? 'relative' : 'absolute right-3.5',
        active || solo
          ? 'text-[#1a8cff] shadow-[0_8px_28px_rgba(26,140,255,0.35)]'
          : 'hover:scale-105 active:scale-95',
      )}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        pagePressRef.current = false
        const gesture = {
          x: e.clientX,
          y: e.clientY,
          moved: false,
          armed: false,
          holdTimer: 0,
          startedActive: activeRef.current,
        }
        // 先只记手势。移动或按住达标才进单选，在那之前松手是点击多选
        gesture.holdTimer = window.setTimeout(() => {
          if (dragRef.current !== gesture || gesture.armed) return
          gesture.armed = true
          beginSolo(gesture.x, gesture.y)
        }, PRESS_HOLD)
        dragRef.current = gesture
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* 个别环境不支持 capture，松手仍由 window pointerup 接管 */
        }
      }}
    >
      <InspectIcon />
    </button>
  )

  return (
    <>
    <div className="pointer-events-none absolute inset-0 z-20" data-inspect-ui>
      {locked && (
        <svg
          data-inspect-ui
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${phoneWidth} ${phoneHeight}`}
          preserveAspectRatio="none"
        >
          <defs>
            {/* 白底保留遮罩，黑色圆角矩形是已选和跟手选框挖出的洞 */}
            <mask
              id="inspect-selection-mask"
              maskUnits="userSpaceOnUse"
              maskContentUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={phoneWidth}
              height={phoneHeight}
            >
              <rect x="0" y="0" width={phoneWidth} height={phoneHeight} fill="white" />
              {holes.map((hole) => (
                <rect
                  key={hole.key}
                  x={hole.left}
                  y={hole.top}
                  width={Math.max(hole.width, 0)}
                  height={Math.max(hole.height, 0)}
                  rx={hole.rx}
                  ry={hole.rx}
                  fill="black"
                />
              ))}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width={phoneWidth}
            height={phoneHeight}
            fill="rgba(18, 20, 24, 0.42)"
            mask="url(#inspect-selection-mask)"
          />
        </svg>
      )}

      {locked && (
        <div
          data-inspect-ui
          className={cn(
            'absolute inset-0',
            active && !editing && !solo ? 'cursor-crosshair touch-none' : 'cursor-default',
          )}
          style={{ pointerEvents: 'auto' }}
          onPointerDown={(e) => {
            if (e.button !== 0) return
            // 展开的输入卡片里，点页面或遮罩只收起键盘，不开始下一次点选
            if (soloRef.current) return
            if (editingRef.current) {
              e.preventDefault()
              pagePressRef.current = false
              onDismissRef.current?.()
              return
            }
            if (!active) return
            // 点选模式里的再次按下：先吸附，松手时再确认
            e.preventDefault()
            pagePressRef.current = true
            pointRef.current = { x: e.clientX, y: e.clientY }
            updateRef.current(e.clientX, e.clientY)
          }}
          onWheel={(e) => {
            const scroller = pageRef.current
            if (!scroller) return
            scroller.scrollTop += e.deltaY
            scroller.scrollLeft += e.deltaX
          }}
        />
      )}

      {pins.map((pin) => (
        <div
          key={`pin-${pin.n}`}
          data-inspect-ui
          className="pointer-events-none absolute"
          style={{
            top: pin.top,
            left: pin.left,
            width: pin.width,
            height: pin.height,
            borderRadius: pin.radius,
            background: 'rgba(80, 176, 255, 0.28)',
            boxShadow: '0 0 0 1.5px rgba(26, 140, 255, 0.95)',
          }}
        />
      ))}

      {(active || solo) && box && (
        <div
          data-inspect-ui
          className="pointer-events-none absolute"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
            borderRadius: box.radius,
            background: 'rgba(80, 176, 255, 0.28)',
            boxShadow: '0 0 0 1.5px rgba(26, 140, 255, 0.95)',
            transition: box.snapped ? SNAP_TRANSITION : FREE_TRANSITION,
            willChange: 'top, left, width, height, border-radius',
          }}
        >
          {box.label && !box.pinned && (
            <span
              data-inspect-ui
              className={cn(
                'absolute whitespace-nowrap rounded-md bg-[#1a8cff] px-2 py-1 text-[11px] font-medium leading-none text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]',
                labelBelow ? 'top-[calc(100%+6px)]' : 'bottom-[calc(100%+6px)]',
                alignEnd ? 'right-0' : 'left-0',
              )}
            >
              {box.label}
            </span>
          )}
        </div>
      )}

      {pins.map((pin) => {
        const pos = badgePosition(pin, phoneWidth, phoneHeight)
        return (
          <span
            key={`badge-${pin.n}`}
            data-inspect-ui
            role="img"
            aria-label={`选区${pin.n}`}
            className="pointer-events-none absolute z-10 flex items-center justify-center bg-[#2f89ff] text-[15px] font-semibold leading-none text-white"
            style={{ top: pos.top, left: pos.left, width: BADGE, height: BADGE, borderRadius: 8 }}
          >
            {pin.n}
          </span>
        )
      })}

    </div>
    {parked ? createPortal(fabButton, fabSlot) : fabButton}
    </>
  )
}
