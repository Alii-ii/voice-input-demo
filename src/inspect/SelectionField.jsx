import { useEffect, useLayoutEffect, useRef } from 'react'
import { cn } from '../lib/cn.js'
import DraftCaret from './DraftCaret.jsx'
import ElementTagChip from './ElementTagChip.jsx'
import { padCaretTextarea } from './syncImeScroll.js'
import { plainText } from './selectionDraft.js'

/**
 * 一行高的输入条。底层是不会长高的 textarea，上层画出标签和已输入文本。
 * 不聚焦这枚 textarea，避免系统键盘盖住模拟键盘。
 */
export default function SelectionField({
  segments,
  cursor,
  showCaret,
  framed,
  flush = false,
  onActivate,
  scrollerRef,
  scrollSyncRef,
  armedN = null,
  onTagPress,
}) {
  const rowRef = useRef(null)
  const caretRef = useRef(null)
  const text = plainText(segments)

  const setRow = (node) => {
    rowRef.current = node
    if (scrollerRef) scrollerRef.current = node
  }

  // 拼音框跟着可视行滚，两边 scrollLeft 用同一套，不用 padding 去凑光标
  const syncIme = (row) => {
    const ime = scrollSyncRef?.current
    if (!ime || !row || ime.dataset.inspectComposing === '1') return
    const caret = caretRef.current
    const caretX = caret ? caret.offsetLeft : 0
    if (caretX > 1 || row.scrollWidth > row.clientWidth + 2) {
      padCaretTextarea(ime, caretX, row.scrollWidth)
    }
    if (ime.scrollLeft !== row.scrollLeft) ime.scrollLeft = row.scrollLeft
  }

  // 内容超出一行时，把光标或末尾滚进可视区，高度始终锁在一行
  useLayoutEffect(() => {
    const row = rowRef.current
    if (!row) return
    const caret = caretRef.current
    if (!caret) {
      row.scrollLeft = row.scrollWidth
    } else {
      const left = caret.offsetLeft
      const right = left + caret.offsetWidth
      if (left < row.scrollLeft + 8) row.scrollLeft = Math.max(0, left - 8)
      else if (right > row.scrollLeft + row.clientWidth - 8) {
        row.scrollLeft = right - row.clientWidth + 8
      }
    }
    syncIme(row)
  }, [segments, cursor, showCaret, scrollSyncRef])

  useEffect(() => {
    const row = rowRef.current
    if (!row) return undefined
    const onScroll = () => syncIme(row)
    row.addEventListener('scroll', onScroll, { passive: true })
    return () => row.removeEventListener('scroll', onScroll)
  }, [scrollSyncRef, segments, cursor])

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
        className={cn(
          // 行高 1、高度跟字号齐，行盒不要高出字形再留一截空
          'box-border block h-4 min-h-4 max-h-4 w-full resize-none overflow-hidden border-0 text-[16px] leading-none text-transparent outline-none',
          // 展开态外层卡片已有内边距，这里贴齐拼音框，不再加一层 px-3.5
          flush ? 'p-0' : 'px-3.5 py-0',
          framed ? 'rounded-[22px] bg-white' : 'bg-transparent',
        )}
      />
      <div
        ref={setRow}
        className={cn(
          // 整行不接点击，拼音仍落在 textarea；芯片 z 层更高，只有它自己可点
          'pointer-events-none absolute inset-0 z-20 flex items-center overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          flush ? 'p-0' : 'px-3.5',
        )}
      >
        <div className="pointer-events-none inline-flex items-center gap-px whitespace-nowrap text-[16px] leading-none text-[#1c1c1e]">
          {segments.map((seg, index) => {
            if (seg.type === 'tag') {
              return (
                <ElementTagChip
                  key={`tag-${seg.n}`}
                  n={seg.n}
                  label={seg.label || `选区${seg.n}`}
                  summary={seg.summary}
                  armed={armedN === seg.n}
                  onPress={onTagPress ? () => onTagPress(seg.n) : undefined}
                />
              )
            }
            const active = showCaret && cursor.i === index
            if (!active) {
              return <span key={`text-${index}`} className="pointer-events-none">{seg.value}</span>
            }
            return (
              <span key={`text-${index}`} className="pointer-events-none">
                {seg.value.slice(0, cursor.offset)}
                <DraftCaret markerRef={caretRef} />
                {seg.value.slice(cursor.offset)}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
