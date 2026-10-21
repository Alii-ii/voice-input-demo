/** 单选临时草稿：一枚会替换的元素标签 + 一段听写文本，跟多选草稿分开 */

export function createSoloDraft() {
  return { tag: null, speech: '' }
}

/** 换元素只替换首位标签，听写文本留在末尾 */
export function replaceSoloTag(draft, tag) {
  return { ...draft, tag }
}

/** 新识别片段接在当前文本后面，不把整段旧结果再拼一次 */
export function appendSoloSpeech(draft, chunk) {
  if (!chunk) return draft
  return { ...draft, speech: draft.speech + chunk }
}

export function soloToSegments(draft) {
  const speech = draft?.speech || ''
  if (!draft?.tag) {
    return {
      segments: [{ type: 'text', value: speech }],
      cursor: { i: 0, offset: speech.length },
    }
  }
  return {
    segments: [
      { type: 'text', value: '' },
      { type: 'tag', n: 'live', label: draft.tag.text, summary: draft.tag.summary },
      { type: 'text', value: speech },
    ],
    cursor: { i: 2, offset: speech.length },
  }
}

/** 有元素或有识别文字才组成一条消息，否则返回空串 */
export function formatSoloMessage(tag, speech) {
  const name = tag?.text?.trim() || ''
  const said = speech?.trim() || ''
  if (!name && !said) return ''
  if (name && said) return `${name} ${said}`
  return name || said
}
