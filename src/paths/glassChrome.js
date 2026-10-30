/**
 * 预览页悬浮玻璃，顶部五个按钮、底部全屏钮、输入胶囊、点选钮共用这一串。
 * 白描边 + #fff 60% + 模糊，再把饱和拉高，贴在浅色预览上仍能分开。
 * 轻投影留在各控件自己的 shadow 上，点选激活态才能换成蓝影。
 * 状态栏和输入框里的深色麦克风 / 停止圆钮不要用这套。
 */
export const INSPECT_GLASS_CLASS =
  'border border-white bg-white/60 backdrop-blur-xl backdrop-saturate-[1.6]'
