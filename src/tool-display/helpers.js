// 工具展示的纯逻辑层：把一条 ChatItem(tool) 映射成展示所需的元信息。
// 严格对齐设计文档：name 是开放集合，展示名/图标全在前端本地推。

// ── 已知 name 的展示配置（PascalCase 内置 + 常见 MCP）────────────
// template 决定用哪种卡片主体；verb/verbRunning 是本地生成的动词。
const KNOWN = {
  Read:        { template: 'read',   verb: '浏览',   verbRunning: '正在浏览' },
  Write:       { template: 'edit',   verb: '已写入', verbRunning: '正在写入' },
  Edit:        { template: 'edit',   verb: '已编辑', verbRunning: '正在编辑' },
  MultiEdit:   { template: 'edit',   verb: '已编辑', verbRunning: '正在编辑' },
  Bash:        { template: 'exec',   verb: '已执行', verbRunning: '正在执行' },
  Grep:        { template: 'search', verb: '搜索',   verbRunning: '正在搜索' },
  Glob:        { template: 'search', verb: '搜索',   verbRunning: '正在搜索' },
  LS:          { template: 'search', verb: '列目录', verbRunning: '正在列目录' },
  WebSearch:   { template: 'web',    verb: '搜索',   verbRunning: '正在搜索' },
  WebFetch:    { template: 'web',    verb: '抓取',   verbRunning: '正在抓取' },
  TodoWrite:   { template: 'todo',   verb: '任务清单', verbRunning: '更新任务清单' },
  AskUserQuestion: { template: 'ask', verb: '提问', verbRunning: '等待你的选择' },
  Task:        { template: 'struct', verb: '子任务', verbRunning: '子任务运行中' },
};

// 未知 name 的分桶兜底（对齐 web-next 的 bucket()：大小写不敏感子串）。
function bucketByName(name) {
  const n = name.toLowerCase();
  if (n.includes('write') || n.includes('edit')) return { template: 'edit',   verb: '已编辑', verbRunning: '正在编辑' };
  if (n.includes('read'))                         return { template: 'read',   verb: '浏览',   verbRunning: '正在浏览' };
  if (n.includes('grep') || n.includes('glob') || n.includes('search')) return { template: 'search', verb: '搜索', verbRunning: '正在搜索' };
  if (n.includes('bash') || n.includes('shell'))  return { template: 'exec',   verb: '已执行', verbRunning: '正在执行' };
  if (n.includes('fetch') || n.includes('markitdown')) return { template: 'web', verb: '抓取', verbRunning: '正在抓取' };
  return { template: 'fallback', verb: name, verbRunning: name }; // 显示原 name
}

export function resolveMeta(name) {
  return KNOWN[name] || bucketByName(name);
}

// 入参承载型：内容在 inputJson 里，running 态就能展开。
// 结果承载型：内容在 result 里，running 态无可展开内容。
const INPUT_CARRIED = new Set(['edit', 'todo', 'ask']);
export function isInputCarried(template) {
  return INPUT_CARRIED.has(template);
}

// detail 摘要：文档规定的字段优先级，最长 80 字。
const DETAIL_KEYS = ['command', 'file_path', 'path', 'pattern', 'url', 'query', 'prompt', 'description', 'title', 'content'];
export function extractDetail(inputObj) {
  if (!inputObj || typeof inputObj !== 'object') return '';
  for (const k of DETAIL_KEYS) {
    if (typeof inputObj[k] === 'string' && inputObj[k].length) return truncate(inputObj[k], 80);
  }
  return truncate(JSON.stringify(inputObj), 80);
}

export function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export function safeParse(jsonStr) {
  try { return JSON.parse(jsonStr); } catch { return null; }
}

// Edit 的 +N −M：按 old_string/new_string 行数估算（对齐旧栈口径）。
export function diffStat(input) {
  if (!input) return null;
  const countLines = (s) => (typeof s === 'string' ? s.split('\n').length : 0);
  if (typeof input.old_string === 'string' || typeof input.new_string === 'string') {
    return { add: countLines(input.new_string), del: countLines(input.old_string) };
  }
  if (typeof input.content === 'string') return { add: countLines(input.content), del: 0 }; // Write
  return null;
}

// Read 结果按 `^\s*(\d+)→(.*)$` 拆行号；不匹配的行 lineNo=null。
export function parseNumberedLines(content) {
  if (!content) return [];
  return content.split('\n').map((raw) => {
    const m = raw.match(/^\s*(\d+)→(.*)$/);
    return m ? { no: m[1], text: m[2] } : { no: null, text: raw };
  });
}

// 状态 → 展示态（四态）。
export const STATUS_META = {
  running:     { label: '进行中', kind: 'running' },
  done:        { label: '完成',   kind: 'done' },
  error:       { label: '失败',   kind: 'error' },
  interrupted: { label: '已中断', kind: 'interrupted' },
};

