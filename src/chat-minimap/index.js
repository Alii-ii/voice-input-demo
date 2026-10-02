/**
 * chat-minimap — 可直接带走的对话时间轴组件包
 *
 * 依赖：react、clsx、Tailwind（utility 类）
 * 拷贝本目录即可接入；用 CSS 变量覆盖颜色，用 props 覆盖尺寸。
 */
export { default as ChatMinimap } from './ChatMinimap.jsx'
export { default } from './ChatMinimap.jsx'
export { MINIMAP_DEFAULTS, getRailReserve } from './defaults.js'
export { buildTurnItems, turnIndexOfMessage } from './buildTurnItems.js'
export { useMinimapScrollSpy } from './useMinimapScrollSpy.js'
