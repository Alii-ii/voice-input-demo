import React, { useState } from 'react';
import {
  resolveMeta, extractDetail, safeParse, truncate, groupSummary,
  segmentByText, segmentByStructure,
} from './helpers.js';
import { terseTranscript, verboseTranscript } from './samples.js';

// 一行紧凑 tool
function MiniTool({ item, broke }) {
  const meta = resolveMeta(item.toolName);
  const detail = extractDetail(safeParse(item.text));
  const kind = item.toolStatus === 'done' ? 'done' : item.toolStatus;
  return (
    <div className={`md-tool ti-${kind} ${broke ? 'broke' : ''}`}>
      <span className={`md-dot ti-${kind}`} />
      <span className="md-verb">{meta.verb}</span>
      <span className="md-detail">{truncate(detail, 34)}</span>
      {item.risk === 'destructive' && <span className="md-risk">⚠ 高危副作用</span>}
      {broke && <span className="md-broke-tag">破出</span>}
    </div>
  );
}

// 折叠组（默认收起，点开看 mini 行）
function MiniGroup({ tools }) {
  const { title, count, status } = groupSummary(tools);
  const kind = status === 'done' ? 'done' : status;
  const buried = tools.some((t) => t.risk === 'destructive');
  const [open, setOpen] = useState(false);
  return (
    <div className={`md-group ti-${kind}`}>
      <button className="md-group-head" onClick={() => setOpen((v) => !v)}>
        <span className={`md-chevron ${open ? 'open' : ''}`}>▸</span>
        <span className={`md-dot ti-${kind}`} />
        <span className="md-group-title">{title}</span>
        <span className="md-group-count">{count} 步</span>
        {buried && <span className="md-buried">含高危·已埋</span>}
      </button>
      {open && <div className="md-group-body">{tools.map((t) => <MiniTool key={t.key} item={t} />)}</div>}
    </div>
  );
}

function renderNodes(nodes) {
  return nodes.map((n, i) => {
    if (n.kind === 'group') return <MiniGroup key={i} tools={n.tools} />;
    if (n.kind === 'single') return <MiniTool key={i} item={n.item} />;
    if (n.kind === 'break') return <MiniTool key={i} item={n.item} broke />;
    if (n.kind === 'filler') return <div key={i} className="md-filler">💬 {n.item.text}<em>（结构规则忽略）</em></div>;
    return <div key={i} className="md-text">{n.item.text}</div>; // stream: 实质文本
  });
}

function caption(nodes) {
  const groups = nodes.filter((n) => n.kind === 'group').length;
  const singles = nodes.filter((n) => n.kind === 'single').length;
  const breaks = nodes.filter((n) => n.kind === 'break').length;
  const buried = nodes.some((n) => n.kind === 'group' && n.tools.some((t) => t.risk === 'destructive'));
  const parts = [];
  if (groups) parts.push(`${groups} 组`);
  if (singles) parts.push(`${singles} 张单卡`);
  if (breaks) parts.push(`${breaks} 项破出`);
  const bad = groups === 1 && singles === 0 && breaks === 0; // 全糊
  const flat = groups === 0 && singles > 3;                  // 全散
  let verdict = '';
  if (buried) verdict = '❌ git push 被埋进组里，失去审计点';
  else if (bad) verdict = '❌ 一坨巨组，折叠失去信息';
  else if (flat) verdict = '❌ 完全没折叠，退化成平铺';
  else verdict = '✅ 查/改/执行分段清晰，高危破出';
  return { text: parts.join(' · ') || '—', verdict, ok: verdict.startsWith('✅') };
}

function Cell({ nodes }) {
  const cap = caption(nodes);
  return (
    <div className="sd-cell">
      <div className="sd-cell-stack">{renderNodes(nodes)}</div>
      <div className={`sd-caption ${cap.ok ? 'ok' : 'bad'}`}>
        <strong>{cap.text}</strong>
        <span>{cap.verdict}</span>
      </div>
    </div>
  );
}

export default function SegDemo() {
  const rows = [
    { label: '惜字模型', sub: '首尾外无插话', tr: terseTranscript },
    { label: '话痨模型', sub: '每步一句引子', tr: verboseTranscript },
  ];
  return (
    <div className="seg-demo">
      <p className="sd-intro">
        同一段工作（<b>查 3 → 改 3 → 测 1 → 推送 1</b>，推送为高危副作用）分别以两种模型的叙述节奏喂入，
        对比两套分段规则。看两列的差异 —— <b>纯文本规则随模型啰嗦程度剧烈摆动，结构优先规则两行几乎一致</b>。
      </p>
      <div className="sd-grid">
        <div className="sd-corner" />
        <div className="sd-colhead">纯文本规则<em>（现状：任何文本都分隔）</em></div>
        <div className="sd-colhead">结构优先规则<em>（提案：忽略引子·按动作大类·高危破出）</em></div>
        {rows.map((r) => (
          <React.Fragment key={r.label}>
            <div className="sd-rowhead"><strong>{r.label}</strong><span>{r.sub}</span></div>
            <Cell nodes={segmentByText(r.tr)} />
            <Cell nodes={segmentByStructure(r.tr)} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
