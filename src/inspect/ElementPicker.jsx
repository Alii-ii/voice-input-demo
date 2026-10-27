import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { cn } from '../lib/cn.js'
import { createBarHold, markBarHold } from './barHold.js'
import { INSPECT_GLASS_CLASS } from './glassChrome.js'
import { describeElement, pickElement, readRadius } from './pickElement.js'
import { FS_DOCK_MS, FS_EDGE_NUDGE, FS_ENTER_MS, FS_TWO_FINGER_MS } from './previewFullscreen.js'
import { pointOnInspectChrome, resolveTwoFingerPoint } from './twoFingerPick.js'
import { viewportPoint } from './viewportPoint.js'

/** 与悬浮按钮同尺寸，未吸附时选框保持这个大小 */
const BUTTON = 48

/** 跟手框和已选框的虚线。线宽 0.5，和遮罩洞共用同一组坐标 */
const FRAME_STROKE = 'rgba(26, 140, 255, 0.95)'
const FRAME_DASH = '3 2'
function DiscardIcon() {
  return (
    // 多选放弃。只画这一条 path，不用 clipPath，避免 id 和别的图标撞上
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M15.5999 3.51655C15.7171 3.39934 15.8761 3.3335 16.0418 3.3335C16.387 3.3335 16.6668 3.61332 16.6668 3.9585C16.6668 4.12425 16.601 4.28323 16.4837 4.40057L10.884 10.0002L16.4838 15.5999C16.601 15.7171 16.6668 15.8761 16.6668 16.0418C16.6668 16.387 16.387 16.6668 16.0418 16.6668C15.8761 16.6668 15.7171 16.601 15.5999 16.4838L10.0002 10.884L4.40044 16.4838C4.28323 16.601 4.12425 16.6668 3.9585 16.6668C3.61332 16.6668 3.3335 16.387 3.3335 16.0418C3.3335 15.8761 3.39935 15.7171 3.51655 15.5999L3.51708 15.5994L9.11629 10.0002L3.51655 4.40044C3.39934 4.28323 3.3335 4.12425 3.3335 3.9585C3.3335 3.61332 3.61332 3.3335 3.9585 3.3335C4.12425 3.3335 4.28323 3.39934 4.40057 3.51668L10.0002 9.11629L15.5999 3.51655Z"
        fill="black"
        fillOpacity="0.6"
      />
    </svg>
  )
}

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

