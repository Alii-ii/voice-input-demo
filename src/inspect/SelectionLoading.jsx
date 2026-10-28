import { useEffect, useRef } from 'react'
import { freePathD } from './freeSelectPath.js'

/** 点距按先前的两倍拉开，密度大约减半；半径仍够在日期胶囊里看见淡灰点 */
const DOT_GAP = 14
const DOT_R = 1.15
/** 选区没有可用圆角时的兜底，不用 0，也不改成大圆角 */
const MASK_RADIUS = 2

/** 元素自己的圆角优先；0 或缺失时用 2px */
function maskRadius(rx) {
  return rx > 0 ? rx : MASK_RADIUS
}

/** 路径改成形状盒子内的坐标，clip-path 才跟这块白底重合，而不是整页 */
function localPathD(points, left, top) {
  return freePathD(points.map((point) => ({ x: point.x - left, y: point.y - top })))
}

/** 亮带中心跟着这一轮进度走。进度 0 在左上，进度 1 走到右下。点是淡灰，不铺纯白 */
function paintDots(canvas, progress) {
  const cssW = canvas.clientWidth
  const cssH = canvas.clientHeight
  if (cssW < 1 || cssH < 1) return
  const dpr = window.devicePixelRatio || 1
  const bitmapW = Math.max(1, Math.round(cssW * dpr))
  const bitmapH = Math.max(1, Math.round(cssH * dpr))
  if (canvas.width !== bitmapW || canvas.height !== bitmapH) {
    canvas.width = bitmapW
    canvas.height = bitmapH
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssW, cssH)
  const t = Math.min(1, Math.max(0, progress))
  for (let y = DOT_GAP / 2; y < cssH; y += DOT_GAP) {
    for (let x = DOT_GAP / 2; x < cssW; x += DOT_GAP) {
      const along = (x / cssW + y / cssH) / 2
      const delta = along - t
      const wave = Math.exp(-(delta * delta) / (2 * 0.045 * 0.045))
      // 大约 rgba(0,0,0,0.28)，亮带只加减透明度，颜色不变成白
      const alpha = 0.16 + wave * 0.2
      ctx.beginPath()
      ctx.fillStyle = `rgba(0,0,0,${alpha.toFixed(3)})`
      ctx.arc(x, y, DOT_R + wave * 0.35, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/**
 * 已发出选区上的流动点阵。
 * 背景是白 90%（bg-white/90）加 backdrop-blur，淡灰点的亮带跟这一轮 startedAt 走，不另开结束计时。
 * 不描边。元素有圆角就跟着走，没有则 2px 兜底。
 * 投影单独画在模糊层后面：父级若用 CSS filter，子级 backdrop-blur 就模糊不到页面。
 * 自由形状仍用闭合路径裁切，不改成圆角矩形；容器只在没有路径时才吃圆角。
 */
export function SelectionLoading({ frames, runMs }) {
  const canvasRefs = useRef(new Map())

  useEffect(() => {
    if (!frames.length) return undefined
    let raf = 0
    const tick = () => {
      const now = performance.now()
      for (const frame of frames) {
        const canvas = canvasRefs.current.get(frame.key)
        if (!canvas) continue
        const progress =
          frame.startedAt && runMs ? Math.min(1, Math.max(0, (now - frame.startedAt) / runMs)) : 0
        paintDots(canvas, progress)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [frames, runMs])

  if (!frames.length) return null
  return (
    <div className="pointer-events-none absolute inset-0" data-inspect-loading="">
      {frames.map((frame) => {
        const width = Math.max(frame.width, 0)
        const height = Math.max(frame.height, 0)
        if (width < 1 || height < 1) return null
        const d = frame.path?.length ? localPathD(frame.path, frame.left, frame.top) : ''
        // 自由路径不套圆角矩形；元素框没有圆角时才用 2px
        const radius = d ? 0 : maskRadius(frame.rx)
        const box = {
          left: frame.left,
          top: frame.top,
          width,
          height,
        }
        return (
          <div key={frame.key} className="pointer-events-none absolute rounded-[2px]" style={box}>
            <ShapeShadow d={d} width={width} height={height} rx={radius} filterId={`inspect-loading-shadow-${frame.key}`} />
            <div
              data-inspect-loading-shape=""
              data-free-path={d ? '' : undefined}
              className="absolute inset-0 overflow-hidden border-0 bg-white/90 backdrop-blur-md"
              style={{
                borderRadius: d ? undefined : radius,
                clipPath: d ? `path('${d}')` : undefined,
                WebkitClipPath: d ? `path('${d}')` : undefined,
              }}
            >
              <canvas
                ref={(node) => {
                  if (node) canvasRefs.current.set(frame.key, node)
                  else canvasRefs.current.delete(frame.key)
                }}
                aria-hidden="true"
                className="pointer-events-none block h-full w-full"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** 形状本身不画出来，只留一圈轻微投影，避免挡在模糊层前面 */
function ShapeShadow({ d, width, height, rx, filterId }) {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible" width={width} height={height}>
      <defs>
        <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="blur" />
          <feOffset in="blur" dy="1" result="off" />
          <feFlood floodColor="#000000" floodOpacity="0.16" result="color" />
          <feComposite in="color" in2="off" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
          </feMerge>
        </filter>
      </defs>
      {d ? (
        <path d={d} fill="#000" filter={`url(#${filterId})`} />
      ) : (
        <rect x="0" y="0" width={width} height={height} rx={rx} ry={rx} fill="#000" filter={`url(#${filterId})`} />
      )}
    </svg>
  )
}

