/**
 * 底部输入框长按。时长由调用方传入，跟右侧点选按钮进单选的 PRESS_HOLD 同一档。
 * 成立前不 preventDefault，短按仍能聚焦、组词。
 */

export function createBarHold({ holdMs, allowed, onArm }) {
  let session = null

  const clear = () => {
    if (!session) return
    window.clearTimeout(session.timer)
    session = null
  }

  return {
    down(pointerId, x, y) {
      clear()
      if (!allowed()) return
      const next = { pointerId, x, y, armed: false, timer: 0 }
      next.timer = window.setTimeout(() => {
        if (session !== next) return
        if (!allowed()) {
          session = null
          return
        }
        next.armed = true
        onArm(next.pointerId, next.x, next.y)
      }, holdMs)
      session = next
    },
    move(pointerId, x, y) {
      if (!session || session.pointerId !== pointerId || session.armed) return
      session.x = x
      session.y = y
    },
    /** armed 已经开始听写，short 还没到时长，none 不是这根手指 */
    up(pointerId) {
      if (!session || session.pointerId !== pointerId) return 'none'
      const armed = session.armed
      window.clearTimeout(session.timer)
      session = null
      return armed ? 'armed' : 'short'
    },
    cancel() {
      clear()
    },
  }
}

/** 长按成立后打标，松手时输入框据此不要再打开键盘 */
export function markBarHold(armed) {
  const el = document.querySelector('[data-inspect-ime="bar"]')
  if (!(el instanceof HTMLElement)) return null
  if (armed) el.dataset.inspectHold = 'armed'
  else delete el.dataset.inspectHold
  return el
}