function sameBox(prev, next) {
  return (
    !!prev &&
    prev.snapped === next.snapped &&
    !!prev.pinned === !!next.pinned &&
    prev.radius === next.radius &&
    prev.label === next.label &&
    nearly(prev.top, next.top) &&
    nearly(prev.left, next.left) &&
    nearly(prev.width, next.width) &&
    nearly(prev.height, next.height)
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
 * 两指都在手机框内，连线中点落在页面上按住 200ms 也进入多选，全屏与否都一样。
 * 底部输入框按住同样约 280ms：滑进页面走单选，没选中元素则只听写。
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
  running = false,
  edgeDock = false,
  sideMotion = '150ms cubic-bezier(0, 0, 0.2, 1)',
  onPickingChange,
  onDiscard,
  deletingN = null,
  onBadgePress,
  exitSelectRef,
}) {
  const fabRef = useRef(null)
  const overlayRef = useRef(null) // 遮罩容器，蓝框和挖洞都相对它定位
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
  const trackFramesRef = useRef(() => {})
  const runningRef = useRef(false)
  const pickingRef = useRef(false)
  const onPickingChangeRef = useRef(onPickingChange)
  const fingersRef = useRef(new Map())
  const twoTimerRef = useRef(0)
  const twoGenRef = useRef(0)
  const guardIdsRef = useRef(new Set())
  const blockClickRef = useRef(false)
  const blockClickTimerRef = useRef(0)
  const enterRef = useRef(() => {})
  runningRef.current = running
  onPickingChangeRef.current = onPickingChange
  onSelectRef.current = onSelect
  onDismissRef.current = onDismiss
  onSoloStartRef.current = onSoloStart
  onSoloTargetRef.current = onSoloTarget
  onSoloFinishRef.current = onSoloFinish
  const onDiscardRef = useRef(onDiscard)
  onDiscardRef.current = onDiscard
  regionsRef.current = regions
  editingRef.current = editing

  const phoneBox = () => phoneRef.current?.getBoundingClientRect()

  // 遮罩 SVG 铺在这个容器上。用它的视口矩形做原点，滚动和预览卡片内边距都已经含在 getBoundingClientRect 里
  const maskOrigin = () =>
    overlayRef.current?.getBoundingClientRect() || phoneRef.current?.getBoundingClientRect()

  const insideFab = (x, y) => {
    const rect = fabRef.current?.getBoundingClientRect()
    if (!rect) return false
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }

  const freeBox = (x, y) => {
    const origin = maskOrigin()
    return {
      top: y - BUTTON / 2 - origin.top,
      left: x - BUTTON / 2 - origin.left,
      width: BUTTON,
      height: BUTTON,
      radius: `${BUTTON / 2}px`,
      label: '',
      snapped: false,
    }
  }

  const snapBox = (el) => {
    const origin = maskOrigin()
    const rect = el.getBoundingClientRect()
    return {
      top: rect.top - origin.top,
      left: rect.left - origin.left,
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
    const pageRect = pageRef.current.getBoundingClientRect()
    const onPage =
      x >= pageRect.left && x <= pageRect.right && y >= pageRect.top && y <= pageRect.bottom
    // 系统按钮（含底部输入框）不透传命中，避免把按钮底下的页面元素当成选中
    // 手指已经滑进预览页时，不要再把命中当成系统按钮，否则框会停在输入框外面
    if (!onPage && (insideFab(x, y) || pointOnInspectChrome(x, y))) {
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

    setBox((prev) => (sameBox(prev, next) ? prev : next))
  }

  // 多选或单选听写都算选中态，父级据此把全屏里藏起的输入框收回来
  const notifyPicking = (next) => {
    const on = !!next
    if (pickingRef.current === on) return
    pickingRef.current = on
    onPickingChangeRef.current?.(on)
  }

  const enter = (x, y) => {
    activeRef.current = true
    pointRef.current = { x, y }
    snappedRef.current = null
    setActive(true)
    setBox(freeBox(x, y))
    notifyPicking(true)
  }
  enterRef.current = enter

  const exit = () => {
    activeRef.current = false
    pointRef.current = null
    snappedRef.current = null
    dragRef.current = null
    pagePressRef.current = false
    setActive(false)
    setBox(null)
    notifyPicking(soloRef.current)
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
      notifyPicking(true)
      onSoloStartRef.current?.()
    }
    // 跟手时别让浏览器把移动当成页面滚动，否则 pointercancel 之后框就停住
    document.documentElement.style.touchAction = 'none'
    pointRef.current = { x, y }
    updateRef.current(x, y)
  }

  const endSolo = (keepMulti) => {
    document.documentElement.style.touchAction = ''
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
    notifyPicking(keepMulti && activeRef.current)
  }

  // 顶部返回和右下角叉都走这里：退出多选，或取消单选且不发送
  if (exitSelectRef) {
    exitSelectRef.current = () => {
      if (soloRef.current) endSolo(false)
      else exit()
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

  // 已选元素会滚动，序号和高亮跟着元素边界走。视口用遮罩容器的边框盒，和 SVG 像素一一对应
  syncPinsRef.current = () => {
    const phone = phoneRef.current
    const frame = overlayRef.current || phone
    if (!phone || !frame) return
    const origin = frame.getBoundingClientRect()
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
      Math.abs(prev.width - origin.width) < 0.5 && Math.abs(prev.height - origin.height) < 0.5
        ? prev
        : { width: origin.width, height: origin.height },
    )
  }

  // 跟手框如果还吸附在元素上，和已选框一样按元素当前边界重算，不用切换前的矩形
  trackFramesRef.current = () => {
    syncPinsRef.current()
    const el = snappedRef.current
    if ((!activeRef.current && !soloRef.current) || !el?.isConnected) return
    if (!overlayRef.current && !phoneRef.current) return
    const next = snapBox(el)
    next.pinned = !soloRef.current && regionsRef.current.some((region) => region.el === el)
    setBox((prev) => (sameBox(prev, next) ? prev : next))
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

    const phoneHit = (x, y) => {
      const phone = phoneRef.current?.getBoundingClientRect()
      if (!phone) return false
      return x >= phone.left && x <= phone.right && y >= phone.top && y <= phone.bottom
    }

    const pageHit = (x, y) => {
      const page = pageRef.current?.getBoundingClientRect()
      if (!page) return false
      return x >= page.left && x <= page.right && y >= page.top && y <= page.bottom
    }

    const twoFingerPoint = () =>
      resolveTwoFingerPoint([...fingersRef.current.values()], {
        inPhone: phoneHit,
        inPage: pageHit,
        onChrome: pointOnInspectChrome,
      })

    const clearTwoTimer = () => {
      twoGenRef.current += 1
      if (twoTimerRef.current) {
        window.clearTimeout(twoTimerRef.current)
        twoTimerRef.current = 0
      }
    }

    const canBarHold = () =>
      !runningRef.current && !editingRef.current && !activeRef.current && !soloRef.current

    // 输入框长按跟右侧按钮同一档。成立后走单选听写；没滑到元素就只有语音
    const barHold = createBarHold({
      holdMs: PRESS_HOLD,
      allowed: canBarHold,
      onArm: (pointerId, x, y) => {
        const el = markBarHold(true)
        blockClickRef.current = true
        // 捕获留在输入框上时，手指滑出输入框就收不到 move。改挂到根节点
        try {
          document.documentElement.setPointerCapture(pointerId)
        } catch {
          /* 个别环境不支持 capture，松手仍由 window pointerup 接管 */
        }
        if (el) el.blur()
        beginSolo(x, y)
      },
    })

    // 恰好两指都在手机框内，中点落在页面且不是系统按钮，按住满 200ms 才进入多选
    const scheduleTwoFinger = () => {
      const point = twoFingerPoint()
      // 提前松手、变成一指、中点离开页面或压到系统按钮，都取消这 200ms
      if (activeRef.current || soloRef.current || !point) {
        clearTwoTimer()
        return
      }
      if (twoTimerRef.current) return
      const gen = twoGenRef.current
      twoTimerRef.current = window.setTimeout(() => {
        twoTimerRef.current = 0
        if (gen !== twoGenRef.current) return
        if (activeRef.current || soloRef.current) return
        const next = twoFingerPoint()
        const ids = [...fingersRef.current.keys()]
        if (!next || ids.length !== 2) return
        guardIdsRef.current = new Set(ids)
        blockClickRef.current = true
        window.clearTimeout(blockClickTimerRef.current)
        // 这两根手指不再走按钮长按，也不再从输入框另开听写
        if (dragRef.current?.holdTimer) clearTimeout(dragRef.current.holdTimer)
        dragRef.current = null
        barHold.cancel()
        // 先标上，这两根手指的 pointerup 不要再被输入框当成短按
        markBarHold(true)
        enterRef.current(next.x, next.y)
      }, FS_TWO_FINGER_MS)
    }

    const onFingerDown = (e) => {
      if (e.button !== 0) return
      const p = viewportPoint(e.clientX, e.clientY)
      if (!phoneHit(p.x, p.y)) return
      fingersRef.current.set(e.pointerId, {
        x: p.x,
        y: p.y,
      })
      scheduleTwoFinger()
      // 不 preventDefault，短按仍能聚焦输入框、继续拼音
      if (e.target instanceof Element && e.target.closest('[data-inspect-ime="bar"]')) {
        barHold.down(e.pointerId, p.x, p.y)
      }
    }

    // 返回 true 表示这根手指属于已经触发的双指手势，松开时不要再点一次
    const releaseFinger = (e) => {
      const tracked = fingersRef.current.has(e.pointerId)
      fingersRef.current.delete(e.pointerId)
      const guarded = guardIdsRef.current.has(e.pointerId)
      if (guarded) guardIdsRef.current.delete(e.pointerId)
      if (!tracked && !guarded) return false
      if (guarded && guardIdsRef.current.size === 0) {
        window.clearTimeout(blockClickTimerRef.current)
        blockClickTimerRef.current = window.setTimeout(() => {
          blockClickRef.current = false
        }, 80)
      }
      if (!guarded) scheduleTwoFinger()
      return guarded
    }

    const onMove = (e) => {
      // 单选已经成立才拦住滚动；成立前不 preventDefault，短按仍能聚焦
      if ((soloRef.current || activeRef.current) && e.cancelable) e.preventDefault()
      const p = viewportPoint(e.clientX, e.clientY)
      const finger = fingersRef.current.get(e.pointerId)
      if (finger) {
        finger.x = p.x
        finger.y = p.y
        // 还没成立时中点跟着走，离开页面或按钮就取消这 200ms
        barHold.move(e.pointerId, p.x, p.y)
        if (guardIdsRef.current.has(e.pointerId)) return
        scheduleTwoFinger()
      }
      const drag = dragRef.current
      if (drag && !drag.armed) {
        const dx = p.x - drag.x
        const dy = p.y - drag.y
        if (dx * dx + dy * dy > DRAG_DISTANCE * DRAG_DISTANCE) {
          drag.moved = true
          drag.armed = true
          if (drag.holdTimer) {
            clearTimeout(drag.holdTimer)
            drag.holdTimer = 0
          }
          beginSolo(p.x, p.y)
        }
      }
      if (!activeRef.current && !soloRef.current) return
      if (drag && !drag.moved) {
        const dx = p.x - drag.x
        const dy = p.y - drag.y
        if (dx * dx + dy * dy > DRAG_DISTANCE * DRAG_DISTANCE) drag.moved = true
      }
      schedule(p.x, p.y)
    }

    // 松开时才确认多选。单选松手交给父级发送，不插入选区序号
    const onUp = (e) => {
      const p = viewportPoint(e.clientX, e.clientY)
      const guarded = releaseFinger(e)
      const barResult = barHold.up(e.pointerId)
      if (barResult !== 'none') markBarHold(false)
      if (guarded) {
        // 双指长按已经进入多选，这次松开不再确认元素，也不当成按钮点击
        pagePressRef.current = false
        // 最后一根手指的 pointerup 已经过了输入框，这时再清掉短按抑制
        if (guardIdsRef.current.size === 0) markBarHold(false)
        return
      }
      if (barResult === 'armed') {
        // 点击发生在 pointerup 之后，挡住它，避免听写输入框被再次聚焦
        window.clearTimeout(blockClickTimerRef.current)
        blockClickTimerRef.current = window.setTimeout(() => {
          blockClickRef.current = false
        }, 80)
      }
      const drag = dragRef.current
      const pagePress = pagePressRef.current
      dragRef.current = null
      pagePressRef.current = false
      if (drag?.holdTimer) clearTimeout(drag.holdTimer)
      if (e.button !== 0 && (drag || pagePress)) return

      if (drag?.armed || soloRef.current) {
        updateRef.current(p.x, p.y)
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
        if (drag.startedActive && !drag.moved && insideFab(p.x, p.y)) {
          // 再点一次是放弃：清掉已经插入的选区再退出，不要只退出而把选区留下
          onDiscardRef.current?.()
          return
        }
        if (!drag.startedActive) enter(p.x, p.y)
        return
      }

      if (!activeRef.current || !pagePress) return
      updateRef.current(p.x, p.y)
      const el = snappedRef.current
      const onChrome = releasedOnChrome(p.x, p.y)
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

    const onCancel = (e) => {
      releaseFinger(e)
      if (barHold.up(e.pointerId) !== 'none') markBarHold(false)
    }

    const onClickCapture = (e) => {
      if (!blockClickRef.current) return
      e.preventDefault()
      e.stopPropagation()
    }

    // 输入框上的指针捕获在真机上经常丢 move，捕获阶段和 touchmove 再接一次
    const onTouchMove = (e) => {
      if (!soloRef.current && !activeRef.current) return
      if (e.cancelable) e.preventDefault()
      const t = e.touches[0]
      if (!t) return
      const point = viewportPoint(t.clientX, t.clientY)
      schedule(point.x, point.y)
    }

    window.addEventListener('pointerdown', onFingerDown, true)
    window.addEventListener('pointermove', onMove, true)
    window.addEventListener('pointerup', onUp, true)
    window.addEventListener('pointercancel', onCancel, true)
    window.addEventListener('touchmove', onTouchMove, { capture: true, passive: false })
    window.addEventListener('keydown', onKey)
    window.addEventListener('click', onClickCapture, true)
    scroller?.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.documentElement.style.touchAction = ''
      window.removeEventListener('pointerdown', onFingerDown, true)
      window.removeEventListener('pointermove', onMove, true)
      window.removeEventListener('pointerup', onUp, true)
      window.removeEventListener('pointercancel', onCancel, true)
      window.removeEventListener('touchmove', onTouchMove, { capture: true })
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('click', onClickCapture, true)
      scroller?.removeEventListener('scroll', onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (dragRef.current?.holdTimer) clearTimeout(dragRef.current.holdTimer)
      clearTwoTimer()
      barHold.cancel()
      markBarHold(false)
      window.clearTimeout(blockClickTimerRef.current)
      fingersRef.current.clear()
      guardIdsRef.current.clear()
      blockClickRef.current = false
    }
  }, [pageRef])

  useLayoutEffect(() => {
    const frame = overlayRef.current
    trackFramesRef.current()
    if (!frame || typeof ResizeObserver === 'undefined') return
    // 手机框高度变化（窗口、全屏）时重测，避免 viewBox 还停在旧高度把洞拉偏
    const ro = new ResizeObserver(() => trackFramesRef.current())
    ro.observe(frame)
    return () => ro.disconnect()
  }, [regions])

  // 全屏时预览 padding 在过渡，元素在动，但遮罩盒子尺寸经常不变，已选框会停在切换前的坐标。
  // 阶段一变、或 page/phone 尺寸在变，就在 200ms + 150ms 里逐帧按元素本身重测，不等动画结束再跳。
  useLayoutEffect(() => {
    const phone = phoneRef.current
    const page = pageRef.current
    if (!phone && !page) return undefined

    let raf = 0
    let until = 0
    let measuring = false
    // 进入是收起再贴边，退出的 padding 动画也落在这段里
    const followMs = FS_ENTER_MS + FS_DOCK_MS

    const measureNow = () => {
      if (measuring) return
      measuring = true
      try {
        // 绘制前写进 DOM，避免描边比元素晚一帧
        flushSync(() => {
          trackFramesRef.current()
        })
      } finally {
        measuring = false
      }
    }

    const tick = (now) => {
      // 先排下一帧，尽量赶在同帧里更晚的测量之前把坐标写上
      if (now < until) raf = requestAnimationFrame(tick)
      else raf = 0
      measureNow()
    }

    const armFollow = () => {
      const nextUntil = performance.now() + followMs
      if (nextUntil > until) until = nextUntil
      if (!raf) raf = requestAnimationFrame(tick)
    }

    let ro
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        // 尺寸回调可能一帧只来一次，后面的过渡帧交给 rAF 接着量
        measureNow()
        armFollow()
      })
      if (phone) ro.observe(phone)
      if (page) ro.observe(page)
    }

    let mo
    if (phone && typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(() => {
        armFollow()
      })
      mo.observe(phone, {
        attributes: true,
        attributeFilter: ['data-fs-phase', 'data-fs-entering'],
      })
    }

    return () => {
      ro?.disconnect()
      mo?.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [phoneRef, pageRef])

  const phoneWidth = viewport.width
  const phoneHeight = viewport.height
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
      deleting: deletingN != null && pin.n === deletingN,
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
  // 键盘或一行选区输入挡住底栏时，按钮回到手机框里并抬高；平时停在底栏插槽
  const parked = Boolean(fabSlot) && !docked && !editing
  // 全屏贴边时右侧圆角收成 0，图标往外挪 4px；选中态回到正圆
  const flatEdge = edgeDock && parked
  const fabButton = (
    <button
      ref={fabRef}
      type="button"
      data-inspect-ui
      data-inspect-chrome
      data-fs-edge={flatEdge ? '1' : '0'}
      aria-pressed={active || solo}
      aria-label={solo ? '松开并发送' : active ? '放弃选择' : '进入点选'}
      title={solo ? '松开并发送' : active ? '放弃选择' : '进入点选'}
      style={{
        pointerEvents: 'auto',
        ...(parked ? null : { bottom: docked ? 72 : 18 }),
        borderRadius: flatEdge ? '24px 0 0 24px' : '9999px',
        transition: `bottom 150ms cubic-bezier(0.4,0,0.2,1), transform 150ms cubic-bezier(0.4,0,0.2,1), box-shadow 150ms cubic-bezier(0.4,0,0.2,1), color 150ms cubic-bezier(0.4,0,0.2,1), border-radius ${sideMotion}`,
      }}
      className={cn(
        'z-40 flex h-12 w-12 touch-none cursor-pointer items-center justify-center text-black/90 shadow-[0_2px_10px_rgba(0,0,0,0.06)]',
        INSPECT_GLASS_CLASS,
        parked ? 'relative' : 'absolute right-3.5',
        solo
          ? ''
          : active
            ? 'text-[#1a8cff] shadow-[0_8px_28px_rgba(26,140,255,0.35)]'
            : 'hover:scale-105 active:scale-95',
      )}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        pagePressRef.current = false
        const p = viewportPoint(e.clientX, e.clientY)
        const gesture = {
          x: p.x,
          y: p.y,
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
      {/* 听写态只换文案，松手仍是原来的选定元素并发送 */}
      <span
        className="inline-flex items-center justify-center"
        style={{
          transform: flatEdge ? `translateX(${FS_EDGE_NUDGE}px)` : 'none',
          transition: `transform ${sideMotion}`,
        }}
      >
        {solo ? (
          <span className="flex flex-col items-center justify-center whitespace-nowrap text-center text-[11px] leading-none text-[#8e8e93]">
            <span>松开</span>
            <span className="mt-px">发送</span>
          </span>
        ) : active ? (
          <DiscardIcon />
        ) : (
          <InspectIcon />
        )}
      </span>
    </button>
  )

  return (
    <>
    <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-20" data-inspect-ui>
      {locked && phoneWidth > 0 && phoneHeight > 0 && (
        <svg
          data-inspect-ui
          aria-hidden="true"
          width={phoneWidth}
          height={phoneHeight}
          className="pointer-events-none absolute left-0 top-0"
          style={{ width: phoneWidth, height: phoneHeight }}
        >
          <defs>
            {/* 白底保留遮罩，黑色圆角矩形是已选和跟手选框挖出的洞。不设 viewBox，用户坐标等于容器 CSS 像素 */}
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
            style={{
              maskSize: '100% 100%',
              WebkitMaskSize: '100% 100%',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: '0 0',
              WebkitMaskPosition: '0 0',
            }}
          />
          {/* 描边和挖洞同一组 x/y/宽高；只要虚线，不再铺淡蓝底 */}
          {holes.map((hole) => (
            <rect
              key={`stroke-${hole.key}`}
              data-inspect-frame=""
              x={hole.left}
              y={hole.top}
              width={Math.max(hole.width, 0)}
              height={Math.max(hole.height, 0)}
              rx={hole.rx}
              ry={hole.rx}
              fill={hole.deleting ? 'rgba(255, 59, 48, 0.08)' : 'none'}
              stroke={hole.deleting ? 'rgba(255, 59, 48, 0.95)' : FRAME_STROKE}
              strokeWidth="0.5"
              strokeDasharray={FRAME_DASH}
            />
          ))}
        </svg>
      )}

      {/* 没进入点选、也还没有选区时遮罩不出现。展开输入框后仍要接住预览空白，只收起键盘 */}
      {(locked || editing) && (
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
            const p = viewportPoint(e.clientX, e.clientY)
            pointRef.current = { x: p.x, y: p.y }
            updateRef.current(p.x, p.y)
          }}
          onWheel={(e) => {
            const scroller = pageRef.current
            if (!scroller) return
            scroller.scrollTop += e.deltaY
            scroller.scrollLeft += e.deltaX
          }}
        />
      )}

      {pins.map((pin) => {
        const pos = badgePosition(pin, phoneWidth, phoneHeight)
        const deleting = deletingN != null && pin.n === deletingN
        return (
          <button
            key={`badge-${pin.n}`}
            type="button"
            data-inspect-ui
            data-inspect-badge=""
            aria-label={`选区${pin.n}`}
            className={cn(
              // 浮在遮罩上面，中心点必须点到徽标本身。删除态只换内容，位置和大小不动
              // 徽标用较实的淡红，选区里那层填充更透，两层不要叠成同一个红
              // 数字用细字重；变成叉之后是图标，不靠字重
              'pointer-events-auto absolute z-30 flex items-center justify-center border-0 p-0 text-[15px] font-light leading-none',
              deleting ? 'bg-[#ffc2c2] text-[#ff3b30]' : 'bg-[#2f89ff] text-white',
            )}
            style={{ top: pos.top, left: pos.left, width: BADGE, height: BADGE, borderRadius: 8 }}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              // 点序号不是再确认一次元素，也不要把按下交给底下的遮罩
              e.preventDefault()
              e.stopPropagation()
              onBadgePress?.(pin.n)
            }}
          >
            {deleting ? (
              // 就地换成叉，不再在选区右上角另放一枚
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M15.5999 3.51655C15.7171 3.39934 15.8761 3.3335 16.0418 3.3335C16.387 3.3335 16.6668 3.61332 16.6668 3.9585C16.6668 4.12425 16.601 4.28323 16.4837 4.40057L10.884 10.0002L16.4838 15.5999C16.601 15.7171 16.6668 15.8761 16.6668 16.0418C16.6668 16.387 16.387 16.6668 16.0418 16.6668C15.8761 16.6668 15.7171 16.601 15.5999 16.4838L10.0002 10.884L4.40044 16.4838C4.28323 16.601 4.12425 16.6668 3.9585 16.6668C3.61332 16.6668 3.3335 16.387 3.3335 16.0418C3.3335 15.8761 3.39935 15.7171 3.51655 15.5999L3.51708 15.5994L9.11629 10.0002L3.51655 4.40044C3.39934 4.28323 3.3335 4.12425 3.3335 3.9585C3.3335 3.61332 3.61332 3.3335 3.9585 3.3335C4.12425 3.3335 4.28323 3.39934 4.40057 3.51668L10.0002 9.11629L15.5999 3.51655Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              pin.n
            )}
          </button>
        )
      })}

    </div>
    {parked ? createPortal(fabButton, fabSlot) : fabButton}
    </>
  )
}
