import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.18164 10.9089C2.18164 11.5853 2.18164 11.9234 2.25598 12.2009C2.45773 12.9538 3.04583 13.5419 3.79876 13.7437C4.07622 13.818 4.41439 13.818 5.09073 13.818M10.9089 2.18164C11.5853 2.18164 11.9234 2.18164 12.2009 2.25598C12.9538 2.45773 13.5419 3.04583 13.7437 3.79876C13.818 4.07622 13.818 4.41439 13.818 5.09073M5.09073 2.18164C4.41439 2.18164 4.07622 2.18164 3.79876 2.25598C3.04583 2.45773 2.45773 3.04583 2.25598 3.79876C2.18164 4.07622 2.18164 4.41439 2.18164 5.09073"
        stroke="currentColor"
        strokeOpacity="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.1681 12.1713L13.1641 11.6773C13.9525 11.2862 14.3468 11.0906 14.3294 10.802C14.312 10.5134 13.8972 10.3665 13.0675 10.0728L10.1511 9.04029C9.40323 8.77555 9.02933 8.64318 8.83466 8.83784C8.64 9.03251 8.77237 9.40642 9.03711 10.1542L10.0696 13.0707C10.3633 13.9004 10.5102 14.3152 10.7988 14.3326C11.0874 14.35 11.283 13.9557 11.6741 13.1672L12.1681 12.1713Z"
        stroke="currentColor"
        strokeOpacity="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
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
}) {
  const fabRef = useRef(null)
  const [active, setActive] = useState(false)
  const [solo, setSolo] = useState(false)
  const [box, setBox] = useState(null)

  const [pins, setPins] = useState([]) // 已确认选区的实时矩形
  const [viewport, setViewport] = useState({ width: 0, height: 0 })

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

  return (
    <div className="pointer-events-none absolute inset-0 z-30" data-inspect-ui>
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

      <button
        ref={fabRef}
        type="button"
        data-inspect-ui
        data-inspect-chrome
        aria-pressed={active || solo}
        aria-label={solo ? '单选听写' : active ? '退出点选' : '进入点选'}
        title={solo ? '单选听写' : active ? '退出点选' : '进入点选'}
        style={{ pointerEvents: 'auto', bottom: docked ? 72 : 18 }}
        className={cn(
          'absolute right-3.5 z-40 flex h-12 w-12 touch-none cursor-pointer items-center justify-center rounded-full border-0 bg-white text-black/90 shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-[bottom,transform,box-shadow,color] duration-150',
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
    </div>
  )
}
