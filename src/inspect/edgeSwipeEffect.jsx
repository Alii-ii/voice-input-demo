/**
 * 边缘划入时的圆形 toggle。它一直是 toggle，不跟选择遮罩耦合成一块。
 * 轮廓在 edgeMetaball。遮罩的透明度由调用方按进度单独画。
 */

import { edgeTogglePath } from './edgeMetaball.js'

/** 铺满时遮罩颜色不变，仍是原来的 42% 深色，没有背景模糊 */
export const MASK_SCRIM = 'rgba(18, 20, 24, 0.42)'

/** 其他入口的遮罩淡入 */
export const MASK_FADE_MS = 100

/**
 * 玻璃填在轮廓里面。不要再用铺满的 div 做背景，
 * backdrop-filter 的滤镜边界会在小山后面垫出一块方块。
 */
export function EdgeSwipeDrop({ side, x, y, progress, width, height }) {
  const d = edgeTogglePath({ side, x, y, progress, width, height })
  if (!d) return null
  return (
    <svg
      data-inspect-ui
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      width={width}
      height={height}
    >
      <path
        data-edge-toggle=""
        d={d}
        fill="rgba(255,255,255,0.6)"
        stroke="white"
        strokeWidth="1"
      />
    </svg>
  )
}
