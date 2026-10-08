import React, { useState } from 'react';
import {
  resolveMeta, isInputCarried, extractDetail, safeParse, diffStat,
  parseNumberedLines, truncate,
} from './helpers.js';

// ── 状态图标 ──────────────────────────────────────────────
function StatusIcon({ kind }) {
  if (kind === 'running') return <span className="ti-icon ti-spin" aria-label="进行中" />;
  const paths = {
    done: <path d="M3.5 7l2.2 2.2L10.5 4" />,
    error: <path d="M4 4l6 6M10 4l-6 6" />,
    interrupted: <path d="M4 3.5v7M8 3.5v7" />,
  };
  return (
    <svg className={`ti-icon ti-${kind}`} viewBox="0 0 14 14" fill="none"
         stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[kind]}
    </svg>
  );
}

function Chevron({ open }) {
  return (
    <svg className={`ti-chevron ${open ? 'open' : ''}`} viewBox="0 0 12 12" fill="none"
         stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2.5L8 6l-4 3.5" />
    </svg>
  );
}

// ── 各模板的展开区主体 ────────────────────────────────────
function CodeBlock({ content }) {
  const lines = parseNumberedLines(content);
  return (
    <pre className="ti-code">
      {lines.map((l, i) => (
        <div className="ti-code-line" key={i}>
          <span className="ti-ln">{l.no ?? ''}</span>
          <span className="ti-code-text">{l.text || ' '}</span>
        </div>
      ))}
    </pre>
  );
}

function DiffBlock({ input }) {
  const del = (input?.old_string ?? '').split('\n').filter((_, i, a) => a.length > 1 || a[0] !== '');
  const add = (input?.new_string ?? input?.content ?? '').split('\n').filter((_, i, a) => a.length > 1 || a[0] !== '');
  return (
    <pre className="ti-code ti-diff">
      {del.map((t, i) => <div className="ti-diff-line del" key={'d' + i}><span className="ti-diff-sign">-</span>{t || ' '}</div>)}
      {add.map((t, i) => <div className="ti-diff-line add" key={'a' + i}><span className="ti-diff-sign">+</span>{t || ' '}</div>)}
    </pre>
  );
}

function ListBlock({ content }) {
  const rows = content.split('\n').filter(Boolean);
  if (!rows.length) return <div className="ti-empty">无匹配项</div>;
  return (
    <div className="ti-list">
      {rows.map((r, i) => <div className="ti-list-row" key={i}>{r}</div>)}
    </div>
  );
}

function TextBlock({ content }) {
  return <div className="ti-text-body">{content}</div>;
}

function JsonBlock({ content }) {
  const obj = safeParse(content);
  const text = obj ? JSON.stringify(obj, null, 2) : content;
  return <pre className="ti-code ti-json">{text}</pre>;
}

function TodoBlock({ input }) {
  const todos = input?.todos ?? [];
  const mark = { completed: '✓', in_progress: '◐', pending: '○' };
  return (
    <div className="ti-todo">
      {todos.map((t, i) => (
        <div className={`ti-todo-row ${t.status}`} key={i}>
          <span className="ti-todo-mark">{mark[t.status] ?? '○'}</span>
          <span className="ti-todo-text">{t.content}</span>
        </div>
      ))}
    </div>
  );
}

