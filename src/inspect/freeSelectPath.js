/** 多选拖拽的自由形状。点相对预览页内容，全屏和滚动时再投回遮罩 */

const SAMPLE_PX = 2

function round2(value) {
  return Math.round(value * 100) / 100
}

/** 沿轨迹加点。弯要留下，不能收成起终点两个角 */
export function pushFreePoint(points, point, min = SAMPLE_PX) {
  if (!points.length) return [point]
  const last = points[points.length - 1]
  const dx = point.x - last.x
  const dy = point.y - last.y
  if (dx * dx + dy * dy < min * min) return points
  return [...points, point]
}

/** 首尾闭合。洞和虚线都走这条路径，不用外接矩形 */
export function freePathD(points) {
  if (!points?.length) return ''
  const [head, ...rest] = points
  const body = rest.map((point) => `L ${round2(point.x)} ${round2(point.y)}`).join(' ')
  return `M ${round2(head.x)} ${round2(head.y)} ${body} Z`
}

/** 序号仍放在形状左上角，只用来摆徽标 */
export function pathBounds(points) {
  let top = Infinity
  let left = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const point of points) {
    top = Math.min(top, point.y)
    left = Math.min(left, point.x)
    right = Math.max(right, point.x)
    bottom = Math.max(bottom, point.y)
  }
  return {
    top,
    left,
    width: Math.max(right - left, 0),
    height: Math.max(bottom - top, 0),
  }
}

/** 遮罩坐标改成预览页内容的比例，含滚动，全屏时整条路径按新盒子重算 */
export function overlayPointsToPageRatios(points, overlayRect, pageEl) {
  const page = pageEl.getBoundingClientRect()
  const width = pageEl.scrollWidth || page.width || 1
  const height = pageEl.scrollHeight || page.height || 1
  return points.map((point) => ({
    x: (point.x + overlayRect.left - page.left + pageEl.scrollLeft) / width,
    y: (point.y + overlayRect.top - page.top + pageEl.scrollTop) / height,
  }))
}

/** 比例投回当前遮罩。页面挪了或变大，路径跟着走 */
export function pageRatiosToOverlay(ratios, pageEl, origin) {
  const page = pageEl.getBoundingClientRect()
  const width = pageEl.scrollWidth || page.width || 1
  const height = pageEl.scrollHeight || page.height || 1
  return ratios.map((point) => ({
    x: page.left + point.x * width - pageEl.scrollLeft - origin.left,
    y: page.top + point.y * height - pageEl.scrollTop - origin.top,
  }))
}
