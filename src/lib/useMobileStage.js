import { useEffect, useState } from 'react'

/**
 * 移动端预览：看视口，不看 UA。
 * 窄于 768，或粗指针且放不下「手机框 + 外侧说明」（说明从 xl / 1280 才排得开）。
 * 转屏和拖窗口时 matchMedia / resize 都会再判一次。
 */
const MOBILE_STAGE_QUERIES = ['(max-width: 767px)', '(pointer: coarse) and (max-width: 1279px)']

export function isMobileStage() {
  if (typeof window === 'undefined') return false
  return MOBILE_STAGE_QUERIES.some((query) => window.matchMedia(query).matches)
}

export function subscribeMobileStage(onChange) {
  const lists = MOBILE_STAGE_QUERIES.map((query) => window.matchMedia(query))
  const notify = () => onChange(isMobileStage())
  lists.forEach((list) => list.addEventListener('change', notify))
  window.addEventListener('resize', notify)
  return () => {
    lists.forEach((list) => list.removeEventListener('change', notify))
    window.removeEventListener('resize', notify)
  }
}

export function useMobileStage() {
  const [mobile, setMobile] = useState(isMobileStage)
  useEffect(() => subscribeMobileStage(setMobile), [])
  return mobile
}