function AskBlock({ input, status, content }) {
  const [answer, setAnswer] = useState(null);
  const q = input?.questions?.[0];
  if (!q) return null;
  // done 态：从 content 里解析“用户选择：xxx”
  const finalAnswer = answer ?? (status === 'done' ? (content || '').replace(/^用户选择：/, '') : null);
  const answered = status === 'done' || answer != null;
  return (
    <div className="ti-ask">
      <div className="ti-ask-q">{q.question}</div>
      <div className="ti-ask-options">
        {q.options.map((o, i) => {
          const picked = answered && finalAnswer && finalAnswer.includes(o.label);
          return (
            <button
              key={i}
              className={`ti-ask-opt ${picked ? 'picked' : ''} ${answered && !picked ? 'dim' : ''}`}
              disabled={answered}
              onClick={() => setAnswer(o.label)}
            >
              <span className="ti-ask-label">{o.label}</span>
              {o.description && <span className="ti-ask-desc">{o.description}</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="ti-ask-result">
          {finalAnswer && !finalAnswer.startsWith('（') ? `已选择「${finalAnswer}」` : '未选择 · 请在回复文本中回答'}
        </div>
      )}
    </div>
  );
}

// ── 头部文案 ──────────────────────────────────────────────
function fmtDuration(ms) {
  if (ms == null) return '';
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`;
  return `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, '0')}s`;
}
function fmtTokens(n) {
  if (n == null) return '';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// ── 子 Agent / Task 进度卡 ────────────────────────────────
function TaskCard({ item, mode }) {
  const t = item.task || {};
  const status = item.toolStatus;
  const kind = status === 'done' ? 'done' : status;
  const input = safeParse(item.text) || {};
  const [open, setOpen] = useState(status === 'error');

  if (mode === 'pencil') {
    return (
      <div className={`ti-pencil ti-${kind}`}>
        <StatusIcon kind={kind} />
        <span className="ti-pencil-verb">子 Agent</span>
        <span className="ti-pencil-detail">{input.description || t.subagentType}</span>
      </div>
    );
  }

  return (
    <div className={`ti-card ti-task ti-${kind}`}>
      <button className="ti-head" onClick={() => setOpen((v) => !v)}>
        <Chevron open={open} />
        <StatusIcon kind={kind} />
        <span className="ti-head-title">
          <span className="ti-verb">子 Agent</span>
          <span className="ti-name">{t.subagentType || 'agent'}</span>
          <span className="ti-detail">{input.description || ''}</span>
        </span>
        <span className="ti-head-right">
          {t.durationMs != null && <span className="ti-timer">⏱ {fmtDuration(t.durationMs)}</span>}
          {t.toolUses != null && <span className="ti-count">{t.toolUses} 步</span>}
          {t.totalTokens != null && <span className="ti-count">{fmtTokens(t.totalTokens)} tok</span>}
        </span>
      </button>
      <div className="ti-task-progress">
        <span className={`ti-task-dot ti-${kind}`} />
        {status === 'running'
          ? <>正在运行 · 最近调用 <code>{t.lastToolName}</code> · {t.summary}</>
          : status === 'error'
            ? <span className="ti-task-err">{item.toolContent}</span>
            : <>{t.summary}</>}
      </div>
      {open && (
        <div className="ti-body">
          {status !== 'error' && item.toolContent &&
            <div className="ti-task-result">{item.toolContent}</div>}
          {item.subStream?.length > 0 && (
            <div className="ti-substream">
              <div className="ti-substream-label">子对话流（{item.subStream.length} 步）</div>
              {item.subStream.map((s) => <ToolItem key={s.key} item={s} mode={mode} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 头部文案 ──────────────────────────────────────────────
function headline(template, meta, input, name) {
  const detail = extractDetail(input);
  if (template === 'todo') return { verb: meta.verbRunning, tail: `(${input?.todos?.length ?? 0})`, mono: false };
  if (template === 'ask') return { verb: input?.questions?.[0]?.header || '提问', tail: input?.questions?.[0]?.question || '', mono: false };
  if (template === 'fallback') return { verb: '', tail: detail, mono: true, name };
  return { verb: null, tail: detail, mono: false };
}

// ── 单条 tool ─────────────────────────────────────────────
export default function ToolItem({ item, mode }) {
  if (item.task) return <TaskCard item={item} mode={mode} />;

  const meta = resolveMeta(item.toolName);
  const template = meta.template;
  const input = safeParse(item.text);
  const status = item.toolStatus;
  const kind = status === 'done' ? 'done' : status;
  const inputCarried = isInputCarried(template);

  const verb = status === 'running' ? meta.verbRunning : meta.verb;
  const head = headline(template, meta, input, item.toolName);

  // 是否可展开 & 默认展开
  const hasInputBody = inputCarried && input;
  const hasResultBody = !!item.toolContent && status !== 'running';
  const expandable = hasInputBody || hasResultBody;
  const defaultOpen =
    status === 'error' ||
    (template === 'ask' && status === 'running') ||
    (template === 'todo');
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [opened, setOpened] = useState(false);

  const ds = template === 'edit' ? diffStat(input) : null;

  // 结果卡交互（纯前端）：可点路径打开、复制、看原始
  const openPath = (template === 'read' || template === 'edit') && input?.file_path;
  const copyText = template === 'edit'
    ? (input?.new_string ?? input?.content ?? '')
    : (item.toolContent || '');
  const doCopy = () => {
    try { navigator.clipboard?.writeText(copyText); } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  };

  // ── 铅笔行（web-next 现状）：单行、弱化、无展开、无结果 ──
  if (mode === 'pencil') {
    return (
      <div className={`ti-pencil ti-${kind}`}>
        <StatusIcon kind={kind} />
        <span className="ti-pencil-verb">{head.mono ? item.toolName : verb}</span>
        <span className="ti-pencil-detail">{head.tail}</span>
      </div>
    );
  }

  // ── 高保真卡片（提案）──
  const renderBody = () => {
    // error / interrupted 的结果文案对所有模板优先展示
    if (status === 'error' || status === 'interrupted') {
      return <div className={`ti-result-msg ${status}`}>{item.toolContent}</div>;
    }
    if (template === 'edit') return input ? <DiffBlock input={input} /> : null;
    if (template === 'todo') return <TodoBlock input={input} />;
    if (template === 'ask') return <AskBlock input={input} status={status} content={item.toolContent} />;
    // 结果承载：running 无内容
    if (status === 'running') return <div className="ti-running-hint">执行中，等待结果…</div>;
    if (template === 'read') return <CodeBlock content={item.toolContent} />;
    if (template === 'search') return <ListBlock content={item.toolContent} />;
    if (template === 'exec') return <pre className="ti-code ti-shell">{item.toolContent || ' '}</pre>;
    if (template === 'web') return <TextBlock content={item.toolContent} />;
    if (template === 'struct' || template === 'fallback') return <JsonBlock content={item.toolContent} />;
    return <TextBlock content={item.toolContent} />;
  };

  return (
    <div className={`ti-card ti-${kind} tpl-${template}`}>
      <button
        className="ti-head"
        onClick={() => expandable && setOpen((v) => !v)}
        style={{ cursor: expandable ? 'pointer' : 'default' }}
      >
        {expandable ? <Chevron open={open} /> : <span className="ti-chevron-spacer" />}
        <StatusIcon kind={kind} />
        <span className="ti-head-title">
          {head.mono
            ? <code className="ti-name">{item.toolName}</code>
            : <span className="ti-verb">{head.verb ?? verb}</span>}
          {head.tail && (
            openPath
              ? <span
                  className={`ti-detail ti-path ${opened ? 'opened' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setOpened(true); }}
                  title="在编辑器中打开"
                >{truncate(head.tail, 72)}{opened ? ' ↗' : ''}</span>
              : <span className="ti-detail">{truncate(head.tail, 72)}</span>
          )}
        </span>
        <span className="ti-head-right">
          {ds && <span className="ti-diffstat"><span className="add">+{ds.add}</span> <span className="del">−{ds.del}</span></span>}
          {status === 'running' && <span className="ti-timer">⏱ 0:03</span>}
          {template === 'read' && status === 'done' &&
            <span className="ti-count">{parseNumberedLines(item.toolContent).length} 行</span>}
        </span>
      </button>
      {expandable && open && (
        <div className="ti-body">
          {showRaw
            ? <pre className="ti-code ti-json">{item.toolContent || item.text}</pre>
            : renderBody()}
          {status === 'done' && template !== 'ask' && template !== 'todo' && (
            <div className="ti-actions">
              <button className="ti-act" onClick={doCopy}>{copied ? '已复制 ✓' : '复制'}</button>
              {(item.toolContent || item.text) &&
                <button className="ti-act" onClick={() => setShowRaw((v) => !v)}>{showRaw ? '格式化' : '原始'}</button>}
              {openPath &&
                <button className="ti-act" onClick={() => setOpened(true)}>{opened ? '已打开 ↗' : '打开文件'}</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
