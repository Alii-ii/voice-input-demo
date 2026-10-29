import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { cn } from '../lib/cn.js'
import { createBarHold, markBarHold } from './barHold.js'
import { createEdgeSwipe, edgeBandSide } from './edgeSwipeSolo.js'
import { EdgeSwipeDrop, MASK_SCRIM } from './edgeSwipeEffect.jsx'
import { INSPECT_GLASS_CLASS } from './glassChrome.js'
import { describeElement, pickElement, readRadius } from './pickElement.js'
import {
  FS_DOCK_MS,
  FS_EDGE_RADIUS,
  FS_ENTER_MS,
  FS_TWO_FINGER_MS,
} from './previewFullscreen.js'
import { pointOnInspectChrome, resolveTwoFingerPoint } from './twoFingerPick.js'
import { viewportPoint } from './viewportPoint.js'
import {
  closeTwoFingerPath,
  freePathD,
  overlayPointsToPageRatios,
  pageRatiosToOverlay,
  pathBounds,
  pushFreePoint,
} from './freeSelectPath.js'
import { SelectionLoading } from './SelectionLoading.jsx'

/** 与悬浮按钮同尺寸，未吸附时选框保持这个大小 */
const BUTTON = 48

/** 跟手框和已选框的虚线。线宽 0.5，和遮罩洞共用同一组坐标 */
const FRAME_STROKE = 'rgba(26, 140, 255, 0.95)'
const FRAME_DASH = '3 2'
/** 还没开始的队列选框。线宽仍是 0.5，只换成和序号同一档的灰 */
const QUEUE_FRAME_CLASS = 'fill-none stroke-[#8e8e93]'
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

function samePath(a, b) {
  if (!a?.length && !b?.length) return true
  if (!a || !b || a.length !== b.length) return false
  return a.every((point, i) => nearly(point.x, b[i].x) && nearly(point.y, b[i].y))
}

function sameLoads(a, b) {
  if (a.length !== b.length) return false
  return a.every(
    (item, i) =>
      item.key === b[i].key &&
      item.n === b[i].n &&
      item.startedAt === b[i].startedAt &&
      item.rx === b[i].rx &&
      nearly(item.top, b[i].top) &&
      nearly(item.left, b[i].left) &&
      nearly(item.width, b[i].width) &&
      nearly(item.height, b[i].height) &&
      samePath(item.path, b[i].path),
  )
}

