import { useEffect, useRef } from 'react'
import { freePathD } from './freeSelectPath.js'

/** 点距按先前的两倍拉开，密度大约减半；半径仍够在日期胶囊里看见淡灰点 */
const DOT_GAP = 14
const DOT_R = 1.15
/** 选区没有可用圆角时的兜底，不用 0，也不改成大圆角 */
const MASK_RADIUS = 2
/** 呼吸一轮的时长。不跟亮带周期绑在一起，也不要被亮带提速带跑 */
const BREATH_MS = 2400
/** 进度结束后整块遮罩淡出的时长，不跟亮带周期绑在一起 */
export const LOADING_FADE_MS = 50
/** 静止点大约 rgba(0,0,0,0.16)。亮带要在透明度上抬起来，只把半径加 0.35px 几乎看不出来 */
const DOT_ALPHA = 0.16
/** 亮带额外的透明度。峰值大约 0.38，扫走后回到 0.16 */
const BAND_ALPHA = 0.22
/** 45° 之后相邻点在对角线上大约隔 0.08，带太窄会从点缝里漏过去，看起来像没在动 */
const BAND_SIGMA = 0.07

/** 元素自己的圆角优先；0 或缺失时用 2px */
function maskRadius(rx) {
  return rx > 0 ? rx : MASK_RADIUS
}

/** 路径改成形状盒子内的坐标，clip-path 才跟这块白底重合，而不是整页 */
function localPathD(points, left, top) {
  return freePathD(points.map((point) => ({ x: point.x - left, y: point.y - top })))
}

/** 原先亮带用整轮 runMs 从左上走到右下。现在只把这一段收到大约 1/4，走完再循环 */
function sweepMs(runMs) {
  return runMs / 4
}

function dotProgress(startedAt, now, runMs) {
  if (!startedAt || !runMs) return 0
  const sweep = sweepMs(runMs)
  const elapsed = Math.max(0, now - startedAt)
  return (elapsed % sweep) / sweep
}

/** 在 1 和 1.01 之间平滑来回，不到 1，也不超过 1.01 */
function breathScale(startedAt, now) {
  if (!startedAt) return 1
  const phase = (Math.max(0, now - startedAt) % BREATH_MS) / BREATH_MS
  // (1 - cos) 最大是 2，所以系数用 0.005，峰值才是 1.01
  return 1 + 0.005 * (1 - Math.cos(phase * Math.PI * 2))
}

function maskOpacity(startedAt, now, runMs) {
  if (!startedAt || !runMs) return 1
  const elapsed = now - startedAt
  if (elapsed <= runMs) return 1
  return Math.max(0, 1 - (elapsed - runMs) / LOADING_FADE_MS)
}

