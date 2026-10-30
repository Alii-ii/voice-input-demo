import { useEffect, useRef, useState } from 'react'
import ElementTagChip from './ElementTagChip.jsx'
import ScrollFadeLine from './ScrollFadeLine.jsx'

const BARS = 56

/**
 * 听写态胶囊里的单行。textarea 画不出彩色标签，所以用同一行高的横滚层：
 * 已有文字、元素芯片、听写文本。超出只横滚，不换行、不撑高。
 * 左右淡出贴在这一行，不盖住下面的波形。
 */
export function SoloScrollLine({ prefix = '', segments = null, label = '', summary = '', speech = '' }) {
  const lead = Array.isArray(segments)
  const hasLead = lead
    ? segments.some((seg) => (seg.type === 'tag' ? true : !!seg.value))
    : !!prefix
  const scrollKey = lead
    ? `${segments.map((seg) => (seg.type === 'tag' ? `t${seg.n}` : seg.value)).join('\n')}|${label}|${speech}`
    : `${prefix}|${label}|${speech}`

  return (
    <ScrollFadeLine pinEnd enter scrollKey={scrollKey}>
      <div className="inline-flex w-max shrink-0 items-center whitespace-nowrap font-light text-[15px] leading-none text-[#1c1c1e]">
        {lead
          ? segments.map((seg, index) =>
              seg.type === 'tag' ? (
                <ElementTagChip
                  key={`tag-${seg.n}`}
                  label={seg.label || `选区${seg.n}`}
                  summary={seg.summary}
                  className="mr-1"
                />
              ) : (
                <span key={`text-${index}`}>{seg.value}</span>
              ),
            )
          : prefix
            ? <span>{prefix}</span>
            : null}
        {label ? (
          <ElementTagChip
            label={label}
            summary={summary}
            className={hasLead ? 'mx-1' : 'mr-1'}
          />
        ) : null}
        {speech ? <span>{!label && hasLead ? ` ${speech}` : speech}</span> : null}
      </div>
    </ScrollFadeLine>
  )
}

/** 贴着胶囊底边的波形：条形从同一条底边向上长，横向铺满胶囊并左对齐 */
export function SoloWave() {
  const [heights, setHeights] = useState(() =>
    Array.from({ length: BARS }, () => 0.15 + Math.random() * 0.2),
  )
  const raf = useRef(0)
  const last = useRef(0)

  useEffect(() => {
    const loop = (t) => {
      if (t - last.current > 90) {
        last.current = t
        setHeights((prev) =>
          prev.map((h, i) => {
            // 两端留短，中间跟着说话起伏
            const center = 1 - Math.abs(i - (BARS - 1) / 2) / ((BARS - 1) / 2)
            const target = 0.08 + Math.random() * (0.16 + center * 0.76)
            return h + (target - h) * 0.6
          }),
        )
      }
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [])

  return (
    <div
      aria-hidden="true"
      data-solo-wave
      className="flex h-[18px] w-full items-end justify-between overflow-hidden"
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-[2px] shrink-0 self-end rounded-full bg-[#1c1c1e] transition-[height] duration-100 ease-linear"
          style={{ height: `${Math.max(2, Math.round(h * 18))}px` }}
        />
      ))}
    </div>
  )
}
