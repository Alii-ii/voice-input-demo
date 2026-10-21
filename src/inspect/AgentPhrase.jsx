import { useEffect, useState } from 'react'

/** 进行中轮换的进程文案，每句大约停 1.6 秒 */
const PHRASES = ['Thinking...', 'Looking at the page...', 'Drafting a reply...']
const PHRASE_MS = 1600

/** 盖在底栏输入上的流光文案。挂载时从 Thinking... 开始，卸下即停止 */
export default function AgentPhrase() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % PHRASES.length)
    }, PHRASE_MS)
    return () => window.clearInterval(id)
  }, [])

  return (
    <span
      aria-live="polite"
      className="agent-shimmer pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 whitespace-nowrap text-[15px] leading-none"
    >
      {PHRASES[index]}
    </span>
  )
}
