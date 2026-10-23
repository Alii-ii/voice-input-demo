import { useCallback, useEffect, useRef, useState } from 'react'

/** 第一段：藏顶栏和输入框、预览铺满、图标变换 */
export const FS_ENTER_MS = 200
export const FS_ENTER_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

/** 第二段：两侧按钮贴边。退出和恢复输入框用同一条 ease-out */
export const FS_DOCK_MS = 150
export const FS_EXIT_MS = 200
export const FS_EASE_OUT = 'cubic-bezier(0, 0, 0.2, 1)'

/** 两指按住这么久进入多选，全屏和非全屏同一档 */
export const FS_TWO_FINGER_MS = 200

/** 底栏圆钮现在的左边距（px-4）；贴边后再把图标往外侧挪 4px */
export const FS_SIDE_INSET = 16
export const FS_EDGE_NUDGE = 4
/** 16 + 48 按钮 + gap-2.5，输入胶囊夹在两侧圆钮中间 */
export const FS_INPUT_INSET = 74

const ENTER = `${FS_ENTER_MS}ms ${FS_ENTER_EASE}`
const EXIT = `${FS_EXIT_MS}ms ${FS_EASE_OUT}`
const DOCK = `${FS_DOCK_MS}ms ${FS_EASE_OUT}`

/** 顶栏和预览：进入用回弹，退出一次 ease-out */
export function expandDuration(entering) {
  return entering ? ENTER : EXIT
}

/** 两侧按钮位置和外侧圆角 */
export function sideDuration(phase) {
  return phase === 'off' ? EXIT : DOCK
}

/** 输入框：进入全屏时跟着第一段藏起来，选中后再短 ease-out 回来 */
export function inputDuration(phase, entering) {
  if (phase === 'off') return EXIT
  if (phase === 'enter' || entering) return ENTER
  return DOCK
}

/**
 * 全屏阶段：
 * off 普通布局
 * enter 第一段进行中（顶栏和输入框在收，按钮还在原位）
 * dock 按钮贴边，输入框仍藏着
 * pick 选中态，输入框回来，按钮回到圆形并夹住输入框
 */
export function usePreviewFullscreen() {
  const [phase, setPhase] = useState('off')
  const [entering, setEntering] = useState(false)
  const phaseRef = useRef('off')
  const timerRef = useRef(0)
  const inputWantedRef = useRef(false)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const commit = useCallback((next) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const finishEnter = useCallback(() => {
    timerRef.current = 0
    setEntering(false)
    if (phaseRef.current !== 'enter') return
    commit(inputWantedRef.current ? 'pick' : 'dock')
  }, [commit])

  const toggle = useCallback(() => {
    window.clearTimeout(timerRef.current)
    timerRef.current = 0
    if (phaseRef.current === 'off') {
      setEntering(true)
      // 已经在选中态时不要先把输入框藏起来再弹出
      commit(inputWantedRef.current ? 'pick' : 'enter')
      timerRef.current = window.setTimeout(finishEnter, FS_ENTER_MS)
      return
    }
    setEntering(false)
    commit('off')
  }, [commit, finishEnter])

  // 正在点选或听写时恢复输入框；离开后从 pick 回到 dock。选区和执行中由调用方决定不传入 true
  const syncInput = useCallback(
    (show) => {
      inputWantedRef.current = show
      if (phaseRef.current === 'off') return
      if (show) {
        if (phaseRef.current !== 'pick') commit('pick')
        return
      }
      if (phaseRef.current === 'pick') commit('dock')
    },
    [commit],
  )

  return {
    phase,
    entering,
    fullscreen: phase !== 'off',
    toggle,
    syncInput,
  }
}
