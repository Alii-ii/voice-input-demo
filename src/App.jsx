import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Waveform from './Waveform.jsx'

/**
 * 交互状态机
 *  - idle        默认空态：+ / 模型选择 / 合并后的麦克风按钮
 *  - text        已输入文字：+ / 模型选择 / 麦克风 / 发送
 *  - voice-click 点击麦克风进入的语音输入：仅能点击按钮退出；左侧有【撤回】按钮
 *  - voice-hold  按住快捷键进入的语音输入：松开即退出（无延迟）；无撤回，更轻更快
 */

// 模拟 ASR：逐段吐字，插入到光标处
const ASR_CHUNKS = [
  '基于', '光标', '所在', '位置，', '实时地', '插入', '识别', '出来的', '文字',
]
const CLICK_HINT = '说话，基于光标所在位置，实时地插入识别文字…'
const HOLD_HINT = '说话，基于光标所在位置，实时地插入识别文字…'

const HOLD_THRESHOLD = 400 // 按住判定延迟 0.4s，用于防抖

export default function App() {
  const [text, setText] = useState('')
  const [mode, setMode] = useState('idle') // idle | text | voice-click | voice-hold

  const inputRef = useRef(null)
  const caretRef = useRef(0) // 语音插入位置
  const textRef = useRef('') // 始终指向最新 text
  textRef.current = text
  const pendingCaretRef = useRef(null) // 需要在渲染后恢复的原生光标位置
  const asrIndexRef = useRef(0)
  const asrTimerRef = useRef(null)
  const snapshotRef = useRef({ text: '', caret: 0 }) // 撤回快照 (仅点击进入时用)

  const holdTimerRef = useRef(null)
  const holdActiveRef = useRef(false)
  const modeRef = useRef(mode)
  modeRef.current = mode

  const isVoice = mode === 'voice-click' || mode === 'voice-hold'

  // ---------- 语音识别模拟 ----------
  // 每次吐字都读取 textarea 当前光标，支持语音过程中手动移动光标 / 编辑
  const startAsr = useCallback(() => {
    asrIndexRef.current = 0
    const tick = () => {
      const chunk = ASR_CHUNKS[asrIndexRef.current % ASR_CHUNKS.length]
      asrIndexRef.current += 1
      const el = inputRef.current
      const pos =
        el && typeof el.selectionStart === 'number' ? el.selectionStart : caretRef.current
      setText((prev) => prev.slice(0, pos) + chunk + prev.slice(pos))
      const next = pos + chunk.length
      caretRef.current = next
      pendingCaretRef.current = next // 渲染后把光标移动到插入点之后
      asrTimerRef.current = window.setTimeout(tick, 420)
    }
    asrTimerRef.current = window.setTimeout(tick, 500)
  }, [])

  const stopAsr = useCallback(() => {
    if (asrTimerRef.current) {
      clearTimeout(asrTimerRef.current)
      asrTimerRef.current = null
    }
  }, [])

  // ---------- 进入 / 退出 语音模式 ----------
  const enterVoice = useCallback(
    (via) => {
      if (modeRef.current === 'voice-click' || modeRef.current === 'voice-hold') return
      const el = inputRef.current
      const caret = el && typeof el.selectionStart === 'number' ? el.selectionStart : text.length
      caretRef.current = caret
      snapshotRef.current = { text, caret }
      pendingCaretRef.current = caret // 进入语音时把原生光标聚焦到插入点
      setMode(via === 'hold' ? 'voice-hold' : 'voice-click')
      startAsr()
    },
    [text, startAsr],
  )

  const settleMode = useCallback((value) => {
    setMode(value.trim().length > 0 ? 'text' : 'idle')
  }, [])

  // 保留文本并退出 (点击停止按钮 / 松开快捷键)
  const keepAndExit = useCallback(() => {
    stopAsr()
    pendingCaretRef.current = caretRef.current
    settleMode(textRef.current)
  }, [stopAsr, settleMode])

  // 撤回文本插入并退出 (仅点击进入模式支持)
  const undoAndExit = useCallback(() => {
    stopAsr()
    const snap = snapshotRef.current
    pendingCaretRef.current = snap.caret
    setText(snap.text)
    settleMode(snap.text)
  }, [stopAsr, settleMode])

  // ---------- textarea 自适应高度（与语音文本区逐行对齐，避免切换跳动） ----------
  const autoGrow = useCallback((el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  // 渲染后：自适应高度 + 把原生光标恢复到插入点（语音态同样生效，保持可编辑）
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    autoGrow(el)
    if (pendingCaretRef.current != null) {
      const p = pendingCaretRef.current
      el.focus()
      try {
        el.setSelectionRange(p, p)
      } catch {}
      pendingCaretRef.current = null
    }
  }, [mode, text, isVoice, autoGrow])

  // ---------- 快捷键：按住 (0.4s 判定) 进入，松开退出 ----------
  useEffect(() => {
    const isHoldKey = (e) => e.key === 'Control' || e.key === 'Meta'

    const onKeyDown = (e) => {
      if (!isHoldKey(e)) return
      if (e.repeat) return
      if (holdActiveRef.current) return
      if (modeRef.current === 'voice-click') return // 点击模式下不响应快捷键
      e.preventDefault()
      holdTimerRef.current = window.setTimeout(() => {
        holdActiveRef.current = true
        enterVoice('hold')
      }, HOLD_THRESHOLD)
    }

    const onKeyUp = (e) => {
      if (!isHoldKey(e)) return
      // 还没到判定阈值 -> 当作误触，取消 (防抖)
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current)
        holdTimerRef.current = null
      }
      // 已进入 hold 语音模式 -> 松开即退出，无延迟，保留文本
      if (holdActiveRef.current && modeRef.current === 'voice-hold') {
        holdActiveRef.current = false
        keepAndExit()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [enterVoice, keepAndExit])

  // ---------- 快捷键：点击进入模式下 Esc 撤回 / Enter 采用 ----------
  useEffect(() => {
    const onKeyDown = (e) => {
      if (modeRef.current !== 'voice-click') return
      if (e.key === 'Escape') {
        e.preventDefault()
        undoAndExit()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        keepAndExit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undoAndExit, keepAndExit])

  // ---------- 普通输入（语音态下也可继续手动编辑） ----------
  const onChange = (e) => {
    const el = e.target
    const v = el.value
    setText(v)
    if (modeRef.current !== 'voice-click' && modeRef.current !== 'voice-hold') {
      setMode(v.trim().length > 0 ? 'text' : 'idle')
    }
    autoGrow(el)
    if (typeof el.selectionStart === 'number') caretRef.current = el.selectionStart
  }

  // 手动移动光标时同步插入位置，语音会从新的光标处继续插入
  const onSelectCaret = (e) => {
    const el = e.target
    if (typeof el.selectionStart === 'number') caretRef.current = el.selectionStart
  }

  // Enter 发送、Shift+Enter 换行（语音态交给全局快捷键处理，这里不拦截）
  const onKeyDown = (e) => {
    if (modeRef.current === 'voice-click' || modeRef.current === 'voice-hold') return
    if (e.key !== 'Enter' || e.shiftKey) return
    if (e.nativeEvent?.isComposing) return // 输入法组词中，回车用于选词，不发送
    e.preventDefault()
    if (textRef.current.trim().length > 0) onSend()
  }

  const onSend = () => {
    setText('')
    setMode('idle')
    inputRef.current?.focus()
  }

  const hint = mode === 'voice-hold' ? HOLD_HINT : CLICK_HINT

  return (
    <div className="stage">
      <div className="scene">
        <p className="scene-title">
          语音输入交互探索 · <span>{modeLabel(mode)}</span>
        </p>

        <div className={`composer ${isVoice ? 'composer--voice' : ''}`}>
          <div className="row">
            <div className="input-wrap">
              <textarea
                ref={inputRef}
                className="text-input"
                value={text}
                placeholder={isVoice ? hint : 'placeholder…'}
                onChange={onChange}
                onSelect={onSelectCaret}
                onKeyDown={onKeyDown}
                rows={1}
                spellCheck={false}
              />
            </div>

            {isVoice ? (
              <VoiceBar mode={mode} onUndo={undoAndExit} onStop={keepAndExit} />
            ) : (
              <Controls
                hasText={mode === 'text'}
                onMic={() => enterVoice('click')}
                onSend={onSend}
              />
            )}
          </div>
        </div>

        <Legend mode={mode} />
      </div>
    </div>
  )
}

function modeLabel(mode) {
  return {
    idle: '默认空态',
    text: '已输入 / 直接输入',
    'voice-click': '点击进入 · 语音输入',
    'voice-hold': '按住快捷键 · 语音输入',
  }[mode]
}

/* ---------------- 底部控件行（空态 / 文本态） ---------------- */
function Controls({ hasText, onMic, onSend }) {
  return (
    <div className="controls">
      <button className="icon-btn plus" title="添加">
        <PlusIcon />
      </button>
      <button className="model-pill" title="模型选择">
        Step 4 Flash <Chevron />
      </button>
      <button
        className={`icon-btn mic tip tip--end ${hasText ? '' : 'mic--merged'}`}
        onClick={onMic}
        data-tip="按住 Ctrl / ⌘ 语音输入"
      >
        <MicIcon />
      </button>
      {/* 发送按钮常驻，通过 CSS 在合并/展开间做 100ms 过渡 */}
      <button
        className={`icon-btn send ${hasText ? '' : 'send--hidden'}`}
        onClick={onSend}
        title="发送"
        tabIndex={hasText ? 0 : -1}
        aria-hidden={!hasText}
      >
        <ArrowUp />
      </button>
    </div>
  )
}

/* ---------------- 语音底部行 ---------------- */
function VoiceBar({ mode, onUndo, onStop }) {
  const isHold = mode === 'voice-hold'
  return (
    <div className="voice-bar">
      {isHold ? (
        <span className="release-hint">
          <span>松开</span>
          <span>退出</span>
        </span>
      ) : (
        <button className="undo-btn tip tip--start" onClick={onUndo} data-tip="Esc 撤回并退出">
          <UndoIcon />
        </button>
      )}

      <Waveform className="wave" />

      <button className="stop-btn tip tip--end" onClick={onStop} data-tip="Enter 采用并退出">
        <span className="stop-square" />
      </button>
    </div>
  )
}

/* ---------------- 说明浮层 ---------------- */
function Legend({ mode }) {
  const items = [
    { key: 'idle', text: '空态：麦克风与发送合并，黑底强调' },
    { key: 'merge', text: '有字/空态切换：麦克风 ↔ 发送 100ms 过渡' },
    { key: 'hold', text: '按住 Ctrl / ⌘ 0.4s：判定延迟防抖' },
    { key: 'click', text: '点击进入：可撤回，Esc / Enter 退出' },
    { key: 'edit', text: '语音中可继续打字，按光标插入识别文字' },
  ]
  return (
    <div className="legend">
      <p>试一试：</p>
      <ul>
        <li>直接键入文字 → 出现发送按钮；<kbd>Enter</kbd> 发送、<kbd>Shift</kbd>+<kbd>Enter</kbd> 换行（分支一）</li>
        <li>点击 🎙 麦克风 → 进入语音，只能点按钮退出，左侧可「撤回」；<kbd>Esc</kbd> 撤回并退出、<kbd>Enter</kbd> 采用并退出（分支二）</li>
        <li>按住 <kbd>Ctrl</kbd> / <kbd>⌘</kbd> 约 0.4s → 进入语音，松开即退出、更轻更快（分支三）</li>
        <li>语音输入过程中 textarea 不禁用：可继续手动编辑，识别文字实时插入到当前光标位置</li>
        <li>hover 任意带快捷键的按钮 0.4s → 弹出快捷键提示</li>
      </ul>
      <div className="legend-tags">
        {items.map((it) => (
          <span key={it.key} className="tag">
            {it.text}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ---------------- 图标 ---------------- */
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function ArrowUp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function UndoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M9 14L4 9l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
