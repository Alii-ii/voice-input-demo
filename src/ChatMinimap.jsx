/**
 * ChatMinimap — 单文件可带走的对话时间轴
 *
 * 依赖：react、Tailwind。复制本文件即可。主题色可用 --cm-* 覆盖。
 *
 * 导出：ChatMinimap（default）、useMinimapScrollSpy、buildTurnItems、
 *       getRailReserve、MINIMAP_DEFAULTS、turnIndexOfMessage
 *
 * 用法：
 *   const turns = useMemo(() => buildTurnItems(messages), [messages])
 *   const spy = useMinimapScrollSpy({ messages, turns })
 *   // 父容器 relative；消息节点 data-id + spy.registerItem(id)
 *   <ChatMinimap items={turns} activeId={spy.activeTurnId} visibleRange={spy.turnRange}
 *     onJump={spy.jumpTo} scrollerRef={spy.scrollerRef} />
 *
 * CSS：--cm-panel --cm-ink --cm-muted --cm-pill --cm-pill-visible --cm-pill-hover
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const cn = (...a) => a.filter(Boolean).join(' ')

/** 鱼眼权值：距焦点 `dist` 行、半径 `range` → [0,1] */
const falloff = (dist, range) =>
  dist >= range ? 0 : Math.cos((dist / range) * (Math.PI / 2))

export const MINIMAP_DEFAULTS = {
  itemSize: 8,
  hoverRow: 12,
  dotLen: 6,
  hoverMax: 22,
  gap: 0,
  pillWidth: 2,
  lensRange: 3,
  side: 'left',
  viewportHeight: '60vh',
  viewportMinHeight: 360,
}

/** 内容区一侧预留宽度，避免气泡压住 rail */
export function getRailReserve({
  dotLen = MINIMAP_DEFAULTS.dotLen,
  hoverMax = MINIMAP_DEFAULTS.hoverMax,
} = {}) {
  return Math.ceil(Math.max(dotLen, hoverMax)) + 28
}

/** 扁平消息 → 一轮一条（约定 user/assistant 交错） */
export function buildTurnItems(messages = []) {
  const list = []
  for (let i = 0; i * 2 < messages.length; i++) {
    const u = messages[i * 2]
    const a = messages[i * 2 + 1]
    list.push({
      id: `turn-${i}`,
      title: u?.title ?? `第 ${i + 1} 轮`,
      anchorId: u?.id,
      userText: u?.content ?? '',
      assistantText: a?.content ?? '',
    })
  }
  return list
}

export function turnIndexOfMessage(messages, messageId) {
  const idx = messages.findIndex((m) => m.id === messageId)
  return idx < 0 ? 0 : Math.floor(idx / 2)
}

/**
 * scrollspy：active 轮 + 视口轮区间 + jumpTo
 * 滚动容器挂 scrollerRef；消息 DOM 挂 data-id + registerItem(id)
 */
export function useMinimapScrollSpy({ messages, turns, anchorMargin = 24 }) {
  const scrollerRef = useRef(null)
  const itemEls = useRef(new Map())
  const visibleSet = useRef(new Set())
  const [activeMsgId, setActiveMsgId] = useState(messages[0]?.id)
  const [turnRange, setTurnRange] = useState([0, 0])
  const rafRef = useRef(0)

  const recompute = useCallback(() => {
    const sc = scrollerRef.current
    if (!sc) return
    const mid = sc.getBoundingClientRect().top + sc.clientHeight / 2
    let bestId = null
    let bestDist = Infinity
    const idxs = []
    visibleSet.current.forEach((id) => {
      idxs.push(turnIndexOfMessage(messages, id))
      const el = itemEls.current.get(id)
      if (!el) return
      const r = el.getBoundingClientRect()
      const d = Math.abs(r.top + r.height / 2 - mid)
      if (d < bestDist) {
        bestDist = d
        bestId = id
      }
    })
    if (idxs.length) {
      idxs.sort((a, b) => a - b)
      setTurnRange([idxs[0], idxs[idxs.length - 1]])
    }
    if (bestId) setActiveMsgId(bestId)
  }, [messages])

  const schedule = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(recompute)
  }, [recompute])

  useEffect(() => {
    const root = scrollerRef.current
    if (!root) return
    visibleSet.current = new Set()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = e.target.dataset.id
          if (e.isIntersecting) visibleSet.current.add(id)
          else visibleSet.current.delete(id)
        }
        schedule()
      },
      { root, threshold: 0.01 },
    )
    itemEls.current.forEach((el) => el && io.observe(el))
    return () => {
      io.disconnect()
      cancelAnimationFrame(rafRef.current)
    }
  }, [messages, schedule])

  const registerItem = useCallback((id) => (el) => {
    if (el) itemEls.current.set(id, el)
    else itemEls.current.delete(id)
  }, [])

  const jumpTo = useCallback(
    (turnId) => {
      const sc = scrollerRef.current
      const turn = turns.find((t) => t.id === turnId)
      const el = turn && itemEls.current.get(turn.anchorId)
      if (!sc || !el) return
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      const delta =
        el.getBoundingClientRect().top - sc.getBoundingClientRect().top - anchorMargin
      sc.scrollTo({ top: sc.scrollTop + delta, behavior: reduced ? 'auto' : 'smooth' })
    },
    [turns, anchorMargin],
  )

  return {
    scrollerRef,
    registerItem,
    schedule,
    jumpTo,
    activeTurnId: `turn-${turnIndexOfMessage(messages, activeMsgId)}`,
    turnRange,
  }
}

