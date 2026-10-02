import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn.js'
// Vite ?raw：构建期嵌入源码，一键复制无需再 fetch
import minimapSource from '../ChatMinimap.jsx?raw'

/**
 * 调试页底栏：一键复制 ChatMinimap.jsx 全文（单文件可带走）
 */
export default function CopyMinimapCodeBar() {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(0)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(minimapSource)
      setCopied(true)
      clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // 降级：选区复制
      const ta = document.createElement('textarea')
      ta.value = minimapSource
      ta.style.cssText = 'position:fixed;left:-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(false), 1600)
    }
  }

  const lines = minimapSource.split('\n').length
  const kb = (new Blob([minimapSource]).size / 1024).toFixed(1)

  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-[#3a3a3c] bg-[rgba(28,28,30,0.85)] px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-[#f2f2f4]">
          <span className="font-mono text-accent">ChatMinimap.jsx</span>
          <span className="ml-2 text-muted-2">单文件可带走 · React + Tailwind</span>
        </div>
        <div className="mt-0.5 text-[11px] text-[#8f8f92]">
          {lines} 行 · {kb} KB · 含组件 / scrollspy / buildTurnItems
        </div>
      </div>

      <button
        type="button"
        onClick={onCopy}
        className={cn(
          'cursor-pointer rounded-[9px] border px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-100',
          copied
            ? 'border-[rgba(52,199,89,0.5)] bg-[rgba(52,199,89,0.15)] text-[#a7e5b5]'
            : 'border-accent bg-accent text-ink hover:brightness-110 active:scale-[0.97]',
        )}
      >
        {copied ? '已复制 ✓' : '一键复制组件代码'}
      </button>
    </div>
  )
}
