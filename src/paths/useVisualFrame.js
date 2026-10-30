import { useEffect, useState } from 'react'

function readVisualFrame() {
  const vv = window.visualViewport
  if (!vv) {
    return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }
  }
  return {
    top: vv.offsetTop,
    left: vv.offsetLeft,
    width: vv.width,
    height: vv.height,
  }
}

/**
 * 手机壳跟可视区走，而不是 layout 视口。
 * 地址栏展开时 100vh / fixed inset 会把底栏画到看不见的地方。
 * 桌面不订阅，拖窗口不会多一次更新。
 */
export function useVisualFrame(enabled) {
  const [frame, setFrame] = useState(readVisualFrame)

  useEffect(() => {
    if (!enabled) return undefined
    const apply = () => {
      const next = readVisualFrame()
      setFrame((prev) =>
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.height === next.height
          ? prev
          : next,
      )
    }
    apply()
    const vv = window.visualViewport
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    return () => {
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
    }
  }, [enabled])

  return frame
}
