import { cn } from '../../lib/cn.js'

/**
 * 附图是 14px 的白色圆角，黑底只是截图底，不进产品。
 * 外弧半径 8、线宽 2，和选框圆角用同一个数，角标外沿贴住选框、不溢出。
 */
export const CORNER_RADIUS = 8

const MARK_SIZE = 14
const STROKE = 2
const INNER_RADIUS = CORNER_RADIUS - STROKE

/**
 * 左上角一份。外弧圆心在 (8, 8)，从左边收到上边。
 * 用填充带代替描边，避免线宽画出 14px 盒子。
 */
function CornerMark({ className }) {
  return (
    <svg
      width={MARK_SIZE}
      height={MARK_SIZE}
      viewBox={`0 0 ${MARK_SIZE} ${MARK_SIZE}`}
      aria-hidden="true"
      className={cn('pointer-events-none absolute origin-center', className)}
    >
      <path
        className="fill-white"
        d={`M0 ${MARK_SIZE}V${CORNER_RADIUS}A${CORNER_RADIUS} ${CORNER_RADIUS} 0 0 1 ${CORNER_RADIUS} 0H${MARK_SIZE}V${STROKE}H${CORNER_RADIUS}A${INNER_RADIUS} ${INNER_RADIUS} 0 0 0 ${STROKE} ${CORNER_RADIUS}V${MARK_SIZE}H0Z`}
      />
    </svg>
  )
}

/** 四角各一份，由左上角标转到对应角 */
const PLACEMENTS = [
  'left-0 top-0',
  'right-0 top-0 rotate-90',
  'bottom-0 right-0 rotate-180',
  'bottom-0 left-0 -rotate-90',
]

export function CornerBracket({ className }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0', className)}>
      {PLACEMENTS.map((place) => (
        <CornerMark key={place} className={place} />
      ))}
    </div>
  )
}
