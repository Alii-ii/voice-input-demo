/** 输入草稿：文本片段和选区标签交错，光标只落在文本片段里 */

export function createDraft() {
  return {
    segments: [{ type: 'text', value: '' }],
    cursor: { i: 0, offset: 0 },
  }
}

export function plainText(segments) {
  return segments.map((seg) => (seg.type === 'tag' ? seg.label || `选区${seg.n}` : seg.value)).join('')
}

/** 光标在 plainText 中的位置，单行输入据此把插入点滚进可视区 */
export function plainCaret(segments, cursor) {
  let pos = 0
  for (let i = 0; i < segments.length; i += 1) {
    if (cursor && i === cursor.i) return pos + (cursor.offset || 0)
    const seg = segments[i]
    pos += seg.type === 'tag' ? (seg.label || `选区${seg.n}`).length : (seg.value || '').length
  }
  return pos
}

/** 在光标处插入普通文本 */
export function insertText(draft, text) {
  if (!text) return draft
  const { segments, cursor } = draft
  const seg = segments[cursor.i]
  if (!seg || seg.type !== 'text') return draft
  const value = seg.value.slice(0, cursor.offset) + text + seg.value.slice(cursor.offset)
  const next = segments.slice()
  next[cursor.i] = { type: 'text', value }
  return {
    segments: next,
    cursor: { i: cursor.i, offset: cursor.offset + text.length },
  }
}

/** 在光标处插入一枚选区标签，光标移到标签后面 */
export function insertTag(draft, tag) {
  const { segments, cursor } = draft
  const seg = segments[cursor.i]
  if (!seg || seg.type !== 'text') return draft
  const before = seg.value.slice(0, cursor.offset)
  const after = seg.value.slice(cursor.offset)
  const next = [
    ...segments.slice(0, cursor.i),
    { type: 'text', value: before },
    { type: 'tag', n: tag.n, summary: tag.summary },
    { type: 'text', value: after },
    ...segments.slice(cursor.i + 1),
  ]
  return { segments: next, cursor: { i: cursor.i + 2, offset: 0 } }
}

/**
 * 退格。删到标签时整枚移除，并带回序号，方便同步清掉页面上的选区。
 * 返回 { draft, removed }，removed 为被删标签的序号或 null。
 */
export function backspace(draft) {
  const { segments, cursor } = draft
  const seg = segments[cursor.i]
  if (!seg || seg.type !== 'text') return { draft, removed: null }
  if (cursor.offset > 0) {
    const value = seg.value.slice(0, cursor.offset - 1) + seg.value.slice(cursor.offset)
    const next = segments.slice()
    next[cursor.i] = { type: 'text', value }
    return {
      draft: { segments: next, cursor: { i: cursor.i, offset: cursor.offset - 1 } },
      removed: null,
    }
  }
  if (cursor.i < 2) return { draft, removed: null }
  const prev = segments[cursor.i - 1]
  const before = segments[cursor.i - 2]
  if (prev?.type !== 'tag' || before?.type !== 'text') return { draft, removed: null }
  const merged = { type: 'text', value: before.value + seg.value }
  const next = [...segments.slice(0, cursor.i - 2), merged, ...segments.slice(cursor.i + 1)]
  return {
    draft: { segments: next, cursor: { i: cursor.i - 2, offset: before.value.length } },
    removed: prev.n,
  }
}

/**
 * 删掉序号为 n 的标签，并把后面的序号减一。
 * 左右文本并回同一段，光标留在合并后的文本里。
 */
export function removeTag(draft, n) {
  const { segments, cursor } = draft
  const tagIndex = segments.findIndex((seg) => seg.type === 'tag' && seg.n === n)
  if (tagIndex < 1) return draft
  const before = segments[tagIndex - 1]
  const after = segments[tagIndex + 1]
  if (!before || before.type !== 'text' || !after || after.type !== 'text') return draft
  const merged = { type: 'text', value: before.value + after.value }
  const next = [
    ...segments.slice(0, tagIndex - 1),
    merged,
    ...segments.slice(tagIndex + 2),
  ].map((seg) => (seg.type === 'tag' && seg.n > n ? { ...seg, n: seg.n - 1 } : seg))
  let i = cursor.i
  let offset = cursor.offset || 0
  if (i === tagIndex + 1) {
    i = tagIndex - 1
    offset = before.value.length + offset
  } else if (i > tagIndex + 1) {
    i -= 2
  }
  if (!next[i] || next[i].type !== 'text') {
    i = 0
    offset = 0
  }
  offset = Math.min(offset, next[i].value.length)
  return { segments: next, cursor: { i, offset } }
}

/** 左右移动。标签算一步，光标从标签一侧跳到另一侧 */
export function moveCursor(draft, delta) {
  let { i, offset } = draft.cursor
  const { segments } = draft
  if (delta < 0) {
    if (offset > 0) offset -= 1
    else if (i >= 2 && segments[i - 2]?.type === 'text') {
      i -= 2
      offset = segments[i].value.length
    }
  } else if (delta > 0) {
    const seg = segments[i]
    if (seg && offset < seg.value.length) offset += 1
    else if (i + 2 < segments.length && segments[i + 2]?.type === 'text') {
      i += 2
      offset = 0
    }
  }
  return { ...draft, cursor: { i, offset } }
}