/** 点阵绕中心转 45°，相邻点中心距仍是 DOT_GAP。只转点，不转遮罩外框。亮带仍从左上走向右下 */
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
  // 45° 的两根轴，长度都是点距，所以旋转后相邻中心距仍约 14px
  const axis = DOT_GAP * Math.SQRT1_2
  const ux = axis
  const uy = axis
  const vx = -axis
  const vy = axis
  const originX = cssW / 2
  const originY = cssH / 2
  const n = Math.ceil(Math.hypot(cssW, cssH) / DOT_GAP) + 1
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const x = originX + i * ux + j * vx
      const y = originY + i * uy + j * vy
      if (x < -2 || y < -2 || x > cssW + 2 || y > cssH + 2) continue
      const along = (x / cssW + y / cssH) / 2
      let delta = along - t
      // 循环时把亮带从尽头接回起点，避免跳一下
      if (delta > 0.5) delta -= 1
      if (delta < -0.5) delta += 1
      const wave = Math.exp(-(delta * delta) / (2 * BAND_SIGMA * BAND_SIGMA))
      ctx.beginPath()
      ctx.fillStyle = `rgba(0,0,0,${(DOT_ALPHA + wave * BAND_ALPHA).toFixed(3)})`
      ctx.arc(x, y, DOT_R + wave * 0.45, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/**
 * 已发出选区上的流动点阵。
 * 背景是白 80%（bg-white/80）加 backdrop-blur。
 * 点阵 45°，点距 14px，静止点大约 rgba(0,0,0,0.16)，亮带把经过的点变深再恢复。扫过时长大约是原来整轮 runMs 的 1/4。
 * 淡灰 0.5px 描边沿元素圆角或自由路径走。元素框用大柔影，自由路径用等价 drop-shadow。
 * 生成进行时整体在 scale(1) 和 scale(1.01) 之间呼吸。进度结束后再用 50ms 把整块淡出，亮带一起停。
 * 自由形状仍用闭合路径裁切，不改成圆角矩形；容器只在没有路径时才吃圆角。
 */
export function SelectionLoading({ frames, runMs }) {
  const canvasRefs = useRef(new Map())
  const frameRefs = useRef(new Map())

  useEffect(() => {
    if (!frames.length) return undefined
    let raf = 0
    const tick = () => {
      const now = performance.now()
      for (const frame of frames) {
        const progress = dotProgress(frame.startedAt, now, runMs)
        const canvas = canvasRefs.current.get(frame.key)
        if (canvas) paintDots(canvas, progress)
        const node = frameRefs.current.get(frame.key)
        if (!node) continue
        const scale = breathScale(frame.startedAt, now)
        const opacity = maskOpacity(frame.startedAt, now, runMs)
        node.style.transform = `scale(${scale})`
        node.style.opacity = String(opacity)
        node.dataset.dotT = progress.toFixed(4)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [frames, runMs])

  if (!frames.length) return null
  return (
    <div
      className="pointer-events-none absolute inset-0"
      data-inspect-loading=""
      data-sweep-ms={runMs ? sweepMs(runMs) : 0}
      data-sweep-origin-ms={runMs || 0}
    >
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
          <div
            key={frame.key}
            ref={(node) => {
              if (node) frameRefs.current.set(frame.key, node)
              else frameRefs.current.delete(frame.key)
            }}
            data-inspect-loading-frame=""
            className="pointer-events-none absolute origin-center rounded-[2px]"
            style={box}
          >
            {d ? (
              <ShapeShadow d={d} width={width} height={height} filterId={`inspect-loading-shadow-${frame.key}`} />
            ) : (
              <div
                aria-hidden="true"
                data-inspect-loading-shadow=""
                className="pointer-events-none absolute inset-0 shadow-[0_1px_24px_0_rgb(0_0_0/0.06)]"
                style={{ borderRadius: radius }}
              />
            )}
            <div
              data-inspect-loading-shape=""
              data-free-path={d ? '' : undefined}
              className="absolute inset-0 overflow-hidden border-0 bg-white/80 backdrop-blur-md"
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
            <ShapeStroke d={d} width={width} height={height} rx={radius} />
          </div>
        )
      })}
    </div>
  )
}

/** 自由路径的大柔影，跟着闭合路径。只留阴影，避免 CSS filter 包住 backdrop-blur。
 *  等价于 drop-shadow(0 1px 24px rgba(0,0,0,0.06))：CSS 模糊 24 约等于 stdDeviation 12。
 */
function ShapeShadow({ d, width, height, filterId }) {
  const pad = 48
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible" width={width} height={height}>
      <defs>
        <filter
          id={filterId}
          x={-pad}
          y={-pad}
          width={width + pad * 2}
          height={height + pad * 2}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="12" result="blur" />
          <feOffset in="blur" dx="0" dy="1" result="off" />
          <feFlood floodColor="#000000" floodOpacity="0.06" result="color" />
          <feComposite in="color" in2="off" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
          </feMerge>
        </filter>
      </defs>
      <path d={d} fill="#000" filter={`url(#${filterId})`} />
    </svg>
  )
}

/** 0.5px 淡灰描边。元素框沿圆角，自由形状沿闭合路径，不退成外接矩形 */
function ShapeStroke({ d, width, height, rx }) {
  return (
    <svg
      aria-hidden="true"
      data-inspect-loading-stroke=""
      className="pointer-events-none absolute inset-0 overflow-visible"
      width={width}
      height={height}
    >
      {d ? (
        <path d={d} className="fill-none stroke-black/8 stroke-[0.5px]" />
      ) : (
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          rx={rx}
          ry={rx}
          className="fill-none stroke-black/8 stroke-[0.5px]"
        />
      )}
    </svg>
  )
}