/**
 * @param {object} props
 * @param {Array<{ id: string, userText?: string, assistantText?: string }>} props.items
 * @param {string} props.activeId
 * @param {[number, number]} [props.visibleRange]
 * @param {(id: string) => void} props.onJump
 * @param {{ current: HTMLElement | null }} props.scrollerRef
 */
export default function ChatMinimap({
  items,
  activeId,
  visibleRange,
  onJump,
  scrollerRef,
  className,
  ...cfg
}) {
  const {
    itemSize, hoverRow, dotLen, hoverMax, gap, pillWidth, lensRange, side,
    viewportHeight, viewportMinHeight,
  } = { ...MINIMAP_DEFAULTS, ...cfg }

  const railRef = useRef(null)
  const rafRef = useRef(0)
  const [pointerY, setPointerY] = useState(null)
  const [railH, setRailH] = useState(0)

  const restRow = itemSize + gap
  const peakRow = Math.max(restRow, hoverRow + gap)
  const railW = Math.ceil(Math.max(dotLen, hoverMax)) + 12
  const isLeft = side === 'left'
  const activeIndex = items.findIndex((it) => it.id === activeId)
  const n = items.length

  // active 居中 + 鱼眼对准光标（不动点迭代）
  const { heights, tops, offset, pointerRow } = useMemo(() => {
    const h = new Array(n)
    const t = new Array(n)
    const restCenter = activeIndex >= 0 ? activeIndex * restRow + restRow / 2 : 0
    const centerOff = (pr) => {
      // 按当前行高把 active 钉在中线
      let acc = 0
      for (let i = 0; i < n; i++) {
        t[i] = acc
        h[i] = restRow + (peakRow - restRow) * falloff(Math.abs(i + 0.5 - pr), lensRange)
        acc += h[i]
      }
      return { off: railH / 2 - (t[activeIndex] + h[activeIndex] / 2), acc }
    }

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
      const r = centerOff(pr)
      off = r.off
      const target = pointerY - off
      if (target <= 0) pr = target / restRow
      else if (target >= r.acc) pr = n - 0.5 + (target - r.acc) / restRow
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

  // 量高 + 滚轮转发 + 卸载清 raf
  useLayoutEffect(() => {
    const el = railRef.current
    if (!el) return
    setRailH(el.clientHeight)
    const ro = new ResizeObserver(([e]) => setRailH(e.contentRect.height))
    ro.observe(el)
    const onWheel = (e) => {
      const sc = scrollerRef?.current
      if (!sc) return
      e.preventDefault()
      sc.scrollTop += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      ro.disconnect()
      el.removeEventListener('wheel', onWheel)
      cancelAnimationFrame(rafRef.current)
    }
  }, [scrollerRef])

  const onPointerMove = (e) => {
    const el = railRef.current
    if (!el) return
    const y = e.clientY - el.getBoundingClientRect().top
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => setPointerY(y))
  }
  const onPointerLeave = () => {
    cancelAnimationFrame(rafRef.current)
    setPointerY(null)
  }

  const [vFirst, vLast] = visibleRange || [-1, -1]
  const hoverIdx =
    pointerRow == null || pointerRow < 0 || pointerRow >= n
      ? null
      : Math.min(n - 1, Math.max(0, Math.floor(pointerRow)))
  const hoverItem = hoverIdx != null ? items[hoverIdx] : null

  return (
    <div
      className={cn(
        'absolute top-1/2 z-[5] max-h-full -translate-y-1/2',
        isLeft ? 'left-0' : 'right-0',
        className,
      )}
      style={{ width: railW, height: viewportHeight, minHeight: viewportMinHeight }}
    >
      <nav
        ref={railRef}
        className="relative h-full w-full overflow-hidden px-1.5"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        aria-label="对话导航"
      >
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
            const dist = pointerRow == null ? Infinity : Math.abs(i + 0.5 - pointerRow)
            const len = dotLen + (hoverMax - dotLen) * falloff(dist, lensRange)
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
                aria-current={i === activeIndex ? 'true' : undefined}
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
          className={cn('absolute top-0 z-20', isLeft ? 'left-full ml-2' : 'right-full mr-2')}
          style={{
            transform: `translateY(${offset + tops[hoverIdx] + heights[hoverIdx] / 2}px) translateY(-50%)`,
          }}
        >
          {/* hover 详情：user 1 行 + assistant 3 行 */}
          <div
            className="pointer-events-none w-[220px] rounded-xl border border-[#e8e8ea] bg-[var(--cm-panel,#fff)] px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
            role="tooltip"
          >
            <p className="truncate text-[13px] leading-snug text-[var(--cm-ink,#1c1c1e)]">
              {hoverItem.userText || '—'}
            </p>
            <p className="mt-1.5 line-clamp-3 text-[13px] leading-snug text-[var(--cm-muted,#9a9a9d)]">
              {hoverItem.assistantText || '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export { ChatMinimap }
