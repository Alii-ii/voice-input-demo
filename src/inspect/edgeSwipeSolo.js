/** 从手机框左缘或右缘向内划，接上现有的单选听写。判定放在这里，不写进组件。 */

/** 相对手机框（data-fs-phase）左右边的边缘带 */
export const EDGE_BAND_PX = 24

/** 向内划过这么多才算划入，轻点边缘不算 */
export const EDGE_ENTER_PX = 24

/** 起点落在左带或右带里才返回方向，否则是 null */
export function edgeBandSide(x, y, frame) {
  if (!frame) return null
  if (y < frame.top || y > frame.bottom) return null
  if (x < frame.left || x > frame.right) return null
  if (x - frame.left <= EDGE_BAND_PX) return 'left'
  if (frame.right - x <= EDGE_BAND_PX) return 'right'
  return null
}

/** 向内已经走出的距离。左缘看 x 增大，右缘看 x 减小 */
export function inwardPx(side, originX, x) {
  if (side === 'left') return Math.max(0, x - originX)
  if (side === 'right') return Math.max(0, originX - x)
  return 0
}

/** 左缘看 x 增大，右缘看 x 减小。没超过阈值就是还在边缘上点 */
export function movedInward(side, originX, x) {
  return inwardPx(side, originX, x) > EDGE_ENTER_PX
}

/** 位移 / 阈值，夹在 0 和 1。判定仍要超过阈值，这里只给动效用 */
export function edgeProgress(inward) {
  if (!Number.isFinite(inward) || inward <= 0) return 0
  return Math.min(1, inward / EDGE_ENTER_PX)
}

/**
 * 单指会话。成立前不要求调用方 preventDefault。
 * move 返回 true 表示这一下刚刚划入，调用方这时才拦住默认行为。
 */
export function createEdgeSwipe({ allowed, inPage, onArm, onPreview, onDismiss }) {
  let session = null

  const clear = () => {
    session = null
  }

  const preview = (x, y) => {
    if (!session) return
    const inward = inwardPx(session.side, session.originX, x)
    onPreview?.({
      side: session.side,
      x,
      y,
      inward,
      progress: edgeProgress(inward),
    })
  }

  return {
    down(pointerId, x, y, side) {
      clear()
      if (!side || !allowed()) return
      session = { pointerId, originX: x, originY: y, side, armed: false }
    },
    move(pointerId, x, y) {
      if (!session || session.pointerId !== pointerId) return false
      // 已经进了单选就交给原来的跟手，不要再次触发
      if (session.armed) return false
      if (!allowed()) {
        clear()
        onDismiss?.()
        return false
      }
      preview(x, y)
      if (!movedInward(session.side, session.originX, x)) return false
      // 还没进预览页就只继续看，不进单选
      if (!inPage(x, y)) return false
      session.armed = true
      onArm(x, y)
      return true
    },
    /** armed 已经进了单选，idle 只是边缘上的轻点，none 不是这根手指 */
    up(pointerId) {
      if (!session || session.pointerId !== pointerId) return 'none'
      const armed = session.armed
      clear()
      if (!armed) onDismiss?.()
      return armed ? 'armed' : 'idle'
    },
    cancel() {
      if (!session) return
      const armed = session.armed
      clear()
      if (!armed) onDismiss?.()
    },
  }
}
