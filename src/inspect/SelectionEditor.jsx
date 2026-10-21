import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import EditorVoiceBar from './EditorVoiceBar.jsx'
import IosKeyboard from './IosKeyboard.jsx'
import SelectionField from './SelectionField.jsx'
import useInspectVoice from './useInspectVoice.js'

/**
 * 底部输入。未进入修改态时只留一行 textarea；
 * 点它之后升起上一轮的输入卡片和模拟键盘，草稿内容两边共用。
 */
export default function SelectionEditor({
  expanded,
  segments,
  cursor,
  onActivate,
  onCollapse,
  onInsert,
  onBackspace,
  onMove,
  onRestore,
  onSend,
}) {
  const onCollapseRef = useRef(onCollapse)
  const onInsertRef = useRef(onInsert)
  const onBackspaceRef = useRef(onBackspace)
  const onMoveRef = useRef(onMove)
  onCollapseRef.current = onCollapse
  onInsertRef.current = onInsert
  onBackspaceRef.current = onBackspace
  onMoveRef.current = onMove

  const voice = useInspectVoice({ expanded, segments, cursor, onInsert, onRestore })
  const voiceModeRef = useRef(voice.mode)
  const keepVoiceRef = useRef(voice.keepAndExit)
  const undoVoiceRef = useRef(voice.undoAndExit)
  const imeRef = useRef(null)
  voiceModeRef.current = voice.mode
  keepVoiceRef.current = voice.keepAndExit
  undoVoiceRef.current = voice.undoAndExit

  // 展开后把焦点放进这条看不见的框，桌面拼音才有地方组词
  useEffect(() => {
    if (!expanded) return undefined
    imeRef.current?.focus({ preventScroll: true })
    return undefined
  }, [expanded])

  // 只有键盘修改态接收实体按键；收起后页面点选继续用同一份草稿。
  // 组词中不 preventDefault、不逐字母插入；上屏整段走 compositionend。
  useEffect(() => {
    if (!expanded) return undefined
    let composing = false
    const imeKey = (e) => composing || e.isComposing || e.keyCode === 229 || e.key === 'Process'
    const onCompositionStart = () => {
      composing = true
    }
    const onCompositionEnd = (e) => {
      composing = false
      const target = e.target
      // 底栏那条真实输入自己写入草稿，避免同一段中文插两次
      if (target instanceof Element && target.dataset.inspectIme === 'bar') return
      if (imeRef.current && target === imeRef.current) imeRef.current.value = ''
      const data = e.data
      if (data) flushSync(() => onInsertRef.current(data))
    }
    const onKey = (e) => {
      // 退格和字母都留给输入法，等 compositionend 再整段插入
      if (imeKey(e)) return
      const voiceMode = voiceModeRef.current
      // 点击进入的语音：Esc 撤回，Enter 采用。和语音页同一套，不收起键盘
      if (voiceMode === 'voice-click' && (e.key === 'Escape' || e.key === 'Enter')) {
        e.preventDefault()
        if (e.key === 'Escape') undoVoiceRef.current()
        else keepVoiceRef.current()
        return
      }
      if (voiceMode === 'voice-hold' && e.key === 'Escape') {
        e.preventDefault()
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        onCollapseRef.current()
        return
      }
      if (e.key === 'Backspace') {
        e.preventDefault()
        onBackspaceRef.current()
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        onInsertRef.current('\n')
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onMoveRef.current(-1)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        onMoveRef.current(1)
        return
      }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        onInsertRef.current(e.key)
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('compositionstart', onCompositionStart)
    window.addEventListener('compositionend', onCompositionEnd)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('compositionstart', onCompositionStart)
      window.removeEventListener('compositionend', onCompositionEnd)
    }
  }, [expanded])

  if (!expanded) {
    return (
      <div className="absolute inset-x-0 bottom-0 z-40 px-3 pb-[14px]" data-inspect-ui data-inspect-chrome>
        <SelectionField segments={segments} cursor={cursor} framed onActivate={onActivate} />
      </div>
    )
  }

  return (
    <div
      className="editor-rise absolute inset-x-0 bottom-0 z-50"
      data-inspect-ui
      data-inspect-chrome
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="px-3 pb-2">
        <div className="rounded-[22px] bg-white px-3.5 pb-2.5 pt-3 shadow-[0_10px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04]">
          <div className="relative">
            <SelectionField segments={segments} cursor={cursor} showCaret />
            {/* 只接输入法，不另画一行；文字仍由上方草稿展示 */}
            <textarea
              ref={imeRef}
              rows={1}
              wrap="off"
              data-inspect-ime="editor"
              aria-label="拼音输入"
              autoComplete="off"
              spellCheck={false}
              style={{ height: 40, minHeight: 40, maxHeight: 40 }}
              className="absolute inset-0 z-10 box-border block w-full resize-none overflow-hidden whitespace-nowrap border-0 bg-transparent px-3.5 py-0 text-[16px] leading-10 text-transparent caret-transparent outline-none"
            />
          </div>

          {voice.active ? (
            <EditorVoiceBar mode={voice.mode} onUndo={voice.undoAndExit} onStop={voice.keepAndExit} />
          ) : (
            <div className="mt-3 flex items-center">
              <button
                type="button"
                aria-label="添加"
                className="flex h-8 w-8 items-center justify-center border-0 bg-transparent p-0 text-[#8e8e93]"
              >
                <PlusIcon />
              </button>
              <div className="ml-auto flex items-center gap-2.5">
                <button
                  type="button"
                  aria-label="语音"
                  data-inspect-chrome
                  data-tip="按住 Ctrl / ⌘ 语音输入"
                  className="tip tip--end flex h-8 w-8 touch-none items-center justify-center rounded-full border border-[#e1e1e4] bg-white p-0 text-[#1c1c1e]"
                  onPointerDown={voice.onMicPointerDown}
                >
                  <MicIcon />
                </button>
                <button
                  type="button"
                  aria-label="发送"
                  className="flex h-8 w-8 items-center justify-center rounded-full border-0 bg-[#1c1c1e] p-0 text-white"
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    // 多选发送：把当前草稿发出去，而不是只收起键盘
                    onSend?.()
                  }}
                >
                  <ArrowUpIcon />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <IosKeyboard onInsert={onInsert} onBackspace={onBackspace} />
    </div>
  )
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4.2v11.6M4.2 10h11.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="6" y="1.6" width="4" height="7.2" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 7.4a4 4 0 0 0 8 0M8 11.4V14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function ArrowUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 12.5V3.8M4.4 7.2 8 3.6l3.6 3.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
