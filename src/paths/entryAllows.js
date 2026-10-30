import { longPressAllows } from './schemes/longPressTag.jsx'
import { twoFingerAllows } from './schemes/twoFingerSelect.jsx'

/** 点击进入、全屏下点击进入：点按钮进入，进入之后只划选 */
const CLICK_ENTRIES = new Set(['button-click', 'drag'])

/**
 * 当前方案是否放行这条入口。
 * entry：button-click、drag、tap、edge、two-finger、bar-hold、button-long-press
 * 方案 3、4 交给各自的 allows，前两个方案只留点击和划选。
 */
export function allowsEntry(scheme, entry) {
  if (scheme === 'two-finger') return twoFingerAllows(entry)
  if (scheme === 'long-press') return longPressAllows(entry)
  return CLICK_ENTRIES.has(entry)
}
