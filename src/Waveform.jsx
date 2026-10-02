import { useEffect, useRef, useState } from 'react'
import { cn } from './lib/cn.js'

const BARS = 56

// 一个随说话“起伏”的波形；语音模式下持续跳动
export default function Waveform({ className = '' }) {
  const [heights, setHeights] = useState(() =>
    Array.from({ length: BARS }, () => 0.2 + Math.random() * 0.3),
  )
  const raf = useRef(null)
  const last = useRef(0)

  useEffect(() => {
    const loop = (t) => {
      if (t - last.current > 90) {
        last.current = t
        setHeights((prev) =>
          prev.map((h, i) => {
            // 中间幅度更大，营造真实说话包络
            const center = 1 - Math.abs(i - BARS / 2) / (BARS / 2)
            const target = 0.15 + Math.random() * (0.35 + center * 0.6)
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
      className={cn(
        'flex h-[38px] w-full items-center justify-between gap-0 overflow-hidden',
        className,
      )}
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-[#2f2f31] transition-[height] duration-[90ms] linear"
          style={{ height: `${(h * 100).toFixed(1)}%` }}
        />
      ))}
    </div>
  )
}
