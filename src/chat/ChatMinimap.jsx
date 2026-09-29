import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

/**
 * ChatMinimap（fork + 魔改：居中胶片式）
 *
 * 核心规则：
 *  1. 一条轴 = 一轮对话（items 由上层按「轮」传入，不区分 user / assistant）
 *  2. marker 保持真实尺寸（固定密度，不压缩）——rail 总长可远超视口
 *  3. 无论轴多轴少，当前 active 的 marker 恒定钉在面板垂直中线
 *  4. rail 像一条胶片：随 active 变化平移，把 active 拉回中线
 *  5. 滚轮只作用于对话流；rail 不被滚轮直接滚动
 *  6. hover 鱼眼（双向）：指针最近的 marker 最长（→ hoverMax）且行距最大（→ hoverRow），
 *     按距离余弦递减回静息（dotLen / itemSize）——像 macOS dock 的凸起
 *  7. hover 区域实时跟随：存指针「像素 Y」而非行号，随 offset 每帧重算行号，
 *     点击平滑滚动时凸起始终贴着光标下方的屏幕位置，不僵死
 *  8. 高亮可多根：凡出现在当前视口的轮次都高亮（active 最强），勾出当前窗口覆盖区间
 *
 * 尺寸解耦（都可配置）：
 *  - itemSize：静息行距（垂直密度，配合 gap）
 *  - hoverRow：hover 峰值行距（指针正下方那根占的行高，默认 itemSize+4）
 *  - dotLen  ：静息轴长；hoverMax：hover 峰值轴长
 *  - lensRange：hover 影响半径（离指针多少行以内会被放大）
 */
