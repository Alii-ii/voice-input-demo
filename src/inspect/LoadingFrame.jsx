import { useEffect, useRef } from 'react'

/**
 * 已发出选区的 loading 框。
 * 底下一道灰线留住轮廓，亮段按这一轮生成的进度沿路径走。
 * 不铺底色。进度由调用方用正在跑的那一条的 startedAt 算，这里不另开结束计时。
 */
export function LoadingFrames({ shapes, runMs, width, height }) {
  const glowRefs = useRef(new Map())

  useEffect(() => {
    if (!shapes.length) return undefined
    let raf = 0
    const paint = () => {
      const now = performance.now()
      for (const shape of shapes) {
        const node = glowRefs.current.get(shape.key)
        if (!node || typeof node.getTotalLength !== 'function') continue
        const len = node.getTotalLength()
        if (!len) continue
        const progress =
          shape.startedAt && runMs ? Math.min(1, Math.max(0, (now - shape.startedAt) / runMs)) : 0
        const win = Math.max(len * 0.35, 12)
        node.setAttribute('stroke-dasharray', `${win} ${len}`)
        node.setAttribute('stroke-dashoffset', String((1 - progress) * len))
      }
      raf = requestAnimationFrame(paint)
      return
    }
    raf = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(raf)
  }, [shapes, runMs])

  if (!shapes.length || !width || !height) return null
  return (
    <svg
      data-inspect-loading=""
      aria-hidden="true"
      width={width}
      height={height}
      className="pointer-events-none absolute left-0 top-0 z-30 overflow-visible"
      style={{ width, height }}
    >
      {shapes.map((shape) => {
        const bind = (node) => {
          if (node) glowRefs.current.set(shape.key, node)
          else glowRefs.current.delete(shape.key)
        }
        if (shape.path?.length) {
          const d = shape.d
          return (
            <g key={shape.key} data-inspect-loading-frame="">
              <path d={d} className="fill-none stroke-[#b1b1b6]" strokeWidth="0.5" />
              <path ref={bind} d={d} className="fill-none stroke-white" strokeWidth="1.25" />
            </g>
          )
        }
        const w = Math.max(shape.width, 0)
        const h = Math.max(shape.height, 0)
        return (
          <g key={shape.key} data-inspect-loading-frame="">
            <rect
              x={shape.left}
              y={shape.top}
              width={w}
              height={h}
              rx={shape.rx}
              ry={shape.rx}
              className="fill-none stroke-[#b1b1b6]"
              strokeWidth="0.5"
            />
            <rect
              ref={bind}
              x={shape.left}
              y={shape.top}
              width={w}
              height={h}
              rx={shape.rx}
              ry={shape.rx}
              className="fill-none stroke-white"
              strokeWidth="1.25"
            />
          </g>
        )
      })}
    </svg>
  )
}
