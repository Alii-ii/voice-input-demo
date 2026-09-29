import { useEffect, useMemo, useRef, useState } from 'react'
import ChatPanel from './ChatPanel.jsx'
import { makeConversation, PRESETS } from './mockData.js'
import './chat.css'

/**
 * ChatLab：对话 Minimap 实验台（左右布局）
 *  - 左：调试面板（数据档 / 贴边 / 尺寸参数 / 判定条）
 *  - 右：对话窗口（无 card 包围，独占一半，唯一可滚动层）
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
    <div className="lab">
      <div className="lab-split">
        <aside className="lab-side">
          <header className="lab-head">
            <h1>对话 Minimap 实验台</h1>
            <p className="lab-sub">
              fork Chat Minimap（固定密度）· 居中胶片 + 鱼眼 · 极端轮次不撑爆
            </p>
          </header>

          <div className="lab-controls">
            <div className="ctrl-group">
              <span className="ctrl-label">数据档位</span>
              <div className="seg">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    className={presetKey === p.key ? 'seg-btn is-on' : 'seg-btn'}
                    onClick={() => setPresetKey(p.key)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ctrl-group">
              <span className="ctrl-label">贴边</span>
              <div className="seg">
                <button className={side === 'left' ? 'seg-btn is-on' : 'seg-btn'} onClick={() => setSide('left')}>
                  左
                </button>
                <button className={side === 'right' ? 'seg-btn is-on' : 'seg-btn'} onClick={() => setSide('right')}>
                  右
                </button>
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
          <div className={`verdict ${overflow ? 'verdict--film' : 'verdict--ok'}`}>
            <div className="verdict-main">
              <strong>{turns}</strong> 轮 / {messages.length} 条 · 胶片{' '}
              <strong>{filmH}px</strong> · 视口 <strong>{Math.round(panelH)}px</strong>
            </div>
            <div className="verdict-badge">
              {overflow ? `胶片模式 · 全长 ${filmRatio.toFixed(1)} 屏但不撑爆` : '✓ 全部可见 · active 恒居中'}
            </div>
            <div className="verdict-hint">
              一轮一条轴；active 恒钉中线；视口内多轮同时高亮；滚轮只滚对话；hover 处最长按距离递减。
            </div>
          </div>
        </aside>

        <main className="lab-stage" ref={wrapRef}>
          <ChatPanel messages={messages} minimapProps={minimapProps} />
        </main>
      </div>
    </div>
  )
}

function Slider({ label, value, min, max, step = 1, unit, onChange }) {
  return (
    <label className="slider">
      <span className="slider-label">
        {label} <b>{value}{unit}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