/** 已发出的选区投回遮罩坐标。自由形状留路径，元素框留圆角，不收成另一块矩形 */
function projectLoads(shapes, origin, pageEl) {
  const loads = []
  for (const shape of shapes) {
    if (shape.free?.length && pageEl) {
      const path = pageRatiosToOverlay(shape.free, pageEl, origin)
      const bounds = pathBounds(path)
      loads.push({
        key: shape.key,
        // 轮次序号跟已选徽章同一套位置，自由形状也挂在包围盒角上
        n: shape.n,
        path,
        top: bounds.top,
        left: bounds.left,
        width: bounds.width,
        height: bounds.height,
        rx: 0,
        startedAt: shape.startedAt || 0,
      })
      continue
    }
    const el = shape.el
    if (!el?.isConnected) continue
    const rect = el.getBoundingClientRect()
    loads.push({
      key: shape.key,
      n: shape.n,
      path: null,
      top: rect.top - origin.top,
      left: rect.left - origin.left,
      width: rect.width,
      height: rect.height,
      rx: radiusPx(readRadius(el)),
      startedAt: shape.startedAt || 0,
    })
  }
  return loads
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
      nearly(pin.height, b[i].height) &&
      samePath(pin.path, b[i].path),
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

/**
 * 徽标落在选区哪一角，就把朝向选区的那只角收成 4px。摆放仍由 badgePosition 决定。
 * 左上指向右下，右上指向左下，左下指向右上，右下指向左上。
 * 另外三角用边长的一半（13px）画成整圆。写成 9999px 时相邻半径会超过边长，4px 会被一起缩成尖角。
 */
function badgeRadiusClass(pos, pin) {
  const cx = pos.left + BADGE / 2
  const cy = pos.top + BADGE / 2
  const corners = [
    { key: 'tl', x: pin.left, y: pin.top },
    { key: 'tr', x: pin.left + pin.width, y: pin.top },
    { key: 'bl', x: pin.left, y: pin.top + pin.height },
    { key: 'br', x: pin.left + pin.width, y: pin.top + pin.height },
  ]
  let nearest = 'tl'
  let best = Infinity
  for (const corner of corners) {
    const dx = cx - corner.x
    const dy = cy - corner.y
    const dist = dx * dx + dy * dy
    if (dist < best) {
      best = dist
      nearest = corner.key
    }
  }
  // 整圆半径是边长的一半（13px）。类名写死，方便 Tailwind 扫到
  if (nearest === 'tr') {
    return 'rounded-tl-[13px] rounded-tr-[13px] rounded-br-[13px] rounded-bl-[4px]'
  }
  if (nearest === 'bl') {
    return 'rounded-tl-[13px] rounded-tr-[4px] rounded-br-[13px] rounded-bl-[13px]'
  }
  if (nearest === 'br') {
    return 'rounded-tl-[4px] rounded-tr-[13px] rounded-br-[13px] rounded-bl-[13px]'
  }
  return 'rounded-tl-[13px] rounded-tr-[13px] rounded-br-[4px] rounded-bl-[13px]'
}

function releasedOnChrome(x, y) {
  const el = document.elementFromPoint(x, y)
  return el instanceof Element && !!el.closest('[data-inspect-chrome]')
}

/**
 * 悬浮按钮 + 点选遮罩。
 * 轻点悬浮按钮进入多选；移动超过阈值或按住约 280ms 进入单选跟手。
 * 两指都在手机框内，连线中点落在页面上按住 200ms 进入多选。全屏和生成中也能进；第二指落下会取消还没成立的边缘划入。
 * 底部输入框按住同样约 280ms：滑进页面走单选，没选中元素则只听写。
 * 多选确认后不退出：遮罩、已选高亮和序号都留着，可继续点下一个。
 * 单指从手机框左缘或右缘向内划进预览页，也进同一条单选听写；全屏同样支持。
 * 多选里拖过阈值则沿轨迹圈自由形状，松手收成自由选区；没超过仍是点击元素。
 * 已经在多选里时，两指滑动围成闭合选区：起点边、两侧轨迹、终点边。还没进多选时，双指长按进入选择。
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
  loadingShapes = [],
  runMs = 5000,
  edgeDock = false,
  sideMotion = '150ms cubic-bezier(0, 0, 0.2, 1)',
  onPickingChange,
  onDiscard,
  deletingN = null,
  onBadgePress,
  onRemoveQueuedShape,
  exitSelectRef,
}) {
  const fabRef = useRef(null)
  const overlayRef = useRef(null) // 遮罩容器，蓝框和挖洞都相对它定位
  const [active, setActive] = useState(false)
  const [solo, setSolo] = useState(false)
  const [box, setBox] = useState(null)

  const [pins, setPins] = useState([]) // 已确认选区的实时矩形
  const [loadFrames, setLoadFrames] = useState([]) // 已发出、还在这一轮生成里的选区
  const [armedQueueKey, setArmedQueueKey] = useState(null) // 等候序号的删除确认，一次只确认一颗
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [fabSlot, setFabSlot] = useState(null)
  const [lasso, setLasso] = useState(null) // 正在画的自由形状，遮罩坐标
  const [edgeFx, setEdgeFx] = useState(null) // 边缘 toggle 的进度。遮罩透明度另算，不跟这颗圆合成一块
  const [maskOn, setMaskOn] = useState(false) // 其他入口的遮罩淡入开关
  const edgeRevealRef = useRef(false)
  const edgeInstantRef = useRef(false) // 水滴铺满后遮罩直接接上，不再从 0 淡一次
  const edgeFxRef = useRef(null)
  edgeFxRef.current = edgeFx

  // 生产构建里这条 effect 可能早于底栏插槽。插槽出现时再绑一次，只在节点变化时更新，避免嵌套更新把整页卸掉
  useLayoutEffect(() => {
    if (!fabSlotRef) return
    const bind = (node) => {
      setFabSlot((prev) => (prev === node ? prev : node))
    }
    fabSlotRef.bind = bind
    bind(fabSlotRef.current ?? null)
    return () => {
      if (fabSlotRef.bind === bind) fabSlotRef.bind = null
    }
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
  const lassoOriginRef = useRef(null) // 这次按下的视口坐标，超过阈值才开画
  const lassoRef = useRef(null) // 已采样的遮罩坐标，松手后收成自由选区
  const twoStrokeRef = useRef(null) // 多选里的双指围区：两根手指各自的轨迹
  const twoConsumedRef = useRef(new Set()) // 已经收过的那一指，剩下的不要改成单指套索
  const onSelectRef = useRef(onSelect)
  const onDismissRef = useRef(onDismiss)
  const onSoloStartRef = useRef(onSoloStart)
  const onSoloTargetRef = useRef(onSoloTarget)
  const onSoloFinishRef = useRef(onSoloFinish)
  const regionsRef = useRef(regions)
  const loadingShapesRef = useRef(loadingShapes)
  const editingRef = useRef(editing)
  const syncPinsRef = useRef(() => {})
  const trackFramesRef = useRef(() => {})
  const runningRef = useRef(false)
  const pickingRef = useRef(false)
  const onPickingChangeRef = useRef(onPickingChange)
  const fingersRef = useRef(new Map())
  const twoTimerRef = useRef(0)
  const twoGenRef = useRef(0)
  const twoSoloRef = useRef(false) // 这次单选是双指长按开的，松手仍按中点吸附，不改去单指坐标
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
  loadingShapesRef.current = loadingShapes
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
    // 自由形状已经在画，不再按经过的元素改框
    if (lassoRef.current) return
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
    lassoOriginRef.current = null
    lassoRef.current = null
    twoStrokeRef.current = null
    twoConsumedRef.current.clear()
    for (const finger of fingersRef.current.values()) finger.stroke = null
    setActive(false)
    setBox(null)
    setLasso(null)
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
    lassoOriginRef.current = null
    lassoRef.current = null
    twoStrokeRef.current = null
    twoConsumedRef.current.clear()
    for (const finger of fingersRef.current.values()) finger.stroke = null
    setLasso(null)
    pointRef.current = { x, y }
    updateRef.current(x, y)
  }

  const endSolo = (keepMulti) => {
    document.documentElement.style.touchAction = ''
    soloRef.current = false
    twoSoloRef.current = false
    lastSoloElRef.current = null
    snappedRef.current = null
    pointRef.current = null
    setSolo(false)
    setBox(null)
    setEdgeFx(null)
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
      if (region.free?.length && pageRef.current) {
        const path = pageRatiosToOverlay(region.free, pageRef.current, origin)
        const bounds = pathBounds(path)
        next.push({
          n: region.n,
          path,
          top: bounds.top,
          left: bounds.left,
          width: bounds.width,
          height: bounds.height,
          radius: '0px',
        })
        continue
      }
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
    const loads = projectLoads(loadingShapesRef.current, origin, pageRef.current)
    setLoadFrames((prev) => (sameLoads(prev, loads) ? prev : loads))
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

    // 滑出页面时停在最后一个还在页内的点，松手仍用这个点闭合
    const sampleStroke = (finger, x, y) => {
      const stroke = finger.stroke
      if (!stroke) return
      const dx = x - stroke.origin.x
      const dy = y - stroke.origin.y
      stroke.dist = Math.max(stroke.dist, Math.hypot(dx, dy))
      // 页外不再往外延，沿用最后落在页内的位置
      const inside = pageHit(x, y) ? { x, y } : stroke.lastInside
      if (pageHit(x, y)) stroke.lastInside = inside
      const overlay = overlayRef.current?.getBoundingClientRect()
      if (!overlay || !inside) return
      stroke.points = pushFreePoint(stroke.points, {
        x: inside.x - overlay.left,
        y: inside.y - overlay.top,
      })
    }

    const publishTwoStroke = () => {
      const gesture = twoStrokeRef.current
      if (!gesture) return
      const pathA = fingersRef.current.get(gesture.ids[0])?.stroke
      const pathB = fingersRef.current.get(gesture.ids[1])?.stroke
      if (!pathA || !pathB) return
      const past =
        pathA.dist * pathA.dist > DRAG_DISTANCE * DRAG_DISTANCE ||
        pathB.dist * pathB.dist > DRAG_DISTANCE * DRAG_DISTANCE
      // 两指都没超过点击阈值时不画出细线，松手仍按元素确认
      if (!past) return
      if (!gesture.armed) {
        gesture.armed = true
        snappedRef.current = null
        setBox(null)
        pagePressRef.current = false
        lassoOriginRef.current = null
      }
      const closed = closeTwoFingerPath(pathA.points, pathB.points)
      lassoRef.current = closed
      setLasso(closed)
    }

    // 一根手指抬起就收成双指选区。另一根留下时不再改成单指套索
    const takeTwoStroke = (pointerId, x, y) => {
      if (twoConsumedRef.current.has(pointerId)) {
        twoConsumedRef.current.delete(pointerId)
        return 'consumed'
      }
      const gesture = twoStrokeRef.current
      if (!gesture || !gesture.ids.includes(pointerId)) return 'none'
      const finger = fingersRef.current.get(pointerId)
      if (finger?.stroke) sampleStroke(finger, x, y)
      publishTwoStroke()
      const armed = gesture.armed
      const pathA = fingersRef.current.get(gesture.ids[0])?.stroke
      const pathB = fingersRef.current.get(gesture.ids[1])?.stroke
      const closed = armed && pathA && pathB ? closeTwoFingerPath(pathA.points, pathB.points) : null
      for (const id of gesture.ids) {
        const item = fingersRef.current.get(id)
        if (item) item.stroke = null
        if (id !== pointerId) twoConsumedRef.current.add(id)
      }
      twoStrokeRef.current = null
      lassoRef.current = null
      setLasso(null)
      if (armed && closed && closed.length >= 3 && activeRef.current && !editingRef.current) {
        pagePressRef.current = false
        lassoOriginRef.current = null
        commitFree(closed)
        return 'commit'
      }
      return 'tap'
    }

    const tryBeginTwoStroke = () => {
      if (twoStrokeRef.current || !activeRef.current || soloRef.current || editingRef.current) return
      const ids = []
      for (const [id, finger] of fingersRef.current) {
        if (!finger.stroke) continue
        if (!pageHit(finger.stroke.origin.x, finger.stroke.origin.y)) continue
        ids.push(id)
      }
      // 恰好两指、且都从预览页里落下，才围区
      if (ids.length !== 2) return
      twoStrokeRef.current = { ids, armed: false }
      lassoRef.current = null
      setLasso(null)
      publishTwoStroke()
    }

    // 超过点击阈值后沿轨迹采样。返回 true 表示这次移动已经被自由形状吃掉
    const extendLasso = (x, y) => {
      if (twoStrokeRef.current) return true
      const origin = lassoOriginRef.current
      if (dragRef.current || !pagePressRef.current || !origin) return false
      if (!activeRef.current || soloRef.current || editingRef.current) return false
      const dx = x - origin.x
      const dy = y - origin.y
      if (!lassoRef.current && dx * dx + dy * dy <= DRAG_DISTANCE * DRAG_DISTANCE) return false
      const overlay = overlayRef.current?.getBoundingClientRect()
      if (!overlay) return false
      const local = (px, py) => ({ x: px - overlay.left, y: py - overlay.top })
      if (!lassoRef.current) {
        lassoRef.current = [local(origin.x, origin.y)]
        snappedRef.current = null
        setBox(null)
      }
      lassoRef.current = pushFreePoint(lassoRef.current, local(x, y))
      setLasso(lassoRef.current)
      return true
    }

    const commitFree = (points) => {
      const page = pageRef.current
      const overlay = overlayRef.current?.getBoundingClientRect()
      if (!page || !overlay || points.length < 2) return
      onSelectRef.current?.({
        el: null,
        free: overlayPointsToPageRatios(points, overlay, page),
      })
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

    // 生成中不挡新手势：上一条留在队列里继续跑，这里仍可再划入、长按或点进选择
    const canBarHold = () =>
      !editingRef.current && !activeRef.current && !soloRef.current

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

    // 边缘划入和输入框长按、点选按钮长按进的是同一条单选。没划进去之前不拦默认行为
    let glassFrame = 0
    const stopGlass = () => cancelAnimationFrame(glassFrame)
    const dismissGlass = () => {
      stopGlass()
      const from = edgeFxRef.current
      // 没过阈值：小山收回边缘，不进入单选
      if (!from || from.phase === 'hold') return
      const start = performance.now()
      const step = (now) => {
        const t = Math.min(1, (now - start) / 170)
        const remain = (1 - t) * (1 - t)
        const edgeX = from.side === 'left' ? from.x - from.inward : from.x + from.inward
        let alive = true
        setEdgeFx((prev) => {
          if (!prev || prev.phase !== 'retract') {
            alive = false
            return prev
          }
          return {
            ...prev,
            progress: from.progress * remain,
            inward: from.inward * remain,
            x: edgeX + (from.x - edgeX) * remain,
            spread: 0,
          }
        })
        if (!alive) return
        if (t < 1) glassFrame = requestAnimationFrame(step)
        else setEdgeFx((prev) => (prev && prev.phase === 'retract' ? null : prev))
      }
      setEdgeFx((prev) => (prev ? { ...prev, phase: 'retract' } : null))
      glassFrame = requestAnimationFrame(step)
    }
    let latestSample = null
    const edgeSwipe = createEdgeSwipe({
      allowed: canBarHold,
      inPage: pageHit,
      onPreview: (sample) => {
        if (sample.inward <= 0) return
        latestSample = sample
        stopGlass()
        setEdgeFx({ phase: 'drag', spread: 0, ...sample })
      },
      onArm: (x, y) => {
        // 判定成功只进一次单选。边缘轮廓马上从 DOM 卸掉，避免边缘留下 toggle 快照
        edgeRevealRef.current = true
        blockClickRef.current = true
        clearTwoTimer()
        barHold.cancel()
        beginSolo(x, y)
        stopGlass()
        setEdgeFx(null)
      },
      onDismiss: dismissGlass,
    })

    // 已经在多选或单选里就不要再开一条。全屏和生成中不挡：第二指落下时边缘划入会被取消
    const twoFingerLongPressBlocked = () => activeRef.current || soloRef.current

    // 恰好两指都在手机框内，中点落在页面且不是系统按钮，按住满 200ms 进入多选
    const scheduleTwoFinger = () => {
      const point = twoFingerPoint()
      // 提前松手、变成一指、中点离开页面、压到系统按钮，或已经在选/听写，都取消这 200ms
      if (twoFingerLongPressBlocked() || !point) {
        clearTwoTimer()
        return
      }
      if (twoTimerRef.current) return
      const gen = twoGenRef.current
      twoTimerRef.current = window.setTimeout(() => {
        twoTimerRef.current = 0
        if (gen !== twoGenRef.current) return
        if (twoFingerLongPressBlocked()) return
        const next = twoFingerPoint()
        const ids = [...fingersRef.current.keys()]
        if (!next || ids.length !== 2) return
        // 这两根手指松开时不再当成点击确认，选择模式留着
        guardIdsRef.current = new Set(ids)
        blockClickRef.current = true
        window.clearTimeout(blockClickTimerRef.current)
        if (dragRef.current?.holdTimer) clearTimeout(dragRef.current.holdTimer)
        dragRef.current = null
        barHold.cancel()
        edgeSwipe.cancel()
        markBarHold(true)
        twoSoloRef.current = false
        enterRef.current(next.x, next.y)
      }, FS_TWO_FINGER_MS)
    }

    const onFingerDown = (e) => {
      if (e.button !== 0) return
      const p = viewportPoint(e.clientX, e.clientY)
      if (!phoneHit(p.x, p.y)) return
      const fingerRec = { x: p.x, y: p.y }
      // 序号、芯片、底栏按钮不开始圈选，短按仍走原来的删除或放弃
      const blocked =
        e.target instanceof Element &&
        e.target.closest('[data-inspect-badge], [data-element-tag], [data-inspect-chrome]')
      // 已经在多选里、且这指落在预览页上，才记下这侧轨迹。还没进多选时仍走双指长按
      const overlay = overlayRef.current?.getBoundingClientRect()
      if (
        overlay &&
        !blocked &&
        activeRef.current &&
        !soloRef.current &&
        !editingRef.current &&
        pageHit(p.x, p.y)
      ) {
        fingerRec.stroke = {
          origin: { x: p.x, y: p.y },
          lastInside: { x: p.x, y: p.y },
          points: [{ x: p.x - overlay.left, y: p.y - overlay.top }],
          dist: 0,
        }
      }
      fingersRef.current.set(e.pointerId, fingerRec)
      scheduleTwoFinger()
      // 不 preventDefault，短按仍能聚焦输入框、继续拼音
      if (e.target instanceof Element && e.target.closest('[data-inspect-ime="bar"]')) {
        barHold.down(e.pointerId, p.x, p.y)
      }
      if (
        !blocked &&
        !pagePressRef.current &&
        activeRef.current &&
        !soloRef.current &&
        !editingRef.current &&
        pageHit(p.x, p.y)
      ) {
        pagePressRef.current = true
        lassoOriginRef.current = { x: p.x, y: p.y }
        lassoRef.current = null
      }
      tryBeginTwoStroke()
      // 第二指落下就放弃边缘划入，留给双指长按和双指围区
      if (fingersRef.current.size > 1) {
        edgeSwipe.cancel()
      } else if (!blocked) {
        const side = edgeBandSide(p.x, p.y, phoneRef.current?.getBoundingClientRect())
        edgeSwipe.down(e.pointerId, p.x, p.y, side)
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
      // 两指都松开、且没有正在进行的单选时，清掉长按打标，下一回短按仍能展开输入框
      if (fingersRef.current.size === 0 && !soloRef.current) markBarHold(false)
      return guarded
    }

    const onMove = (e) => {
      // 单选、多选，以及两指还在等 200ms 时，都拦住滚动，否则手机会把这次按住收成 pointercancel
      const holdTwo =
        fingersRef.current.size >= 2 && !soloRef.current && !activeRef.current
      if ((soloRef.current || activeRef.current || holdTwo) && e.cancelable) e.preventDefault()
      const p = viewportPoint(e.clientX, e.clientY)
      const finger = fingersRef.current.get(e.pointerId)
      if (finger) {
        finger.x = p.x
        finger.y = p.y
        // 还没成立时中点跟着走，离开页面或按钮就取消这 200ms
        barHold.move(e.pointerId, p.x, p.y)
        if (guardIdsRef.current.has(e.pointerId)) return
        scheduleTwoFinger()
        if (twoConsumedRef.current.has(e.pointerId)) return
        // 双指围区时每根手指只延长自己的一侧，不收成一条折线，也不再吸附元素
        if (finger.stroke && twoStrokeRef.current) {
          sampleStroke(finger, p.x, p.y)
          if (twoStrokeRef.current.ids.includes(e.pointerId)) publishTwoStroke()
          return
        }
        if (finger.stroke && !twoStrokeRef.current) sampleStroke(finger, p.x, p.y)
      }
      // 刚判定为边缘划入才拦住滚动和返回手势；在这之前不 preventDefault
      if (edgeSwipe.move(e.pointerId, p.x, p.y) && e.cancelable) e.preventDefault()
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
      // 双指长按已经进了单选：跟手用两指中点，不改去其中一根手指的位置
      if (twoSoloRef.current && soloRef.current && fingersRef.current.size >= 2) {
        const mid = twoFingerPoint()
        if (mid) {
          schedule(mid.x, mid.y)
          return
        }
      }
      if (drag && !drag.moved) {
        const dx = p.x - drag.x
        const dy = p.y - drag.y
        if (dx * dx + dy * dy > DRAG_DISTANCE * DRAG_DISTANCE) drag.moved = true
      }
      if (extendLasso(p.x, p.y)) return
      schedule(p.x, p.y)
    }

    // 松开时才确认多选。单选松手交给父级发送，不插入选区序号
    const onUp = (e) => {
      const p = viewportPoint(e.clientX, e.clientY)
      const twoResult = takeTwoStroke(e.pointerId, p.x, p.y)
      edgeSwipe.up(e.pointerId)
      const guarded = releaseFinger(e)
      const barResult = barHold.up(e.pointerId)
      if (barResult !== 'none') markBarHold(false)
      if (twoResult === 'commit' || twoResult === 'consumed') {
        pagePressRef.current = false
        lassoOriginRef.current = null
        lassoRef.current = null
        return
      }
      if (guarded) {
        // 已标记的双指手势松开时不再额外确认元素，也不当成按钮点击
        pagePressRef.current = false
        lassoOriginRef.current = null
        lassoRef.current = null
        setLasso(null)
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
      const freePath = lassoRef.current
      dragRef.current = null
      pagePressRef.current = false
      lassoOriginRef.current = null
      lassoRef.current = null
      if (freePath) setLasso(null)
      if (drag?.holdTimer) clearTimeout(drag.holdTimer)
      if (e.button !== 0 && (drag || pagePress)) return

      if (drag?.armed || soloRef.current) {
        // 双指长按松手时沿用中点吸附。改用这一根手指的坐标会把元素弄丢，空内容也不该因此被发出去
        if (!twoSoloRef.current) updateRef.current(p.x, p.y)
        const el = snappedRef.current
        const info = el
          ? { el, summary: describeElement(el, el.getBoundingClientRect()), text: elementTitle(el) }
          : null
        const keepMulti = !!drag?.startedActive && activeRef.current
        endSolo(keepMulti)
        onSoloFinishRef.current?.(info)
        // 双指长按打过的短按抑制，松手发送后清掉，避免输入框一直当成长按
        if (fingersRef.current.size === 0) markBarHold(false)
        // 边缘划入松手后的点击不要再点到页面按钮上
        if (blockClickRef.current) {
          window.clearTimeout(blockClickTimerRef.current)
          blockClickTimerRef.current = window.setTimeout(() => {
            blockClickRef.current = false
          }, 80)
        }
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

      // 拖过阈值：收成一条自由选区，不按松手底下的元素确认
      if (freePath && freePath.length >= 2 && pagePress && activeRef.current && !editingRef.current) {
        commitFree(freePath)
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
      if (lassoRef.current) return
      const point = pointRef.current
      if (!activeRef.current || !point) return
      schedule(point.x, point.y)
    }

    const onCancel = (e) => {
      const p = viewportPoint(e.clientX, e.clientY)
      const twoResult = takeTwoStroke(e.pointerId, p.x, p.y)
      edgeSwipe.cancel()
      releaseFinger(e)
      if (barHold.up(e.pointerId) !== 'none') markBarHold(false)
      if (twoResult === 'commit' || twoResult === 'consumed') return
      if (fingersRef.current.size === 0 && lassoRef.current) {
        lassoOriginRef.current = null
        lassoRef.current = null
        pagePressRef.current = false
        setLasso(null)
      }
    }

    const onClickCapture = (e) => {
      if (!blockClickRef.current) return
      e.preventDefault()
      e.stopPropagation()
    }

    // 输入框上的指针捕获在真机上经常丢 move，捕获阶段和 touchmove 再接一次
    const onTouchMove = (e) => {
      const holdTwo =
        fingersRef.current.size >= 2 && !soloRef.current && !activeRef.current
      // 两指按住的这 200ms 也要拦触摸滚动，否则计时还没到就被取消
      if (!soloRef.current && !activeRef.current && !holdTwo) return
      if (e.cancelable) e.preventDefault()
      // 双指轨迹和双指长按的中点都由 pointermove 采样，这里不要改成第一根手指
      if (twoStrokeRef.current || (twoSoloRef.current && e.touches.length >= 2)) return
      const t = e.touches[0]
      if (!t) return
      const point = viewportPoint(t.clientX, t.clientY)
      if (extendLasso(point.x, point.y)) return
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
      edgeSwipe.cancel()
      stopGlass()
      markBarHold(false)
      window.clearTimeout(blockClickTimerRef.current)
      fingersRef.current.clear()
      guardIdsRef.current.clear()
      twoStrokeRef.current = null
      twoConsumedRef.current.clear()
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

  // 发出后的点阵不在 regions 里，队列一变就按元素或自由路径重测一次
  useLayoutEffect(() => {
    trackFramesRef.current()
  }, [loadingShapes])

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
  const edgeDragging = edgeFx?.phase === 'drag' || edgeFx?.phase === 'retract'
  useLayoutEffect(() => {
    if (!locked) {
      edgeInstantRef.current = false
      setMaskOn(false)
      return
    }
    // 边缘划入时遮罩已经跟进度到 1，接上选择态时不要再从 0 闪一次
    if (edgeRevealRef.current) {
      edgeRevealRef.current = false
      edgeInstantRef.current = true
      setMaskOn(true)
      return
    }
    edgeInstantRef.current = false
    setMaskOn(false)
    const id = requestAnimationFrame(() => setMaskOn(true))
    return () => cancelAnimationFrame(id)
  }, [locked])
  // 拖拽过程中遮罩仍是整页矩形，只按进度改透明度
  const showMask = locked || edgeDragging
  const veilProgress = edgeDragging
    ? (edgeFx.progress || 0)
    : locked
      ? (maskOn ? 1 : 0)
      : 0
  const dropFrame = overlayRef.current?.getBoundingClientRect()
  const drop = edgeFx && dropFrame
    ? {
        side: edgeFx.side,
        x: edgeFx.x - dropFrame.left,
        y: edgeFx.y - dropFrame.top,
        progress: edgeFx.progress || 0,
      }
    : null
  const holes = []
  for (const pin of pins) {
    holes.push({
      key: `pin-${pin.n}`,
      path: pin.path,
      top: pin.top,
      left: pin.left,
      width: pin.width,
      height: pin.height,
      rx: radiusPx(pin.radius),
      deleting: deletingN != null && pin.n === deletingN,
    })
  }
  if (lasso && lasso.length >= 2) {
    const bounds = pathBounds(lasso)
    holes.push({
      key: 'lasso',
      path: lasso,
      top: bounds.top,
      left: bounds.left,
      width: bounds.width,
      height: bounds.height,
      rx: 0,
    })
  } else if (tracking && box) {
    holes.push({
      key: 'live',
      top: box.top,
      left: box.left,
      width: box.width,
      height: box.height,
      rx: radiusPx(box.radius),
    })
  }
  // 按钮只作为底栏右侧那一格，不另用坐标钉在手机上
  const parked = Boolean(fabSlot) && !docked
  // 全屏贴边时高度仍是 48，宽度包住 16px 图标并左右各留 4px；靠屏幕一侧圆角为 0，内侧 12px
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
        borderRadius: flatEdge ? `${FS_EDGE_RADIUS}px 0 0 ${FS_EDGE_RADIUS}px` : '9999px',
        transition: `bottom 150ms cubic-bezier(0.4,0,0.2,1), transform 150ms cubic-bezier(0.4,0,0.2,1), box-shadow 150ms cubic-bezier(0.4,0,0.2,1), color 150ms cubic-bezier(0.4,0,0.2,1), border-radius ${sideMotion}`,
      }}
      className={cn(
        'z-40 flex h-12 touch-none cursor-pointer items-center justify-center text-black/90 shadow-[0_2px_10px_rgba(0,0,0,0.06)]',
        INSPECT_GLASS_CLASS,
        flatEdge ? 'w-fit px-1 [&_svg]:h-4 [&_svg]:w-4' : 'w-12',
        'relative',
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
      <span className="inline-flex items-center justify-center">
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

  // 已经开始的那一轮只走点阵。还在队列里的留选区框，序号是队列位置减 1
  const runningFrames = []
  const waitingFrames = []
  for (const frame of loadFrames) {
    if (frame.startedAt) runningFrames.push(frame)
    else waitingFrames.push(frame)
  }

  return (
    <>
    <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-20" data-inspect-ui>
      {showMask && phoneWidth > 0 && phoneHeight > 0 && (
        <svg
          data-inspect-ui
          data-inspect-mask=""
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
              {holes.map((hole) =>
                hole.path?.length ? (
                  <path key={hole.key} d={freePathD(hole.path)} fill="black" />
                ) : (
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
                ),
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width={phoneWidth}
            height={phoneHeight}
            fill={MASK_SCRIM}
            mask="url(#inspect-selection-mask)"
            style={{
              opacity: veilProgress,
              transition: edgeDragging || edgeInstantRef.current ? 'none' : 'opacity 100ms linear',
              maskSize: '100% 100%',
              WebkitMaskSize: '100% 100%',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: '0 0',
              WebkitMaskPosition: '0 0',
            }}
          />
          {/* 描边和挖洞同一组 x/y/宽高；只要虚线，不再铺淡蓝底 */}
          {holes.map((hole) =>
            hole.path?.length ? (
              <path
                key={`stroke-${hole.key}`}
                data-inspect-frame=""
                data-free-path=""
                d={freePathD(hole.path)}
                fill={hole.deleting ? 'rgba(255, 59, 48, 0.08)' : 'none'}
                stroke={hole.deleting ? 'rgba(255, 59, 48, 0.95)' : FRAME_STROKE}
                strokeWidth="0.5"
                strokeDasharray={FRAME_DASH}
              />
            ) : (
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
            ),
          )}
        </svg>
      )}
      {drop && edgeFx && (
        <EdgeSwipeDrop
          side={drop.side}
          x={drop.x}
          y={drop.y}
          progress={drop.progress}
          width={phoneWidth}
          height={phoneHeight}
        />
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
            // 双指围区已经在 window 捕获里记下了，这里不要再清掉闭合路径
            if (twoStrokeRef.current) {
              e.preventDefault()
              return
            }
            // 点选模式里的再次按下：先吸附，松手时再确认。拖过阈值则改画自由形状
            e.preventDefault()
            const p = viewportPoint(e.clientX, e.clientY)
            if (!pagePressRef.current) {
              lassoOriginRef.current = { x: p.x, y: p.y }
              lassoRef.current = null
            }
            pagePressRef.current = true
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

      {runningFrames.length > 0 ? <SelectionLoading frames={runningFrames} runMs={runMs} /> : null}

      {waitingFrames.length > 0 && phoneWidth > 0 && phoneHeight > 0 ? (
        <svg
          data-inspect-queue=""
          aria-hidden="true"
          width={phoneWidth}
          height={phoneHeight}
          className="pointer-events-none absolute left-0 top-0"
          style={{ width: phoneWidth, height: phoneHeight }}
        >
          {waitingFrames.map((frame) =>
            frame.path?.length ? (
              <path
                key={frame.key}
                data-inspect-frame=""
                data-free-path=""
                d={freePathD(frame.path)}
                className={QUEUE_FRAME_CLASS}
                strokeWidth="0.5"
                strokeDasharray={FRAME_DASH}
              />
            ) : (
              <rect
                key={frame.key}
                data-inspect-frame=""
                x={frame.left}
                y={frame.top}
                width={Math.max(frame.width, 0)}
                height={Math.max(frame.height, 0)}
                rx={frame.rx}
                ry={frame.rx}
                className={QUEUE_FRAME_CLASS}
                strokeWidth="0.5"
                strokeDasharray={FRAME_DASH}
              />
            ),
          )}
        </svg>
      ) : null}

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
              badgeRadiusClass(pos, pin),
              deleting ? 'bg-[#ffc2c2] text-[#ff3b30]' : 'bg-[#2f89ff] text-white',
            )}
            style={{ top: pos.top, left: pos.left, width: BADGE, height: BADGE }}
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

      {waitingFrames.map((frame) => {
        // 进行中的那一轮不进这个列表。数字是队列位置减 1，同一轮的选区相同
        if (frame.n == null || frame.n < 1) return null
        const pos = badgePosition(frame, phoneWidth, phoneHeight)
        // 和多选序号一样：一次只确认一颗。点这一颗第二次才删，点另一颗改确认到那一颗
        const deleting = armedQueueKey === frame.key
        return (
          <button
            key={`queue-badge-${frame.key}`}
            type="button"
            data-inspect-ui
            data-inspect-badge=""
            aria-label={`第${frame.n}轮`}
            className={cn(
              // 和点选序号同一颗：指向角 4px，其余角全圆。排队白底灰字
              // 描边和投影跟点阵遮罩同一档：0.5px 浅边，大而柔的投影
              // 第一次只换成多选那套淡红底和红叉，挡住冒泡，不进入点选、不展开输入
              'pointer-events-auto absolute z-30 flex items-center justify-center border-[0.5px] border-black/8 p-0 text-[15px] font-light leading-none shadow-[0_1px_24px_0_rgb(0_0_0/0.06)]',
              badgeRadiusClass(pos, frame),
              deleting ? 'bg-[#ffc2c2] text-[#ff3b30]' : 'bg-white text-[#8e8e93]',
            )}
            style={{ top: pos.top, left: pos.left, width: BADGE, height: BADGE }}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              e.preventDefault()
              e.stopPropagation()
              if (armedQueueKey !== frame.key) {
                setArmedQueueKey(frame.key)
                return
              }
              setArmedQueueKey(null)
              onRemoveQueuedShape?.(frame.key)
            }}
          >
            {deleting ? (
              // 和多选序号同一枚叉，颜色跟文字走
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M15.5999 3.51655C15.7171 3.39934 15.8761 3.3335 16.0418 3.3335C16.387 3.3335 16.6668 3.61332 16.6668 3.9585C16.6668 4.12425 16.601 4.28323 16.4837 4.40057L10.884 10.0002L16.4838 15.5999C16.601 15.7171 16.6668 15.8761 16.6668 16.0418C16.6668 16.387 16.387 16.6668 16.0418 16.6668C15.8761 16.6668 15.7171 16.601 15.5999 16.4838L10.0002 10.884L4.40044 16.4838C4.28323 16.601 4.12425 16.6668 3.9585 16.6668C3.61332 16.6668 3.3335 16.387 3.3335 16.0418C3.3335 15.8761 3.39935 15.7171 3.51655 15.5999L3.51708 15.5994L9.11629 10.0002L3.51655 4.40044C3.39934 4.28323 3.3335 4.12425 3.3335 3.9585C3.3335 3.61332 3.61332 3.3335 3.9585 3.3335C4.12425 3.3335 4.28323 3.39934 4.40057 3.51668L10.0002 9.11629L15.5999 3.51655Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              frame.n
            )}
          </button>
        )
      })}

    </div>
    {parked ? createPortal(fabButton, fabSlot) : fabButton}
    </>
  )
}
