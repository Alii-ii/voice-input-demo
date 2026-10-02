import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn } from './cn.js'
import { MINIMAP_DEFAULTS } from './defaults.js'
import TurnHoverCard from './TurnHoverCard.jsx'

/**
 * ChatMinimap — 可直接带走的对话时间轴
 *
 * 开闭：行为封闭在本组件内；通过 props / CSS 变量扩展外观与尺寸。
 *
 * ## 必填
 *  - items: { id, userText?, assistantText?, title? }[]  —— 一轮一条
 *  - activeId: 当前 active 轮 id
 *  - onJump(id): 点击跳转
 *  - scrollerRef: 对话流滚动容器 ref（rail 上滚轮转发到它）
 *
 * ## 可选
 *  - visibleRange: [firstIndex, lastIndex] 视口内轮区间（多根高亮）
 *  - itemSize / hoverRow / dotLen / hoverMax / gap / pillWidth / lensRange / side
 *  - viewportHeight / viewportMinHeight
 *
 * ## CSS 变量（可选覆盖）
 *  --cm-panel  --cm-ink  --cm-muted  --cm-pill  --cm-pill-visible  --cm-pill-hover
 */
export default function ChatMinimap({
  items,
  activeId,
  visibleRange,
  onJump,
  scrollerRef,
  itemSize = MINIMAP_DEFAULTS.itemSize,
  hoverRow = MINIMAP_DEFAULTS.hoverRow,
  dotLen = MINIMAP_DEFAULTS.dotLen,
  hoverMax = MINIMAP_DEFAULTS.hoverMax,
  gap = MINIMAP_DEFAULTS.gap,
  pillWidth = MINIMAP_DEFAULTS.pillWidth,
  lensRange = MINIMAP_DEFAULTS.lensRange,
  side = MINIMAP_DEFAULTS.side,
  viewportHeight = MINIMAP_DEFAULTS.viewportHeight,
  viewportMinHeight = MINIMAP_DEFAULTS.viewportMinHeight,
  className,
}) {
  const railRef = useRef(null)
  const [pointerY, setPointerY] = useState(null)
  const [railH, setRailH] = useState(0)
  const rafRef = useRef(0)

  const restRow = itemSize + gap
  const peakRow = Math.max(restRow, hoverRow + gap)
  const peakLen = Math.max(dotLen, hoverMax)
  const PAD = 6
  const railW = Math.ceil(peakLen) + PAD * 2
  const isLeft = side === 'left'

  const activeIndex = useMemo(
    () => items.findIndex((it) => it.id === activeId),
    [items, activeId],
  )

  // 自洽布局：active 居中 + 鱼眼最高点对准光标（不动点迭代）
  const n = items.length
  const { heights, tops, offset, pointerRow } = useMemo(() => {
    const h = new Array(n)
    const t = new Array(n)
    const restCenter = activeIndex >= 0 ? activeIndex * restRow + restRow / 2 : 0
    if (pointerY == null || activeIndex < 0 || railH === 0) {
      for (let i = 0; i < n; i++) {
        t[i] = i * restRow
        h[i] = restRow
      }
      return { heights: h, tops: t, offset: railH / 2 - restCenter, pointerRow: null }
    }
    let pr = (pointerY - (railH / 2 - restCenter)) / restRow
    let off = railH / 2 - restCenter
    for (let iter = 0; iter < 4; iter++) {
      let acc = 0
      for (let i = 0; i < n; i++) {
        t[i] = acc
        const dist = Math.abs(i + 0.5 - pr)
        h[i] =
          dist >= lensRange
            ? restRow
            : restRow + (peakRow - restRow) * Math.cos((dist / lensRange) * Math.PI / 2)
        acc += h[i]
      }
      off = railH / 2 - (t[activeIndex] + h[activeIndex] / 2)
      const target = pointerY - off
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

  useLayoutEffect(() => {
    const el = railRef.current
    if (!el) return
    setRailH(el.clientHeight)
    const ro = new ResizeObserver(([e]) => setRailH(e.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  // 滚轮转发到对话流
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

  const lengthFor = (index) => {
    if (pointerRow == null) return dotLen
    const dist = Math.abs(index + 0.5 - pointerRow)
    if (dist >= lensRange) return dotLen
    return dotLen + (hoverMax - dotLen) * Math.cos((dist / lensRange) * Math.PI / 2)
  }

  const [vFirst, vLast] = visibleRange || [-1, -1]

  const hoverIdx =
    pointerRow == null || pointerRow < 0 || pointerRow >= n
      ? null
      : Math.min(n - 1, Math.max(0, Math.floor(pointerRow)))
  const hoverItem = hoverIdx != null ? items[hoverIdx] : null
  const cardTop =
    hoverIdx != null ? offset + tops[hoverIdx] + heights[hoverIdx] / 2 : 0

  return (
    <div
      className={cn(
        'absolute top-1/2 z-[5] max-h-full -translate-y-1/2',
        isLeft ? 'left-0' : 'right-0',
        className,
      )}
      style={{
        width: railW,
        height: viewportHeight,
        minHeight: viewportMinHeight,
      }}
    >
      <nav
        ref={railRef}
        className="relative h-full w-full overflow-hidden px-1.5"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        aria-label="对话导航"
      >
        {/* 上下面板色渐变遮罩 */}
        <span
          className="pointer-events-none absolute inset-x-0 top-0 z-[8] h-12 bg-gradient-to-b from-[var(--cm-panel,#fff)] to-transparent"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[8] h-12 bg-gradient-to-t from-[var(--cm-panel,#fff)] to-transparent"
          aria-hidden
        />

        <div
          className={cn(
            'absolute inset-x-1.5 top-0 flex flex-col will-change-transform transition-transform duration-[180ms] ease-out',
            isLeft ? 'items-start' : 'items-end',
          )}
          style={{ transform: `translateY(${offset}px)` }}
        >
          {items.map((it, i) => {
            const len = lengthFor(i)
            const isActive = i === activeIndex
            const isVisible = i >= vFirst && i <= vLast
            const isHover = i === hoverIdx
            return (
              <button
                key={it.id}
                type="button"
                className={cn(
                  'group flex w-full shrink-0 cursor-pointer items-center border-0 bg-transparent p-0',
                  isLeft ? 'justify-start' : 'justify-end',
                )}
                style={{ height: heights[i] }}
                onClick={() => onJump?.(it.id)}
                aria-current={isActive ? 'true' : undefined}
                data-index={i}
              >
                <span
                  className={cn(
                    'rounded-full transition-[width,background] duration-100 ease-out motion-reduce:transition-none',
                    isHover
                      ? 'bg-[var(--cm-pill-hover,#1c1c1e)]'
                      : isVisible
                        ? 'bg-[var(--cm-pill-visible,#9a9aa0)]'
                        : 'bg-[var(--cm-pill,#d9d9de)] group-hover:bg-[var(--cm-pill-hover,#1c1c1e)]',
                  )}
                  style={{ width: len, height: pillWidth }}
                />
              </button>
            )
          })}
        </div>
      </nav>

      {hoverItem && (
        <div
          className={cn(
            'absolute top-0 z-20',
            isLeft ? 'left-full ml-2' : 'right-full mr-2',
          )}
          style={{ transform: `translateY(${cardTop}px) translateY(-50%)` }}
        >
          <TurnHoverCard
            userText={hoverItem.userText}
            assistantText={hoverItem.assistantText}
          />
        </div>
      )}
    </div>
  )
}
