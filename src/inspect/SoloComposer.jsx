import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const BARS = 56

/**
 * 听写态胶囊里的单行。textarea 画不出彩色标签，所以用同一行高的横滚层：
 * 已有文字、蓝色链接 + 元素名、听写文本。超出只横滚，不换行、不撑高。
 */
export function SoloScrollLine({ prefix = '', label = '', summary = '', speech = '' }) {
  const rowRef = useRef(null)

  // 新识别接在末尾，把末尾留在胶囊里
  useLayoutEffect(() => {
    const row = rowRef.current
    if (!row) return
    row.scrollLeft = row.scrollWidth
  }, [prefix, label, speech])

  return (
    <div
      ref={rowRef}
      className="flex h-6 items-center overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="inline-flex h-6 items-center whitespace-nowrap text-[15px] leading-6 text-[#1c1c1e]">
        {prefix ? <span>{prefix}</span> : null}
        {label ? (
          <span
            title={summary || undefined}
            className={
              'inline-flex shrink-0 items-center gap-[3px] text-[#2f7fff] ' + (prefix ? 'mx-1' : 'mr-1')
            }
          >
            <LinkIcon />
            <span>{label}</span>
          </span>
        ) : null}
        {speech ? <span>{!label && prefix ? ` ${speech}` : speech}</span> : null}
      </div>
    </div>
  )
}

/** 贴在输入胶囊正下方的矮波形，不占原来那一整条语音轴 */
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
      className="flex h-[18px] w-full items-center justify-between overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]"
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-[2px] shrink-0 rounded-full bg-[#1c1c1e] transition-[height] duration-100 ease-linear"
          style={{ height: `${Math.max(2, Math.round(h * 18))}px` }}
        />
      ))}
    </div>
  )
}

function LinkIcon() {
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
