/** ChatMinimap 默认尺寸参数（可整包覆盖） */
export const MINIMAP_DEFAULTS = {
  itemSize: 8, // 静息行距（密度）
  hoverRow: 12, // hover 峰值行距
  dotLen: 6, // 静息轴长
  hoverMax: 22, // hover 峰值轴长
  gap: 0,
  pillWidth: 2, // 轴粗细
  lensRange: 3, // hover 影响半径（行）
  side: 'left', // 'left' | 'right'
  viewportHeight: '60vh', // 可见窗口高度
  viewportMinHeight: 360, // 可见窗口最小高度 (px)
}

/**
 * 按峰值轴长估算内容区一侧预留宽度，避免气泡压在 rail 下
 * @param {{ dotLen?: number, hoverMax?: number }} [opts]
 */
export function getRailReserve({
  dotLen = MINIMAP_DEFAULTS.dotLen,
  hoverMax = MINIMAP_DEFAULTS.hoverMax,
} = {}) {
  return Math.ceil(Math.max(dotLen, hoverMax)) + 12 + 16
}
