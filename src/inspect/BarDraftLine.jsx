import { forwardRef, useRef } from 'react'
import DraftCaret from './DraftCaret.jsx'
import ElementTagChip from './ElementTagChip.jsx'
import ScrollFadeLine from './ScrollFadeLine.jsx'

/**
 * 缩略胶囊里的一行草稿。textarea 只能画出纯文本，
 * 标签改由这一层画成和展开态相同的芯片，超出只横滚。
 */
const BarDraftLine = forwardRef(function BarDraftLine(
  { segments, cursor, showCaret, composeRef, armedN = null, onTagPress },
  ref,
) {
  const caretRef = useRef(null)
  const scrollKey = `${segments
    .map((seg) => (seg.type === 'tag' ? `t${seg.n}` : seg.value))
    .join('\n')}|${cursor?.i ?? ''}|${cursor?.offset ?? ''}|${showCaret ? 1 : 0}`

  return (
    <ScrollFadeLine ref={ref} caretRef={caretRef} scrollKey={scrollKey} className="pointer-events-none">
      {/* 整行不接点击，短按仍落到 textarea；只有芯片自己可点 */}
      <div className="pointer-events-none inline-flex w-max shrink-0 items-center gap-px whitespace-nowrap font-light text-[15px] leading-none text-[#1c1c1e]">
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
          const active = cursor && cursor.i === index
          if (!active) return <span key={`text-${index}`} className="pointer-events-none">{seg.value}</span>
          return (
            <span key={`text-${index}`} className="pointer-events-none">
              {seg.value.slice(0, cursor.offset)}
              <DraftCaret markerRef={caretRef} visible={showCaret} />
              {/* 组词过程写在这里，不逐字改草稿；上屏仍走 compositionend */}
              <span ref={composeRef} />
              {seg.value.slice(cursor.offset)}
            </span>
          )
        })}
      </div>
    </ScrollFadeLine>
  )
})

export default BarDraftLine
