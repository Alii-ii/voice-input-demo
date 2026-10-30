import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn.js'

/** 左右淡出宽度，落在 12–16px */
const FADE_PX = 14

/** 把光标或组词片段滚进横滚行，不改行高 */
export function scrollChildIntoView(row, child) {
  if (!row || !child) return
  const left = child.offsetLeft
  const right = left + child.offsetWidth
  const pad = 8
  if (left < row.scrollLeft + pad) row.scrollLeft = Math.max(0, left - pad)
  else if (right > row.scrollLeft + row.clientWidth - pad) {
    row.scrollLeft = right - row.clientWidth + pad
  }
}

/** 只有真正会滚出的那一侧才淡出；没溢出时整行全显 */
function edgeMask(left, right) {
  if (!left && !right) return 'none'
  if (left && right) {
    return `linear-gradient(to right, transparent, #000 ${FADE_PX}px, #000 calc(100% - ${FADE_PX}px), transparent)`
  }
  if (left) return `linear-gradient(to right, transparent, #000 ${FADE_PX}px, #000 100%)`
  return `linear-gradient(to right, #000 0, #000 calc(100% - ${FADE_PX}px), transparent)`
}

/**
 * 一行高的横滚。滚动条藏掉，滚轮和拖动仍能滚。
 * 遮罩只贴在这一行上，不往下盖到波形。
 */
const ScrollFadeLine = forwardRef(function ScrollFadeLine(
  { children, className, pinEnd = false, caretRef = null, scrollKey = '', enter = false },
  ref,
) {
  const localRef = useRef(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const setNode = (node) => {
    localRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  const measure = () => {
    const row = localRef.current
    if (!row) return
    const overflow = row.scrollWidth - row.clientWidth
    const left = overflow > 2 && row.scrollLeft > 2
    const right = overflow > 2 && overflow - row.scrollLeft > 2
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
  }

  // 先把末尾或光标留在可视区，再量哪一侧溢出，避免第一帧淡错边
  useLayoutEffect(() => {
    const row = localRef.current
    if (!row) return
    if (pinEnd) row.scrollLeft = row.scrollWidth
    else if (caretRef?.current) scrollChildIntoView(row, caretRef.current)
    measure()
  }, [pinEnd, scrollKey, caretRef])

  useEffect(() => {
    const row = localRef.current
    if (!row) return undefined
    const onScroll = () => measure()
    row.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(() => measure())
    ro.observe(row)
    if (row.firstElementChild) ro.observe(row.firstElementChild)
    return () => {
      row.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [])

  const mask = edgeMask(edges.left, edges.right)

  return (
    <div
      ref={setNode}
      data-scroll-fade=""
      data-fade-left={edges.left ? '1' : '0'}
      data-fade-right={edges.right ? '1' : '0'}
      className={cn(
        'flex h-6 w-full items-center overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        enter && 'inspect-line-in',
        className,
      )}
      style={{
        maskImage: mask,
        WebkitMaskImage: mask,
        transition: 'mask-image 160ms ease, -webkit-mask-image 160ms ease',
      }}
    >
      {children}
    </div>
  )
})

export default ScrollFadeLine
