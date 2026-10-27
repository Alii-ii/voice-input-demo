/**
 * 插在草稿光标处的竖线。
 * 高度跟字号一样，底边贴文字基线；左右位置由前面的芯片和文字排出来。
 */
export default function DraftCaret({ markerRef, visible = true }) {
  if (!visible) {
    return <span ref={markerRef} className="inline-block w-0" />
  }
  return (
    <span
      ref={markerRef}
      data-inspect-caret=""
      className="caret-blink inline-block h-[1em] w-px shrink-0 bg-[#1c1c1e] align-baseline"
    />
  )
}
