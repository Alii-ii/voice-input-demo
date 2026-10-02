import { useEffect, useMemo, useRef, useState } from 'react'
import ChatPanel from './ChatPanel.jsx'
import CopyMinimapCodeBar from './CopyMinimapCodeBar.jsx'
import { makeConversation, PRESETS } from './mockData.js'
import { cn } from '../lib/cn.js'

/**
 * ChatLab：对话 Minimap 实验台（左右布局）
 *  - 左：调试面板（数据档 / 贴边 / 尺寸参数 / 判定条）
 *  - 右：对话窗口（无 card 包围，独占一半，唯一可滚动层）
 *  - 底：一键复制 ChatMinimap.jsx
 *  - 整页恒 100vh，除对话窗口外禁止任何层级滚动
 */
export default function ChatLab() {
  const [presetKey, setPresetKey] = useState('normal')
  const [itemSize, setItemSize] = useState(8) // 静息行距（密度）
  const [hoverRow, setHoverRow] = useState(12) // hover 峰值行距（默认 itemSize + 4）
  const [dotLen, setDotLen] = useState(6) // 静息轴长
  const [hoverMax, setHoverMax] = useState(22) // hover 峰值轴长（最大延长）
  const [gap, setGap] = useState(0)
  const [lensRange, setLensRange] = useState(3)
  const [side, setSide] = useState('left')

  const preset = PRESETS.find((p) => p.key === presetKey)
  const messages = useMemo(() => makeConversation(preset.turns), [preset.turns])

  // 测量对话面板可视高度，用于判断胶片是否溢出视口
  const wrapRef = useRef(null)
  const [panelH, setPanelH] = useState(0)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setPanelH(entry.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const rowH = itemSize + gap
  const turns = preset.turns // 一轮一条轴
  const filmH = turns * rowH // 胶片全长
  const overflow = panelH > 0 && filmH > panelH
  const filmRatio = panelH > 0 ? filmH / panelH : 0

  const minimapProps = { itemSize, hoverRow, dotLen, hoverMax, gap, lensRange, side }

  return (
    <div className="flex h-full flex-col overflow-hidden text-[#eaeaea]">
      <div className="flex min-h-0 flex-1 gap-4 px-4 pb-3 pt-3.5">
        <aside className="flex min-h-0 w-[clamp(300px,34%,440px)] shrink-0 flex-col gap-3 overflow-hidden">
          <header>
            <h1 className="mb-1 text-lg text-[#f2f2f4]">对话 Minimap 实验台</h1>
            <p className="m-0 text-xs leading-normal text-[#8f8f92]">
              fork Chat Minimap（固定密度）· 居中胶片 + 鱼眼 · 极端轮次不撑爆
            </p>
          </header>

          <div className="flex flex-col gap-3 rounded-2xl border border-[#3a3a3c] bg-[#262627] px-4 py-3.5">
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-2">数据档位</span>
              <div className="inline-flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <SegBtn
                    key={p.key}
                    active={presetKey === p.key}
                    onClick={() => setPresetKey(p.key)}
                  >
                    {p.label}
                  </SegBtn>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-2">贴边</span>
              <div className="inline-flex flex-wrap gap-1.5">
                <SegBtn active={side === 'left'} onClick={() => setSide('left')}>
                  左
                </SegBtn>
                <SegBtn active={side === 'right'} onClick={() => setSide('right')}>
                  右
                </SegBtn>
              </div>
            </div>

            <Slider label="dotLen（静息轴长）" value={dotLen} min={2} max={20} onChange={setDotLen} unit="px" />
            <Slider label="hoverMax（hover 峰值长）" value={hoverMax} min={8} max={48} onChange={setHoverMax} unit="px" />
            <Slider label="itemSize（静息行距）" value={itemSize} min={4} max={24} onChange={setItemSize} unit="px" />
            <Slider label="hoverRow（hover 行距）" value={hoverRow} min={4} max={40} onChange={setHoverRow} unit="px" />
            <Slider label="gap（间距）" value={gap} min={0} max={12} onChange={setGap} unit="px" />
            <Slider label="lensRange（hover 半径）" value={lensRange} min={1} max={8} onChange={setLensRange} unit="行" />
          </div>

          {/* 判定条：说明当前是否进入胶片跟随模式 */}
          <div
            className={cn(
              'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border px-4 py-3 text-[13px]',
              overflow
                ? 'border-[rgba(90,160,255,0.45)] bg-[rgba(90,160,255,0.1)] text-[#a9cbff]'
                : 'border-[rgba(52,199,89,0.4)] bg-[rgba(52,199,89,0.1)] text-[#a7e5b5]',
            )}
          >
            <div>
              <strong className="text-[#f2f2f4]">{turns}</strong> 轮 / {messages.length} 条 · 胶片{' '}
              <strong className="text-[#f2f2f4]">{filmH}px</strong> · 视口{' '}
              <strong className="text-[#f2f2f4]">{Math.round(panelH)}px</strong>
            </div>
            <div className="ml-auto font-bold tracking-wide">
              {overflow ? `胶片模式 · 全长 ${filmRatio.toFixed(1)} 屏但不撑爆` : '✓ 全部可见 · active 恒居中'}
            </div>
            <div className="basis-full text-xs opacity-[0.85]">
              一轮一条轴；active 恒钉中线；视口内多轮同时高亮；滚轮只滚对话；hover 处最长按距离递减。
            </div>
          </div>
        </aside>

        <main className="min-h-0 min-w-0 flex-1" ref={wrapRef}>
          <ChatPanel messages={messages} minimapProps={minimapProps} />
        </main>
      </div>

      <CopyMinimapCodeBar />
    </div>
  )
}

function SegBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      className={cn(
        'cursor-pointer rounded-[9px] border px-2.5 py-1.5 text-xs transition-all duration-100',
        active
          ? 'border-accent bg-accent font-semibold text-ink'
          : 'border-[#46464a] bg-ink text-[#cfcfd2] hover:border-[#6a6a6f]',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Slider({ label, value, min, max, step = 1, unit, onChange }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-2">
        {label}{' '}
        <b className="ml-1 font-semibold text-accent">
          {value}
          {unit}
        </b>
      </span>
      <input
        type="range"
        className="w-full accent-accent"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
