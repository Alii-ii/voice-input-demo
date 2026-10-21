import Waveform from '../Waveform.jsx'

/**
 * 语音页底部那一行：点击进入时左侧可撤回，按住进入时提示松开退出，中间是同一条波形。
 */
export default function EditorVoiceBar({ mode, onUndo, onStop }) {
  const isHold = mode === 'voice-hold'
  return (
    <div className="mt-3 flex items-center gap-0" data-voice-mode={mode}>
      {isHold ? (
        <span className="flex h-[38px] w-[38px] shrink-0 flex-col items-center justify-center whitespace-nowrap text-[13px] leading-[1.15] text-muted-2">
          <span>松开</span>
          <span>退出</span>
        </span>
      ) : (
        <button
          type="button"
          className="tip tip--start inline-flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#3a3a3c] transition-[background,color,transform] duration-150 hover:bg-[#ffe3e3] hover:text-[#e5484d] active:scale-[0.92]"
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onUndo()
          }}
          data-tip="Esc 撤回并退出"
          aria-label="撤回"
        >
          <UndoIcon />
        </button>
      )}

      <Waveform className="min-w-0 flex-1 [mask-image:linear-gradient(to_right,transparent_0,#000_76px,#000_calc(100%-76px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0,#000_76px,#000_calc(100%-76px),transparent_100%)]" />

      <button
        type="button"
        className="tip tip--end inline-flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-dark-btn transition-[transform,background] duration-150 hover:bg-black active:scale-[0.92]"
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onStop()
        }}
        data-tip="Enter 采用并退出"
        aria-label="采用并退出"
      >
        <span className="h-[13px] w-[13px] rounded-[3px] bg-white" />
      </button>
    </div>
  )
}

function UndoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 14L4 9l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
