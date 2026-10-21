/** 与语音页 App.jsx 同一套模拟听写：500ms 起，之后每 420ms 吐一个新片段 */

export const ASR_CHUNKS = ['基于', '光标', '所在', '位置，', '实时地', '插入', '识别', '出来的', '文字']

export function startDictation(onChunk) {
  let index = 0
  let timer = window.setTimeout(function tick() {
    onChunk(ASR_CHUNKS[index % ASR_CHUNKS.length])
    index += 1
    timer = window.setTimeout(tick, 420)
  }, 500)
  return () => window.clearTimeout(timer)
}
