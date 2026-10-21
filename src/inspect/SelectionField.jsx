import { useEffect, useRef } from 'react'
import { cn } from '../lib/cn.js'
import { plainText } from './selectionDraft.js'

/**
 * 一行高的输入条。底层是不会长高的 textarea，上层画出标签和已输入文本。
 * 不聚焦这枚 textarea，避免系统键盘盖住模拟键盘。
 */
export default function SelectionField({ segments, cursor, showCaret, framed, onActivate }) {
  const rowRef = useRef(null)
  const caretRef = useRef(null)
  const text = plainText(segments)

  // 内容超出一行时，把光标或末尾滚进可视区，高度始终锁在一行
  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const caret = caretRef.current
    if (!caret) {
      row.scrollLeft = row.scrollWidth
      return
    }
    const left = caret.offsetLeft
    const right = left + caret.offsetWidth
    if (left < row.scrollLeft + 8) row.scrollLeft = Math.max(0, left - 8)
    else if (right > row.scrollLeft + row.clientWidth - 8) {
      row.scrollLeft = right - row.clientWidth + 8
    }
  }, [segments, cursor, showCaret])

  return (
    <div
      className={cn(
        'relative',
        framed && 'rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04]',
      )}
    >
      <textarea
        rows={1}
        readOnly
        tabIndex={-1}
        aria-label="选区输入"
        value={text}
        onChange={() => {}}
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onActivate?.()
        }}
        style={{ height: 40, minHeight: 40, maxHeight: 40 }}
        className={cn(
          'box-border block w-full resize-none overflow-hidden border-0 px-3.5 py-0 text-[16px] leading-10 text-transparent outline-none',
          framed ? 'rounded-[22px] bg-white' : 'bg-transparent',
        )}
      />
      <div
        ref={rowRef}
        className="pointer-events-none absolute inset-0 flex items-center overflow-x-auto overflow-y-hidden px-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="inline-flex items-center whitespace-nowrap text-[16px] leading-10 text-[#1c1c1e]">
          {segments.map((seg, index) => {
            if (seg.type === 'tag') {
              return (
                <span
                  key={`tag-${seg.n}`}
                  title={seg.summary}
                  className="mr-1 inline-flex shrink-0 items-center gap-[3px] text-[#2f7fff]"
                >
                  <TagIcon />
                  <span>{seg.label || `选区${seg.n}`}</span>
                </span>
              )
            }
            const active = showCaret && cursor.i === index
            if (!active) {
              return <span key={`text-${index}`}>{seg.value}</span>
            }
            return (
              <span key={`text-${index}`}>
                {seg.value.slice(0, cursor.offset)}
                <span
                  ref={caretRef}
                  className="caret-blink mx-px inline-block h-[18px] w-px translate-y-[2px] bg-[#1c1c1e] align-middle"
                />
                {seg.value.slice(cursor.offset)}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TagIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.6 9.2a2.7 2.7 0 0 0 3.9.2l1.5-1.5a2.7 2.7 0 0 0-3.8-3.8L7.4 4.9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M9.4 6.8a2.7 2.7 0 0 0-3.9-.2L4 8.1a2.7 2.7 0 0 0 3.8 3.8l.8-.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
