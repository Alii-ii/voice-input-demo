import EditorVoiceBar from './EditorVoiceBar.jsx'
import SelectionField from './SelectionField.jsx'
import { soloToSegments } from './soloDraft.js'

/**
 * 单选按住时的临时输入。始终一行，不升起键盘。
 * 麦克风一行用语音页的按住听写态（松开提示 + 波形）。
 */
export default function SoloComposer({ draft }) {
  const view = soloToSegments(draft)
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-40 px-3 pb-[14px]"
      data-inspect-ui
      data-inspect-chrome
      data-solo="true"
    >
      <div className="rounded-[22px] bg-white px-3.5 pb-2.5 pt-3 shadow-[0_10px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04]">
        <SelectionField segments={view.segments} cursor={view.cursor} showCaret />
        <EditorVoiceBar mode="voice-hold" onUndo={() => {}} onStop={() => {}} />
      </div>
    </div>
  )
}
