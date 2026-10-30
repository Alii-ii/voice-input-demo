import { useEffect, useRef, useState } from 'react'
import { startDictation } from './dictation.js'

/**
 * 与语音页（src/App.jsx）同一套节奏：
 * 点麦克风进入 voice-click，按住 0.4s 进入 voice-hold，松开保留文字。
 * 识别片段走调用方的 insert，插在当前光标，不另写一条输入路径。
 */
const HOLD_THRESHOLD = 400

export default function useInspectVoice({ expanded, segments, cursor, onInsert, onRestore }) {
  const [mode, setMode] = useState('idle') // idle | voice-click | voice-hold
  const modeRef = useRef(mode)
  modeRef.current = mode

  const onInsertRef = useRef(onInsert)
  const onRestoreRef = useRef(onRestore)
  const draftRef = useRef({ segments, cursor })
  onInsertRef.current = onInsert
  onRestoreRef.current = onRestore
  draftRef.current = { segments, cursor }

  const snapshotRef = useRef(null)
  const stopDictationRef = useRef(null)
  const holdTimerRef = useRef(null)
  const holdActiveRef = useRef(false)
  const gestureRef = useRef(null)

  const stopAsr = () => {
    stopDictationRef.current?.()
    stopDictationRef.current = null
  }

  const startAsr = () => {
    stopAsr()
    stopDictationRef.current = startDictation((chunk) => onInsertRef.current?.(chunk))
  }

  const enterVoice = (via) => {
    if (modeRef.current === 'voice-click' || modeRef.current === 'voice-hold') return
    const { segments: segs, cursor: cur } = draftRef.current
    snapshotRef.current = {
      segments: segs.map((seg) => ({ ...seg })),
      cursor: { ...cur },
    }
    modeRef.current = via === 'hold' ? 'voice-hold' : 'voice-click'
    setMode(modeRef.current)
    startAsr()
  }

  const keepAndExit = () => {
    stopAsr()
    holdActiveRef.current = false
    modeRef.current = 'idle'
    setMode('idle')
  }

  const undoAndExit = () => {
    stopAsr()
    holdActiveRef.current = false
    modeRef.current = 'idle'
    const snap = snapshotRef.current
    if (snap) onRestoreRef.current?.(snap)
    setMode('idle')
  }

  // 麦克风上的手势：短按等于语音页的点击进入；按住超过阈值等于松开即退出
  const onMicPointerDown = (e) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const pointerId = e.pointerId
    const timer = window.setTimeout(() => {
      const gesture = gestureRef.current
      if (!gesture || gesture.pointerId !== pointerId) return
      gesture.held = true
      enterVoice('hold')
    }, HOLD_THRESHOLD)
    const finish = (ev) => {
      if (ev.pointerId !== pointerId) return
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      const gesture = gestureRef.current
      gestureRef.current = null
      if (gesture?.timer) clearTimeout(gesture.timer)
      if (gesture?.held) keepAndExit()
      else enterVoice('click')
    }
    gestureRef.current = { pointerId, timer, held: false, finish }
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }

  // 跟语音页一样：编辑态里按住 Ctrl / ⌘ 0.4s 进入，松开保留文字
  useEffect(() => {
    if (!expanded) return undefined
    const isHoldKey = (e) => e.key === 'Control' || e.key === 'Meta'
    const onKeyDown = (e) => {
      if (!isHoldKey(e) || e.repeat) return
      if (holdActiveRef.current) return
      if (modeRef.current === 'voice-click') return
      e.preventDefault()
      holdTimerRef.current = window.setTimeout(() => {
        holdActiveRef.current = true
        enterVoice('hold')
      }, HOLD_THRESHOLD)
    }
    const onKeyUp = (e) => {
      if (!isHoldKey(e)) return
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current)
        holdTimerRef.current = null
      }
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
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current)
        holdTimerRef.current = null
      }
    }
  }, [expanded])

  // 收起键盘或卸掉编辑器时停掉识别，避免文字继续往已关闭的会话里灌
  useEffect(() => {
    if (expanded) return undefined
    stopAsr()
    if (modeRef.current !== 'idle') {
      modeRef.current = 'idle'
      setMode('idle')
    }
    return undefined
  }, [expanded])

  useEffect(
    () => () => {
      stopAsr()
      const gesture = gestureRef.current
      if (!gesture) return
      clearTimeout(gesture.timer)
      if (gesture.finish) {
        window.removeEventListener('pointerup', gesture.finish)
        window.removeEventListener('pointercancel', gesture.finish)
      }
      gestureRef.current = null
    },
    [],
  )

  return {
    mode,
    active: mode === 'voice-click' || mode === 'voice-hold',
    onMicPointerDown,
    keepAndExit,
    undoAndExit,
  }
}
