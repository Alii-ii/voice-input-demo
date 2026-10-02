import { useMemo } from 'react'
import {
  ChatMinimap,
  buildTurnItems,
  getRailReserve,
  useMinimapScrollSpy,
} from '../chat-minimap'
import { cn } from '../lib/cn.js'

/**
 * ChatPanel：典型对话流 + 可带走的 ChatMinimap
 *  - 消息挂 data-id + registerItem 作为跳转锚点
 *  - scrollspy / 轮列表 / rail 预留宽度全部走 chat-minimap 公共 API
 */
export default function ChatPanel({ messages, minimapProps }) {
  const side = minimapProps?.side ?? 'left'
  const reserve = getRailReserve({
    dotLen: minimapProps?.dotLen,
    hoverMax: minimapProps?.hoverMax,
  })

  const turns = useMemo(() => buildTurnItems(messages), [messages])
  const { scrollerRef, registerItem, schedule, jumpTo, activeTurnId, turnRange } =
    useMinimapScrollSpy({ messages, turns })

  return (
    // rail 绝对定位的参照；圆角裁掉内部滚动条，滚动仍在 scroller 内
    <div className="relative h-full overflow-hidden rounded-[14px] bg-panel">
      <div
        className="h-full overflow-y-auto text-ink [overflow-anchor:none]"
        ref={scrollerRef}
        onScroll={schedule}
      >
        <div
          className="flex flex-col gap-3.5 p-[22px]"
          style={side === 'left' ? { paddingLeft: reserve } : { paddingRight: reserve }}
        >
          {messages.map((msg) => {
            const isUser = msg.role === 'user'
            return (
              <article
                key={msg.id}
                data-id={msg.id}
                ref={registerItem(msg.id)}
                className={cn(
                  'flex scroll-mt-6 gap-2.5',
                  isUser
                    ? 'max-w-[76%] flex-row-reverse self-end'
                    : 'max-w-[92%] self-start',
                )}
              >
                <div
                  className={cn(
                    'text-sm leading-relaxed text-ink',
                    isUser
                      ? 'rounded-[14px] rounded-br-sm bg-[#f1f1f3] px-3.5 py-2.5'
                      : 'bg-transparent p-0',
                  )}
                >
                  {msg.content.split('\n\n').map((p, i) => (
                    <p key={i} className="mb-1.5 last:mb-0">
                      {p}
                    </p>
                  ))}
                  <span className="mt-1.5 inline-block text-[11px] opacity-50">#{msg.tag}</span>
                </div>
              </article>
            )
          })}
        </div>
      </div>

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
