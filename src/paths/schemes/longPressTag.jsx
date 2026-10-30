import AreaTag from '../followTag/AreaTag.jsx'

/** 只有长按点选按钮这条入口放行 */
export function longPressAllows(entry) {
  return entry === 'button-long-press'
}

/**
 * 读手指坐标。页面可直接传 x/y，也可传 { x, y }。
 * 坐标相对覆盖层，和选区徽标同一套定位。
 */
function readFinger(props) {
  const finger = props.point || props.position || props.finger
  const x = props.x ?? finger?.x
  const y = props.y ?? finger?.y
  return { x: Number(x), y: Number(y) }
}

/**
 * 跟随手指的纯 tag。不画选区遮罩。
 * 相对手指向左一颗 tag（26px），整块仍抬到接触点上方，指尖移动时跟着走。
 */
export function FollowTag(props) {
  const { x, y } = readFinger(props)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return (
    <div
      className="pointer-events-none absolute z-30"
      style={{
        left: x,
        top: y,
        // 先水平居中，再向左挪 26px（一颗 tag）。垂直仍抬到接触点上方 8px
        transform: 'translate(calc(-50% - 26px), calc(-100% - 8px))',
      }}
    >
      <AreaTag />
    </div>
  )
}

/** 松手后放进输入框的 tag。听写由页面接着走，这里不发请求 */
export function buildLongPressPrompt() {
  return { tag: '指定区域' }
}
