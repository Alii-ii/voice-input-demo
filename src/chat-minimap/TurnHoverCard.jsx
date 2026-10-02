import { cn } from './cn.js'

/**
 * 时间轴 hover 详情卡（包内私有）
 *  - 用户消息：单行截断
 *  - 模型消息：最多 3 行截断（muted 色）
 */
export default function TurnHoverCard({ userText = '', assistantText = '', className }) {
  return (
    <div
      className={cn(
        'pointer-events-none w-[220px] rounded-xl border border-[#e8e8ea] bg-[var(--cm-panel,#fff)] px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)]',
        className,
      )}
      role="tooltip"
    >
      <p className="truncate text-[13px] leading-snug text-[var(--cm-ink,#1c1c1e)]">
        {userText || '—'}
      </p>
      <p className="mt-1.5 line-clamp-3 text-[13px] leading-snug text-[var(--cm-muted,#9a9a9d)]">
        {assistantText || '—'}
      </p>
    </div>
  )
}
