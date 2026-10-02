import { useCallback, useEffect, useRef, useState } from 'react'
import { turnIndexOfMessage } from './buildTurnItems.js'

/**
 * 对话流 scrollspy：推导 active 轮 + 视口内轮区间，并提供 jumpTo。
 *
 * 调用方负责：
 *  - 给滚动容器挂 scrollerRef
 *  - 给每条消息 DOM 挂 data-id，并用 registerItem(id) 注册 ref
 *
 * @param {{
 *   messages: Array<{ id: string }>,
 *   turns: Array<{ id: string, anchorId: string }>,
 *   anchorMargin?: number,
 * }} opts
 */
export function useMinimapScrollSpy({ messages, turns, anchorMargin = 24 }) {
  const scrollerRef = useRef(null)
  const itemEls = useRef(new Map()) // messageId -> element
  const visibleSet = useRef(new Set())
  const [activeMsgId, setActiveMsgId] = useState(messages[0]?.id)
  const [turnRange, setTurnRange] = useState([0, 0])
  const rafRef = useRef(0)

  const turnIndexOf = useCallback(
    (id) => turnIndexOfMessage(messages, id),
    [messages],
  )

  const recompute = useCallback(() => {
    const sc = scrollerRef.current
    if (!sc) return
    const rect = sc.getBoundingClientRect()
    const mid = rect.top + sc.clientHeight / 2

    let bestId = null
    let bestDist = Infinity
    const turnIdx = []
    visibleSet.current.forEach((id) => {
      turnIdx.push(turnIndexOf(id))
      const el = itemEls.current.get(id)
      if (!el) return
      const r = el.getBoundingClientRect()
      const dist = Math.abs(r.top + r.height / 2 - mid)
      if (dist < bestDist) {
        bestDist = dist
        bestId = id
      }
    })
    if (turnIdx.length) {
      turnIdx.sort((a, b) => a - b)
      setTurnRange([turnIdx[0], turnIdx[turnIdx.length - 1]])
    }
    if (bestId) setActiveMsgId(bestId)
  }, [turnIndexOf])

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
    return () => io.disconnect()
  }, [messages, schedule])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const registerItem = useCallback((id) => (el) => {
    if (el) itemEls.current.set(id, el)
    else itemEls.current.delete(id)
  }, [])

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  // 点击轴 → 该轮锚点消息滚到窗口顶部、留出边距
  const jumpTo = useCallback(
    (turnId) => {
      const sc = scrollerRef.current
      const turn = turns.find((t) => t.id === turnId)
      const el = turn && itemEls.current.get(turn.anchorId)
      if (!sc || !el) return
      const delta = el.getBoundingClientRect().top - sc.getBoundingClientRect().top - anchorMargin
      sc.scrollTo({ top: sc.scrollTop + delta, behavior: prefersReduced ? 'auto' : 'smooth' })
    },
    [turns, prefersReduced, anchorMargin],
  )

  const activeTurnId = `turn-${turnIndexOf(activeMsgId)}`

  return {
    scrollerRef,
    registerItem,
    schedule,
    jumpTo,
    activeTurnId,
    turnRange,
  }
}
