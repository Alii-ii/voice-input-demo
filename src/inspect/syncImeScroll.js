const spaceWidth = new Map()

function measureSpace(font) {
  const cached = spaceWidth.get(font)
  if (cached) return cached
  const mirror = document.createElement('span')
  mirror.style.position = 'absolute'
  mirror.style.visibility = 'hidden'
  mirror.style.whiteSpace = 'pre'
  mirror.style.font = font
  mirror.textContent = ' '
  document.body.appendChild(mirror)
  const width = mirror.getBoundingClientRect().width || 4
  mirror.remove()
  spaceWidth.set(font, width)
  return width
}

/**
 * 透明输入框没有芯片那么宽时，scrollLeft 会被夹回 0。
 * 用空格把内容撑到和可视行一样宽，光标再落在芯片实际宽度上。
 */
export function padCaretTextarea(el, caretX, totalWidth) {
  if (!el || el.dataset.inspectComposing === '1') return
  const space = measureSpace(getComputedStyle(el).font)
  const total = Math.max(caretX, totalWidth)
  const count = Math.max(1, Math.ceil((total + space) / space))
  const caretCount = Math.max(0, Math.min(count, Math.round(caretX / space)))
  const next = ' '.repeat(count)
  if (el.value !== next) el.value = next
  if (el.selectionStart !== caretCount || el.selectionEnd !== caretCount) {
    try {
      el.setSelectionRange(caretCount, caretCount)
    } catch {
      // 还不能设选区时跳过，滚动仍按下面的 scrollLeft
    }
  }
}