export default function ChatMinimap({
  items,
  activeId,
  visibleRange, // [firstIndex, lastIndex]，视口内的轮索引区间（多根高亮 + band）
  onJump,
  scrollerRef, // 对话流滚动容器：rail 上的滚轮转发到它
  itemSize = 8, // 静息行距（密度）
  hoverRow = 12, // hover 峰值行距（默认 itemSize + 4）
  dotLen = 6, // 静息轴长
  hoverMax = 22, // hover 峰值轴长
  gap = 0,
  pillWidth = 2, // 轴粗细
  lensRange = 3,
  side = 'left',
}) {
  const railRef = useRef(null)
  const [pointerY, setPointerY] = useState(null) // 指针相对 rail 顶的像素位置（存像素，滚动时实时换算行号）
  const [railH, setRailH] = useState(0)
  const rafRef = useRef(0)

  const restRow = itemSize + gap
  const peakRow = Math.max(restRow, hoverRow + gap)
  const peakLen = Math.max(dotLen, hoverMax)
  const PAD = 6 // rail 左右内边距
  const railW = Math.ceil(peakLen) + PAD * 2 // 预留峰值宽度，峰值 pill 不被 overflow 裁掉

  const activeIndex = useMemo(
    () => items.findIndex((it) => it.id === activeId),
    [items, activeId],
  )

  // 自洽布局：同时满足两条约束——
  //   (a) active marker 恒居中线（offset 由可变行高的累计位置反推）
  //   (b) 光标正下方那根就是鱼眼最高点（可点中）——pointerRow 取「渲染布局里光标命中的那根」
  // 行高 ↔ offset ↔ 命中行 互相影响，用不动点迭代收敛（3~4 次足够）。
  const n = items.length
  const { heights, tops, offset, pointerRow } = useMemo(() => {
    const h = new Array(n)
    const t = new Array(n)
    const restCenter = activeIndex >= 0 ? activeIndex * restRow + restRow / 2 : 0
    // 静息 / 无 hover：等距铺满，active 居中
    if (pointerY == null || activeIndex < 0 || railH === 0) {
      for (let i = 0; i < n; i++) {
        t[i] = i * restRow
        h[i] = restRow
      }
      return { heights: h, tops: t, offset: railH / 2 - restCenter, pointerRow: null }
    }
    let pr = (pointerY - (railH / 2 - restCenter)) / restRow // 首猜：按静息布局命中
    let off = railH / 2 - restCenter
    for (let iter = 0; iter < 4; iter++) {
      let acc = 0
      for (let i = 0; i < n; i++) {
        t[i] = acc
        const dist = Math.abs(i + 0.5 - pr)
        h[i] = dist >= lensRange ? restRow : restRow + (peakRow - restRow) * Math.cos((dist / lensRange) * Math.PI / 2)
        acc += h[i]
      }
      off = railH / 2 - (t[activeIndex] + h[activeIndex] / 2) // 让 active 居中
      // 反查：当前渲染布局里光标（pointerY）落在哪根 → 更新 pr，使最高点对准光标
      const target = pointerY - off // 光标在轨道坐标里的位置
      if (target <= 0) pr = target / restRow
      else if (target >= acc) pr = n - 0.5 + (target - acc) / restRow
      else {
        let lo = 0
        let hi = n - 1
        while (lo < hi) {
          const mid = (lo + hi) >> 1
          if (t[mid] + h[mid] <= target) lo = mid + 1
          else hi = mid
        }
        pr = lo + (target - t[lo]) / h[lo]
      }
    }
    return { heights: h, tops: t, offset: off, pointerRow: pr }
  }, [n, pointerY, activeIndex, railH, restRow, peakRow, lensRange])

  // 测量 rail 视口高度
  useLayoutEffect(() => {
    const el = railRef.current
    if (!el) return
    setRailH(el.clientHeight)
    const ro = new ResizeObserver(([e]) => setRailH(e.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // —— 指针：只存像素 Y，行号在 render 里按当前 offsetRest 实时换算 ——
  const onPointerMove = useCallback((e) => {
    const el = railRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top
    const y = e.clientY - top
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => setPointerY(y))
  }, [])
  const onPointerLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setPointerY(null)
  }, [])
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // —— 滚轮转发：rail 上滚动只作用于对话流，rail 自身不独立滚动 ——
  useEffect(() => {
    const el = railRef.current
    if (!el) return
    const onWheel = (e) => {
      const sc = scrollerRef?.current
      if (!sc) return
      e.preventDefault()
      sc.scrollTop += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [scrollerRef])

  // 轴长鱼眼：dotLen → hoverMax，余弦 falloff（与行高共用 pointerRow，最高点对准光标）
  const lengthFor = (index) => {
    if (pointerRow == null) return dotLen
    const dist = Math.abs(index + 0.5 - pointerRow)
    if (dist >= lensRange) return dotLen
    return dotLen + (hoverMax - dotLen) * Math.cos((dist / lensRange) * Math.PI / 2)
  }

  const [vFirst, vLast] = visibleRange || [-1, -1]
  const bandTop = vFirst >= 0 ? tops[vFirst] : 0
  const bandH = vFirst >= 0 ? tops[vLast] + heights[vLast] - tops[vFirst] : 0

  return (
    <nav
      ref={railRef}
      className={`cm-rail cm-rail--${side}`}
      style={{ width: railW, ['--cm-pad']: `${PAD}px` }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      aria-label="对话导航"
    >
      {/* 中线：active marker 恒定停靠的位置 */}
      <span className="cm-centerline" aria-hidden />

      <div className="cm-track" style={{ transform: `translateY(${offset}px)` }}>
        {vFirst >= 0 && (
          <span className="cm-window" style={{ top: bandTop, height: bandH }} aria-hidden />
        )}

        {items.map((it, i) => {
          const len = lengthFor(i)
          const isActive = i === activeIndex
          const isVisible = i >= vFirst && i <= vLast
          return (
            <button
              key={it.id}
              type="button"
              className={`cm-item ${isActive ? 'is-active' : ''} ${isVisible ? 'is-visible' : ''}`}
              style={{ height: heights[i] }}
              onClick={() => onJump?.(it.id)}
              title={it.title}
              aria-current={isActive ? 'true' : undefined}
              data-index={i}
            >
              <span className="cm-pill" style={{ width: len, height: pillWidth }} />
            </button>
          )
        })}
      </div>
    </nav>
  )
}
