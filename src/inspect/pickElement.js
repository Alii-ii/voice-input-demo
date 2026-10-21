/**
 * 点选命中：与开发者工具「检查元素」相同，取指针下最上层的真实元素。
 * 布局壳层（data-inspect-skip）和点选 UI 本身不参与吸附。
 */

/**
 * 读取用于形变过渡的圆角。
 * 统一成 px，并封顶到短边的一半：pill 的 computed 值会大到 1e7，
 * 不封顶的话过渡几乎一帧就顶满，看不出圆角在变形。
 */
export function readRadius(el) {
  const cs = getComputedStyle(el)
  const rect = el.getBoundingClientRect()
  const cap = Math.min(rect.width, rect.height) / 2
  const corners = [
    cs.borderTopLeftRadius,
    cs.borderTopRightRadius,
    cs.borderBottomRightRadius,
    cs.borderBottomLeftRadius,
  ]
  return corners
    .map((value) => {
      if (!value) return '0px'
      const raw = value.endsWith('%') ? (parseFloat(value) / 100) * cap * 2 : parseFloat(value)
      if (!Number.isFinite(raw)) return '0px'
      return `${Math.min(Math.max(raw, 0), cap)}px`
    })
    .join(' ')
}

/** 选框标签：标签名 · 文案 · 宽高，用来确认识别到的是哪个元素 */
export function describeElement(el, rect) {
  const tag = el.tagName.toLowerCase()
  const text = (el.innerText || '')
    .replace(/\s+/g, ' ')
    .trim()
  const name =
    text ||
    el.getAttribute('aria-label') ||
    el.getAttribute('alt') ||
    tag
  const short = name.length > 16 ? `${name.slice(0, 16)}…` : name
  const w = Math.round(rect.width)
  const h = Math.round(rect.height)
  return `${tag} · ${short} · ${w}×${h}`
}

function resolveHit(node, pageEl) {
  let el = node
  // 命中 svg 内部的 path 时，吸附到整颗图标
  if (typeof SVGElement !== 'undefined' && el instanceof SVGElement) {
    const svg = el.ownerSVGElement || el
    if (pageEl.contains(svg)) el = svg
  }
  return el
}

/**
 * @param {number} x 视口坐标
 * @param {number} y 视口坐标
 * @param {HTMLElement} pageEl 可被点选的页面根（滚动容器）
 * @returns {Element | null} 没有可吸附元素时返回 null，调用方保持按钮尺寸跟随指针
 */
export function pickElement(x, y, pageEl) {
  // 点选 UI 盖在页面上，探测时临时关掉它的命中，才能看到下面的真实元素
  const uiNodes = document.querySelectorAll('[data-inspect-ui]')
  const saved = []
  uiNodes.forEach((node) => {
    saved.push(node.style.pointerEvents)
    node.style.pointerEvents = 'none'
  })

  let stack = []
  try {
    stack = document.elementsFromPoint(x, y)
  } finally {
    uiNodes.forEach((node, index) => {
      node.style.pointerEvents = saved[index]
    })
  }

  const pageRect = pageEl.getBoundingClientRect()
  for (const node of stack) {
    if (!(node instanceof Element)) continue
    if (node.closest('[data-inspect-ui]')) continue
    if (!pageEl.contains(node) || node === pageEl) continue

    const el = resolveHit(node, pageEl)
    if (el.hasAttribute('data-inspect-skip')) continue

    const rect = el.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) continue
    // 和视口一样大的壳层没有「被选中」的意义，留给原尺寸光标
    if (rect.width >= pageRect.width - 2 && rect.height >= pageRect.height - 2) continue
    return el
  }
  return null
}
