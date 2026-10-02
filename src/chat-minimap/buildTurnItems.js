/**
 * 把扁平消息列表收成「一轮一条」的 minimap items。
 * 约定：消息按 user, assistant, user, assistant… 交错排列。
 *
 * @param {Array<{ id: string, role?: string, title?: string, content?: string }>} messages
 * @returns {Array<{ id: string, title: string, anchorId: string, userText: string, assistantText: string }>}
 */
export function buildTurnItems(messages = []) {
  const list = []
  for (let i = 0; i * 2 < messages.length; i++) {
    const user = messages[i * 2]
    const assistant = messages[i * 2 + 1]
    list.push({
      id: `turn-${i}`,
      title: user?.title ?? `第 ${i + 1} 轮`,
      anchorId: user?.id,
      userText: user?.content ?? '',
      assistantText: assistant?.content ?? '',
    })
  }
  return list
}

/** 消息 id → 轮索引（user/assistant 成对时） */
export function turnIndexOfMessage(messages, messageId) {
  const idx = messages.findIndex((m) => m.id === messageId)
  if (idx < 0) return 0
  return Math.floor(idx / 2)
}
