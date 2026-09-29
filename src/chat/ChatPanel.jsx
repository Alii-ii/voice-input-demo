import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ChatMinimap from './ChatMinimap.jsx'

/**
 * ChatPanel：典型对话流
 *  - 固定高度、可滚动的消息区（模拟真实 chat panel 的视口约束）
 *  - 每条消息挂 ref + data-id 作为跳转锚点
 *  - minimap 以「轮」为单位：一轮 = 一条轴；active 轮 = 视口中线最近消息所属的轮
 *  - rail 绝对定位钉在面板视口（滚动页面 / 对话流都不丢失），不放进滚动容器
 *
 * 消息按 user, assistant, user, assistant… 顺序排列，故 轮索引 = floor(消息索引 / 2)。
 */
export default function ChatPanel({ messages, minimapProps }) {
  const scrollerRef = useRef(null)
  const itemEls = useRef(new Map()) // messageId -> element
  const visibleSet = useRef(new Set())
  const [activeMsgId, setActiveMsgId] = useState(messages[0]?.id)
  const [turnRange, setTurnRange] = useState([0, 0])
  const rafRef = useRef(0)

  const side = minimapProps?.side ?? 'left'

  // rail 实宽 = 峰值轴长 + 内边距；据此为对话内容预留一侧空间，避免气泡压在 rail 下
  const dotLen = minimapProps?.dotLen ?? 6
  const hoverMax = minimapProps?.hoverMax ?? 22
  const reserve = Math.ceil(Math.max(dotLen, hoverMax)) + 12 + 16

  const indexById = useMemo(() => {
    const m = new Map()
    messages.forEach((msg, i) => m.set(msg.id, i))
    return m
  }, [messages])

  // 轮列表：一轮一条轴，锚点用该轮首条（user）消息
  const turns = useMemo(() => {
    const list = []
    for (let i = 0; i * 2 < messages.length; i++) {
      const first = messages[i * 2]
      list.push({ id: `turn-${i}`, title: first?.title ?? `第 ${i + 1} 轮`, anchorId: first?.id })
    }
    return list
  }, [messages])

  const turnIndexOfMsg = useCallback((id) => Math.floor((indexById.get(id) ?? 0) / 2), [indexById])
  const activeTurnId = `turn-${turnIndexOfMsg(activeMsgId)}`

  // 由可见集合推导：turnRange + active（视口中线最近的可见消息）
  const recompute = useCallback(() => {
    const sc = scrollerRef.current
    if (!sc) return
    const rect = sc.getBoundingClientRect()
    const mid = rect.top + sc.clientHeight / 2

    let bestId = null
    let bestDist = Infinity
    const turnIdx = []
    visibleSet.current.forEach((id) => {
      turnIdx.push(turnIndexOfMsg(id))
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
  }, [turnIndexOfMsg])

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

  // 点击轴 → 该轮首条（用户）消息滚到窗口顶部、留出边距
  // 用显式 scrollTop 计算（overflow 容器里 scrollIntoView 行为不稳定）
  const ANCHOR_MARGIN = 24
  const jumpTo = useCallback(
    (turnId) => {
      const sc = scrollerRef.current
      const turn = turns.find((t) => t.id === turnId)
      const el = turn && itemEls.current.get(turn.anchorId)
      if (!sc || !el) return
      const delta = el.getBoundingClientRect().top - sc.getBoundingClientRect().top - ANCHOR_MARGIN
      sc.scrollTo({ top: sc.scrollTop + delta, behavior: prefersReduced ? 'auto' : 'smooth' })
    },
    [turns, prefersReduced],
  )

  return (
    <div className="chat-panel">
      <div className="chat-scroller" ref={scrollerRef} onScroll={schedule}>
        <div
          className="chat-thread"
          style={side === 'left' ? { paddingLeft: reserve } : { paddingRight: reserve }}
        >
          {messages.map((msg) => (
            <article
              key={msg.id}
              data-id={msg.id}
              ref={registerItem(msg.id)}
              className={`bubble bubble--${msg.role}`}
            >
              <div className="bubble-body">
                {msg.content.split('\n\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                <span className="bubble-tag">#{msg.tag}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* rail 绝对定位钉在面板视口，一轮一条轴 */}
      <ChatMinimap
        items={turns}
        activeId={activeTurnId}
        visibleRange={turnRange}
        onJump={jumpTo}
        scrollerRef={scrollerRef}
        {...minimapProps}
      />
    </div>
  )
}
