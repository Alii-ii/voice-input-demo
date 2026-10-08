import React, { useState } from 'react';
import ToolItem from './ToolItem.jsx';
import SegDemo from './segdemo.jsx';
import { transcript, gallery } from './samples.js';
import { safeParse, groupTimeline, groupSummary } from './helpers.js';

// 折叠组：连续工具聚合成一张可展开卡（动态标题 + 状态汇总 + running 自动展开）
function ToolGroup({ tools, mode }) {
  const { title, status, count } = groupSummary(tools);
  const kind = status === 'done' ? 'done' : status;
  const [open, setOpen] = useState(status === 'running'); // 含运行中 → 自动展开
  if (mode === 'pencil') {
    return <>{tools.map((t) => <ToolItem key={t.key} item={t} mode={mode} />)}</>;
  }
  return (
    <div className={`tool-group ti-${kind}`}>
      <button className="tool-group-head" onClick={() => setOpen((v) => !v)}>
        <span className={`tg-chevron ${open ? 'open' : ''}`}>▸</span>
        <span className={kind === 'running' ? 'ti-icon ti-spin' : `tg-dot ti-${kind}`} />
        <span className="tool-group-title">{title}</span>
        <span className="tool-group-count">{count} 步 · 点击展开</span>
      </button>
      {open && (
        <div className="tool-group-body">
          {tools.map((t) => <ToolItem key={t.key} item={t} mode={mode} />)}
        </div>
      )}
    </div>
  );
}

// 非 tool 的对话流条目
function StreamItem({ item, mode }) {
  if (item.kind === 'tool') return <ToolItem item={item} mode={mode} />;
  if (item.kind === 'user')
    return <div className="cs-user"><div className="cs-user-bubble">{item.text}</div></div>;
  if (item.kind === 'thinking')
    return <div className="cs-thinking"><span className="cs-thinking-dot" />{item.text}</div>;
  if (item.kind === 'text')
    return <div className="cs-text">{item.text}</div>;
  if (item.kind === 'turn')
    return (
      <div className="cs-turn">
        <span className="cs-turn-line" />
        <span className="cs-turn-label">第 {item.turnNo} 轮 · {item.commitSha}</span>
        <span className="cs-turn-line" />
      </div>
    );
  return null;
}

// 顶部悬浮任务清单（TodoWrite 副作用）
function TodoWidget() {
  const todos = [
    { content: '搭登录页', status: 'completed' },
    { content: '接验证码接口', status: 'in_progress' },
    { content: '写单测', status: 'pending' },
  ];
  const done = todos.filter((t) => t.status === 'completed').length;
  const [open, setOpen] = useState(true);
  return (
    <div className="todo-widget">
      <button className="todo-widget-head" onClick={() => setOpen((v) => !v)}>
        <span className="todo-widget-icon">📋</span>
        <span className="todo-widget-title">任务进度</span>
        <span className="todo-widget-count">{done}/{todos.length}</span>
      </button>
      {open && (
        <div className="todo-widget-body">
          {todos.map((t, i) => (
            <div className={`todo-widget-row ${t.status}`} key={i}>
              <span className="todo-widget-mark">{{ completed: '✓', in_progress: '◐', pending: '○' }[t.status]}</span>
              {t.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Gallery() {
  const [mode, setMode] = useState('card');   // 'card' | 'pencil'
  const [theme, setTheme] = useState('light'); // 'light' | 'dark'
  const [view, setView] = useState('proto');   // 'proto' | 'seg'

  return (
    <div className="app" data-theme={theme}>
      <header className="topbar">
        <div className="topbar-title">
          <strong>对话流 Tool 展示</strong>
          <span className="topbar-sub">高保真原型 · 四态 · 双栈对比</span>
        </div>
        <div className="topbar-controls">
          <div className="seg">
            <button className={view === 'proto' ? 'on' : ''} onClick={() => setView('proto')}>原型</button>
            <button className={view === 'seg' ? 'on' : ''} onClick={() => setView('seg')}>分段对比</button>
          </div>
          {view === 'proto' && (
            <div className="seg">
              <button className={mode === 'card' ? 'on' : ''} onClick={() => setMode('card')}>高保真卡片（提案）</button>
              <button className={mode === 'pencil' ? 'on' : ''} onClick={() => setMode('pencil')}>铅笔行（web-next 现状）</button>
            </div>
          )}
          <button className="theme-btn" onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>
            {theme === 'light' ? '🌙 深色' : '☀️ 浅色'}
          </button>
        </div>
      </header>

      {view === 'seg' ? <SegDemo /> : (
      <div className="canvas">
        {/* 左：真实对话流 */}
        <section className="pane pane-chat">
          <div className="pane-label">对话流（真实感示例）</div>
          <div className="chat-scroll">
            <TodoWidget />
            <div className="chat-stream">
              {groupTimeline(transcript).map((node, i) => {
                if (node.kind === 'group') return <ToolGroup key={`grp${i}`} tools={node.tools} mode={mode} />;
                if (node.kind === 'single') return <StreamItem key={node.item.key} item={node.item} mode={mode} />;
                return <StreamItem key={node.item.key} item={node.item} mode={mode} />;
              })}
            </div>
          </div>
        </section>

        {/* 右：四态画廊 */}
        <section className="pane pane-gallery">
          <div className="pane-label">组件画廊 · 每个模板 × 四态</div>
          <div className="gallery-scroll">
            {Object.entries(gallery).map(([title, items]) => (
              <div className="gallery-group" key={title}>
                <div className="gallery-group-title">{title}</div>
                <div className="gallery-items">
                  {items.map((item) => (
                    <div className="gallery-cell" key={item.key}>
                      <div className="gallery-cell-tag">{
                        { running: '进行中', done: '完成', error: '失败', interrupted: '已中断' }[item.toolStatus]
                      }</div>
                      <ToolItem item={item} mode={mode} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      )}
    </div>
  );
}
