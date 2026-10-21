import { useEffect, useRef, useState } from 'react'
import DeviceFrame from './DeviceFrame.jsx'
import { startDictation } from './dictation.js'
import ElementPicker from './ElementPicker.jsx'
import SelectionEditor from './SelectionEditor.jsx'
import SoloComposer from './SoloComposer.jsx'
import StudyRoomPage from './StudyRoomPage.jsx'
import { backspace, createDraft, insertTag, insertText, moveCursor, plainCaret, plainText } from './selectionDraft.js'
import { appendSoloSpeech, createSoloDraft, formatSoloMessage, replaceSoloTag } from './soloDraft.js'

/** 发出后若没点停止，大约 5 秒回到空闲底栏 */
const AGENT_RUN_MS = 5000

/** 移动端点选编辑实验台：手机框里放预约页，右下角进入检查元素 */
export default function InspectLab() {
  const phoneRef = useRef(null)
  const pageRef = useRef(null)
  const fabSlotRef = useRef(null)
  const [regions, setRegions] = useState([])
  const [draft, setDraft] = useState(() => createDraft())
  const [editing, setEditing] = useState(false)
  const [soloDraft, setSoloDraft] = useState(null)
  const [lastSent, setLastSent] = useState('')
  const [resetEpoch, setResetEpoch] = useState(0)
  const [running, setRunning] = useState(false)
  const runTimerRef = useRef(0)

  useEffect(() => () => window.clearTimeout(runTimerRef.current), [])

  // 有内容发出去之后，底栏进入进行中；再发一次会重新计时
  const startRunning = () => {
    window.clearTimeout(runTimerRef.current)
    setRunning(true)
    runTimerRef.current = window.setTimeout(() => {
      runTimerRef.current = 0
      setRunning(false)
    }, AGENT_RUN_MS)
  }

  const stopRunning = () => {
    window.clearTimeout(runTimerRef.current)
    runTimerRef.current = 0
    setRunning(false)
  }

  // 事件回调里读最新值，避免塞进 setState 更新函数里做副作用
  const regionsRef = useRef(regions)
  const draftRef = useRef(draft)
  const soloRef = useRef(null)
  const stopSoloRef = useRef(null)
  regionsRef.current = regions
  draftRef.current = draft

  const addSelection = (info) => {
    if (regionsRef.current.some((region) => region.el === info.el)) return
    const n = regionsRef.current.reduce((max, region) => Math.max(max, region.n), 0) + 1
    const nextRegions = [
      ...regionsRef.current,
      { n, el: info.el, summary: info.summary, text: info.text },
    ]
    const nextDraft = insertTag(draftRef.current, { n, summary: info.summary })
    regionsRef.current = nextRegions
    draftRef.current = nextDraft
    setRegions(nextRegions)
    setDraft(nextDraft)
  }

  const onInsert = (text) => {
    const next = insertText(draftRef.current, text)
    draftRef.current = next
    setDraft(next)
  }

  const onMove = (delta) => {
    const next = moveCursor(draftRef.current, delta)
    draftRef.current = next
    setDraft(next)
  }

  const onBackspace = () => {
    const { draft: next, removed } = backspace(draftRef.current)
    if (removed != null) {
      const nextRegions = regionsRef.current.filter((region) => region.n !== removed)
      regionsRef.current = nextRegions
      setRegions(nextRegions)
      if (nextRegions.length === 0) {
        const empty = createDraft()
        draftRef.current = empty
        setDraft(empty)
        setEditing(false)
        return
      }
    }
    draftRef.current = next
    setDraft(next)
  }

  const stopSoloDictation = () => {
    stopSoloRef.current?.()
    stopSoloRef.current = null
  }

  // 单选用临时草稿，不改多选的 regions / draft
  const onSoloStart = () => {
    stopSoloDictation()
    const next = createSoloDraft()
    soloRef.current = next
    setSoloDraft(next)
    setEditing(false)
    stopSoloRef.current = startDictation((chunk) => {
      const cur = soloRef.current
      if (!cur) return
      const updated = appendSoloSpeech(cur, chunk)
      soloRef.current = updated
      setSoloDraft(updated)
    })
  }

  const onSoloTarget = (info) => {
    const cur = soloRef.current
    if (!cur) return
    const tag = info ? { text: info.text, summary: info.summary } : null
    if ((cur.tag?.text || '') === (tag?.text || '') && (cur.tag?.summary || '') === (tag?.summary || '')) return
    const updated = replaceSoloTag(cur, tag)
    soloRef.current = updated
    setSoloDraft(updated)
  }

  const onSoloFinish = (info) => {
    stopSoloDictation()
    const cur = soloRef.current
    const tag = info ? { text: info.text, summary: info.summary } : null
    const message = formatSoloMessage(tag, cur?.speech || '')
    soloRef.current = null
    setSoloDraft(null)
    if (message) {
      setLastSent(message)
      startRunning()
    }
  }

  // 多选发送：记下这条消息，选区、键盘和跟手都回到进入点选前；有内容才进入进行中
  const onSend = () => {
    const message = plainText(draftRef.current.segments).trim()
    if (message) {
      setLastSent(message)
      startRunning()
    }
    const empty = createDraft()
    regionsRef.current = []
    draftRef.current = empty
    setRegions([])
    setDraft(empty)
    setEditing(false)
    setResetEpoch((n) => n + 1)
  }

  const onRestore = (next) => {
    const restored = {
      segments: next.segments.map((seg) => ({ ...seg })),
      cursor: { ...next.cursor },
    }
    draftRef.current = restored
    setDraft(restored)
  }

  return (
    <div className="flex h-full min-h-0 items-center justify-center gap-10 px-5 py-4">
      <div
        ref={phoneRef}
        className="relative h-[min(844px,100%)] w-[390px] max-w-full shrink-0 overflow-hidden rounded-[40px] bg-[#e8e9eb] shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
      >
        <div className="h-full px-6 pb-[86px] pt-[112px]">
          <div
            ref={pageRef}
            className="h-full overflow-y-auto overscroll-contain rounded-[28px] bg-white shadow-[0_8px_28px_rgba(0,0,0,0.08)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <StudyRoomPage showStatusBar={false} />
          </div>
        </div>
        {/* 草稿在系统框单行输入里，点选按钮留在底栏，不再被另一条白条顶起 */}
        <ElementPicker
          phoneRef={phoneRef}
          pageRef={pageRef}
          regions={regions}
          onSelect={addSelection}
          editing={editing}
          onDismiss={() => setEditing(false)}
          onSoloStart={onSoloStart}
          onSoloTarget={onSoloTarget}
          onSoloFinish={onSoloFinish}
          resetEpoch={resetEpoch}
          fabSlotRef={fabSlotRef}
          docked={false}
        />
        <DeviceFrame
          fabSlotRef={fabSlotRef}
          text={plainText(draft.segments)}
          caret={plainCaret(draft.segments, draft.cursor)}
          running={running}
          onActivate={() => {
            if (regionsRef.current.length > 0) setEditing(true)
          }}
          onStop={stopRunning}
        />
        <p className="pointer-events-none sr-only" data-inspect-ui data-last-sent={lastSent}>
          {lastSent}
        </p>
        {soloDraft ? (
          <SoloComposer draft={soloDraft} />
        ) : editing ? (
          <SelectionEditor
            expanded
            segments={draft.segments}
            cursor={draft.cursor}
            onActivate={() => setEditing(true)}
            onCollapse={() => setEditing(false)}
            onInsert={onInsert}
            onBackspace={onBackspace}
            onMove={onMove}
            onRestore={onRestore}
            onSend={onSend}
          />
        ) : null}
      </div>

      <aside className="hidden w-[220px] shrink-0 text-[13px] leading-6 text-[#b7b7b9] xl:block">
        <p className="m-0 mb-2 text-[15px] font-medium text-white">点选编辑</p>
        <p className="m-0">
          轻点右下角按钮进入多选，再点元素即可累加序号。按住约 0.28 秒或拖动则进入单选：跟手听写，松手把当前元素和识别文字发出去，不改已有多选。
        </p>
        <p className="m-0 mt-2">
          有选区后，草稿显示在底部系统框那条单行输入里，内容是「选区N」和已输入文字。点这一行才升起键盘。Esc 或点页面只收起键盘。点发送会清掉选区并让底栏进入进行中，点暂停或数秒后回到按住说话。同一元素不重复添加，退格删掉标签会同步去掉高亮和序号。
        </p>
        <p className="m-0 mt-2">
          键盘态里发送旁边的麦克风与语音输入页相同：点一下进入，按住约 0.4 秒后松开即结束。识别文字插入当前光标。
        </p>
      </aside>
    </div>
  )
}
