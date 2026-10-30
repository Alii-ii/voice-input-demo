/** 两指连线中点，当作原来单指按下的那个坐标 */
export function fingerMidpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** 只看这一个点是否落在系统按钮上，不看每根手指自己压在哪 */
export function pointOnInspectChrome(x, y) {
  const el = document.elementFromPoint(x, y)
  return el instanceof Element && !!el.closest('[data-inspect-chrome]')
}

/**
 * 恰好两指、且都在手机框内时，中点落在页面上又不在系统按钮上才返回中点。
 * 少一指、多一指、提前松手、中点离开页面或压到按钮，都返回 null。
 */
export function resolveTwoFingerPoint(fingers, { inPhone, inPage, onChrome }) {
  if (!fingers || fingers.length !== 2) return null
  const [a, b] = fingers
  if (!inPhone(a.x, a.y) || !inPhone(b.x, b.y)) return null
  const mid = fingerMidpoint(a, b)
  if (!inPage(mid.x, mid.y)) return null
  if (onChrome(mid.x, mid.y)) return null
  return mid
}