// ── 折叠分组 ───────────────────────────────────────────────
// 规则（对齐 Claude Desktop Code 模式）：
//  · text / thinking / turn 等非工具条目 = 分隔符，冲刷当前组；
//  · AskUserQuestion、Task/子 Agent = 永不并入组（各自独立成卡）；
//  · 其余连续工具形成一组；≥2 折叠，=1 原样展开。
const NEVER_GROUP = new Set(['ask']); // 模板级：提问永不并组
function neverGroup(item) {
  if (item.task) return true;                       // 子 Agent 卡
  if (item.toolName === 'Task') return true;
  const meta = resolveMeta(item.toolName);
  return NEVER_GROUP.has(meta.template);
}

export function groupTimeline(items) {
  const out = [];
  let buf = [];
  const flush = () => {
    if (buf.length >= 2) out.push({ kind: 'group', tools: buf });
    else if (buf.length === 1) out.push({ kind: 'single', item: buf[0] });
    buf = [];
  };
  for (const item of items) {
    if (item.kind !== 'tool') { flush(); out.push({ kind: 'stream', item }); continue; }
    if (neverGroup(item)) { flush(); out.push({ kind: 'single', item }); continue; }
    buf.push(item);
  }
  flush();
  return out;
}

// 组的动态标题：按动作桶计数 → “浏览 2 个文件 · 已编辑 3 个文件 · 执行 1 次命令”。
const BUCKET_PHRASE = {
  read:   (n) => `浏览 ${n} 个文件`,
  edit:   (n) => `编辑 ${n} 个文件`,
  search: (n) => `搜索 ${n} 次`,
  exec:   (n) => `执行 ${n} 次命令`,
  web:    (n) => `抓取 ${n} 个网页`,
  struct: (n) => `调用 ${n} 个工具`,
  todo:   (n) => `更新任务清单`,
  fallback: (n) => `调用 ${n} 个工具`,
};
// 组的状态汇总：running > error > interrupted > done。
const ROLLUP_ORDER = ['running', 'error', 'interrupted', 'done'];
export function groupSummary(tools) {
  const counts = {};
  for (const t of tools) {
    const tpl = resolveMeta(t.toolName).template;
    counts[tpl] = (counts[tpl] || 0) + 1;
  }
  const title = Object.entries(counts)
    .map(([tpl, n]) => (BUCKET_PHRASE[tpl] || BUCKET_PHRASE.fallback)(n))
    .join(' · ');
  let status = 'done';
  for (const s of ROLLUP_ORDER) {
    if (tools.some((t) => t.toolStatus === s)) { status = s; break; }
  }
  return { title, status, count: tools.length };
}

// ── 分段策略对比（演示模型啰嗦偏差）─────────────────────────
// 动作大类：explore(查) / mutate(改) / act(执行·对外)。
export function actionClass(template) {
  if (template === 'read' || template === 'search') return 'explore';
  if (template === 'edit' || template === 'todo') return 'mutate';
  return 'act'; // exec / web / struct / ask / fallback
}

// 破组：决策/子 Agent/高危副作用，永不被折叠收走。
export function isBreakout(item) {
  if (item.task || item.toolName === 'Task') return true;
  if (resolveMeta(item.toolName).template === 'ask') return true;
  if (item.risk === 'destructive') return true;
  return false;
}

// 引子文本：话痨模型在每个 tool 前的连接语，不应作为硬分隔。
const LEAD_RE = /^(先|再|然后|接着|接下来|下面|首先|顺手|现在)/;
export function isFillerText(item) {
  if (item.kind !== 'text' && item.kind !== 'thinking') return false;
  if (item.lead) return true;                       // 显式标注
  const t = (item.text || '').trim();
  return t.length <= 18 || LEAD_RE.test(t);
}

// 纯文本规则（现状）：任何非 tool 条目都分隔；≥2 折叠；不做破组。
export function segmentByText(items) {
  const out = [];
  let buf = [];
  const flush = () => {
    if (buf.length >= 2) out.push({ kind: 'group', tools: buf });
    else if (buf.length === 1) out.push({ kind: 'single', item: buf[0] });
    buf = [];
  };
  for (const it of items) {
    if (it.kind !== 'tool') { flush(); out.push({ kind: 'stream', item: it }); continue; }
    buf.push(it);
  }
  flush();
  return out;
}

// 结构优先规则（提案）：引子文本忽略；按动作大类跃迁 + 尺寸上限分段；
// 破组项独立成卡。对模型啰嗦程度免疫。
export function segmentByStructure(items, sizeCap = 6) {
  const out = [];
  let buf = [];
  const cls = (t) => actionClass(resolveMeta(t.toolName).template);
  const flush = () => {
    if (buf.length >= 2) out.push({ kind: 'group', tools: buf });
    else if (buf.length === 1) out.push({ kind: 'single', item: buf[0] });
    buf = [];
  };
  for (const it of items) {
    if (it.kind !== 'tool') {
      if (isFillerText(it)) { out.push({ kind: 'filler', item: it }); continue; } // 忽略为分隔
      flush(); out.push({ kind: 'stream', item: it }); continue;
    }
    if (isBreakout(it)) { flush(); out.push({ kind: 'break', item: it }); continue; }
    if (buf.length && (cls(buf[buf.length - 1]) !== cls(it) || buf.length >= sizeCap)) flush();
    buf.push(it);
  }
  flush();
  return out;
}
