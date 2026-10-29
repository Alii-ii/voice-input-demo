/**
 * 输入框上的 Enter。
 * 组词中（isComposing 或 keyCode 229）返回 null，只确认候选，不发送也不换行。
 * Shift+Enter 换行，单独的 Enter 发送。
 */
export function draftEnterAction(event) {
  if (!event || event.key !== 'Enter') return null
  if (event.isComposing || event.keyCode === 229 || event.key === 'Process') return null
  return event.shiftKey ? 'break' : 'send'
}
