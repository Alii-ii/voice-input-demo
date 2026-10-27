function hitsPhone(x, y) {
  const phone = document.querySelector('[data-fs-phase]')
  if (!phone) return true
  const el = document.elementFromPoint(x, y)
  return !!el && (el === phone || phone.contains(el))
}

/**
 * 指针 client 坐标对齐到 getBoundingClientRect / elementFromPoint。
 * 壳子已经用 visualViewport 的 offsetTop 和 height 贴在可视区上，
 * 现代浏览器里 client 与 rect 是同一套，不能再加一遍偏移。
 * 只有地址栏把两套坐标拆开、直接命中落到壳子外时，才试着补上或减去这段差。
 */
export function viewportPoint(clientX, clientY) {
  const vv = window.visualViewport
  if (!vv || (Math.abs(vv.offsetTop) < 0.5 && Math.abs(vv.offsetLeft) < 0.5)) {
    return { x: clientX, y: clientY }
  }
  const options = [
    { x: clientX, y: clientY },
    { x: clientX + vv.offsetLeft, y: clientY + vv.offsetTop },
    { x: clientX - vv.offsetLeft, y: clientY - vv.offsetTop },
  ]
  return options.find((point) => hitsPhone(point.x, point.y)) || options[0]
}
