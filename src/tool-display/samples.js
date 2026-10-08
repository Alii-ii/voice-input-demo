// 样例数据。全部为聚合后的 ChatItem 形态（对齐文档 §3.2 / §3.5）。
// tool 项：{ key, kind:'tool', toolName, toolStatus, text(=inputJson), toolContent }

// 一段真实感的对话流：user → thinking → 多个 tool（含并行/失败/进行中）→ text → turn。
export const transcript = [
  { key: 'u1', kind: 'user', text: '把首页标题改成中文，然后跑一下单测确认没坏。' },
  { key: 'th1', kind: 'thinking', text: '先读文件，改标题，再执行测试。' },
  {
    key: 'toolu_read01', kind: 'tool', toolName: 'Read', toolStatus: 'done',
    text: '{"file_path":"src/App.tsx","offset":1,"limit":40}',
    toolContent: '     1→export default function App() {\n     2→  return <main>hello</main>\n     3→}',
  },
  {
    key: 'toolu_edit01', kind: 'tool', toolName: 'Edit', toolStatus: 'done',
    text: '{"file_path":"src/App.tsx","old_string":"hello","new_string":"你好，世界"}',
    toolContent: 'The file src/App.tsx has been updated.',
  },
  {
    key: 'toolu_bash01', kind: 'tool', toolName: 'Bash', toolStatus: 'done',
    text: '{"command":"npm test -- --run src/lib/wire.test.ts","description":"Run unit tests"}',
    toolContent: ' ✓ src/lib/wire.test.ts (4)\n   ✓ maps tool.use\n   ✓ maps tool.result\n Test Files  1 passed (1)\n      Tests  4 passed (4)\n   Duration  812ms',
  },
  { key: 'txt1', kind: 'text', text: '已经把首页标题改成「你好，世界」，单测 4 项全部通过。' },
  { key: 'turn1', kind: 'turn', turnNo: 3, commitSha: 'a1b2c3d' },

  { key: 'u2', kind: 'user', text: '再查下 useChatStore 在哪些文件用到，并抓一下 React 19 use() 的文档。' },
  {
    key: 'toolu_grep01', kind: 'tool', toolName: 'Grep', toolStatus: 'done',
    text: '{"pattern":"useChatStore","path":"src","output_mode":"files_with_matches"}',
    toolContent: 'src/bizComponents/chat/stores/chat.ts\nsrc/bizComponents/chat/components/ChatPane.tsx\nsrc/components/message/AssistantMessage/ToolCall.tsx',
  },
  {
    key: 'toolu_task01', kind: 'tool', toolName: 'Task', toolStatus: 'done', task: true,
    text: '{"subagent_type":"Explore","description":"排查 useChatStore 用法","prompt":"读完这些文件，总结 useChatStore 的读写点。"}',
    toolContent: 'useChatStore 在 3 处使用：ChatPane 订阅 items，ToolCall 读取单条 tool，store 内部聚合 WS 帧。写入集中在 store 的 append/patch。',
    task: {
      subagentType: 'Explore', durationMs: 42300, toolUses: 6, totalTokens: 18400,
      lastToolName: 'Read', summary: '已读 5 个文件、grep 2 次，定位到 3 个读点、1 个写点',
    },
    subStream: [
      { key: 's1', kind: 'tool', toolName: 'Grep', toolStatus: 'done',
        text: '{"pattern":"useChatStore","path":"src"}', toolContent: 'src/stores/chat.ts\nsrc/components/ChatPane.tsx' },
      { key: 's2', kind: 'tool', toolName: 'Read', toolStatus: 'done',
        text: '{"file_path":"src/stores/chat.ts"}',
        toolContent: '     1→export const useChatStore = create(...)\n     2→  append: (it) => ...' },
      { key: 's3', kind: 'tool', toolName: 'Read', toolStatus: 'done',
        text: '{"file_path":"src/components/ChatPane.tsx"}',
        toolContent: '     1→const items = useChatStore(s => s.items)' },
    ],
  },
  {
    key: 'toolu_web01', kind: 'tool', toolName: 'WebFetch', toolStatus: 'running',
    text: '{"url":"https://react.dev/reference/react/use"}',
    toolContent: '',
  },
  {
    key: 'toolu_ask01', kind: 'tool', toolName: 'AskUserQuestion', toolStatus: 'running',
    text: '{"questions":[{"header":"布局","question":"抓取结果整理成哪种形式？","options":[{"label":"要点清单","description":"更快浏览"},{"label":"表格对比","description":"信息更密"}]}]}',
    toolContent: '',
  },
];

// 画廊：每个模板 × 四态的代表样例。
export const gallery = {
  '文件读写 · Read（结果承载）': [
    { key: 'g_read_run', kind: 'tool', toolName: 'Read', toolStatus: 'running',
      text: '{"file_path":"src/App.tsx","offset":1,"limit":40}', toolContent: '' },
    { key: 'g_read_done', kind: 'tool', toolName: 'Read', toolStatus: 'done',
      text: '{"file_path":"src/App.tsx","offset":1,"limit":40}',
      toolContent: '     1→export default function App() {\n     2→  return <main>hello</main>\n     3→}' },
    { key: 'g_read_err', kind: 'tool', toolName: 'Read', toolStatus: 'error',
      text: '{"file_path":"src/missing.tsx"}', toolContent: 'File does not exist: src/missing.tsx' },
    { key: 'g_read_int', kind: 'tool', toolName: 'Read', toolStatus: 'interrupted',
      text: '{"file_path":"src/App.tsx"}', toolContent: '（轮次已结束——未收到工具结果）' },
  ],
  '文件读写 · Edit（入参承载，running 即可展开 diff）': [
    { key: 'g_edit_run', kind: 'tool', toolName: 'Edit', toolStatus: 'running',
      text: '{"file_path":"src/App.tsx","old_string":"hello","new_string":"你好"}', toolContent: '' },
    { key: 'g_edit_done', kind: 'tool', toolName: 'Edit', toolStatus: 'done',
      text: '{"file_path":"src/App.tsx","old_string":"hello","new_string":"你好，世界"}',
      toolContent: 'The file src/App.tsx has been updated.' },
    { key: 'g_edit_err', kind: 'tool', toolName: 'Write', toolStatus: 'error',
      text: '{"file_path":"/etc/passwd","content":"x"}', toolContent: 'Write denied: path outside workspace' },
    { key: 'g_edit_int', kind: 'tool', toolName: 'Edit', toolStatus: 'interrupted',
      text: '{"file_path":"src/App.tsx","old_string":"a","new_string":"b"}', toolContent: '（新一轮开始——上一轮调用未完成）' },
  ],
  '命令 · Bash（结果承载，error 默认展开）': [
    { key: 'g_bash_run', kind: 'tool', toolName: 'Bash', toolStatus: 'running',
      text: '{"command":"npm install","description":"Install deps"}', toolContent: '' },
    { key: 'g_bash_done', kind: 'tool', toolName: 'Bash', toolStatus: 'done',
      text: '{"command":"npm test -- --run wire.test.ts"}',
      toolContent: ' ✓ src/lib/wire.test.ts (4)\n Test Files  1 passed (1)' },
    { key: 'g_bash_err', kind: 'tool', toolName: 'Bash', toolStatus: 'error',
      text: '{"command":"cat /no/such"}', toolContent: 'cat: /no/such: No such file or directory\nExit code 1' },
    { key: 'g_bash_int', kind: 'tool', toolName: 'Bash', toolStatus: 'interrupted',
      text: '{"command":"npm run build"}', toolContent: '（轮次失败——未收到工具结果）' },
  ],
  '搜索 · Grep（空结果=成功空态）': [
    { key: 'g_grep_run', kind: 'tool', toolName: 'Grep', toolStatus: 'running',
      text: '{"pattern":"useChatStore","path":"src"}', toolContent: '' },
    { key: 'g_grep_done', kind: 'tool', toolName: 'Grep', toolStatus: 'done',
      text: '{"pattern":"useChatStore","path":"src","output_mode":"files_with_matches"}',
      toolContent: 'src/stores/chat.ts\nsrc/components/ChatPane.tsx' },
    { key: 'g_grep_empty', kind: 'tool', toolName: 'Grep', toolStatus: 'done',
      text: '{"pattern":"zzNotFound","path":"src"}', toolContent: '' },
    { key: 'g_grep_err', kind: 'tool', toolName: 'Grep', toolStatus: 'error',
      text: '{"pattern":"[invalid","path":"src"}', toolContent: 'Invalid regular expression: /[invalid/: Unterminated character class' },
  ],
  '外部 · WebFetch（长文本，纯文本渲染）': [
    { key: 'g_web_run', kind: 'tool', toolName: 'WebFetch', toolStatus: 'running',
      text: '{"url":"https://react.dev/reference/react/use"}', toolContent: '' },
    { key: 'g_web_done', kind: 'tool', toolName: 'WebSearch', toolStatus: 'done',
      text: '{"query":"React 19 use() hook"}',
      toolContent: '1. react.dev — use() reads a resource like a Promise or context during render.\n2. 相比 useContext，use() 可条件调用，也能读取 Promise。\n3. 常见用法：const value = use(promise)。\n4. 注意：use() 只能在渲染期间调用。' },
    { key: 'g_web_err', kind: 'tool', toolName: 'WebFetch', toolStatus: 'error',
      text: '{"url":"https://internal.example.invalid/doc"}', toolContent: 'Error fetching URL: net::ERR_NAME_NOT_RESOLVED' },
    { key: 'g_web_int', kind: 'tool', toolName: 'WebFetch', toolStatus: 'interrupted',
      text: '{"url":"https://react.dev"}', toolContent: '（轮次已结束——未收到工具结果）' },
  ],
  '编排 · TodoWrite（入参承载，驱动顶部清单）': [
    { key: 'g_todo_run', kind: 'tool', toolName: 'TodoWrite', toolStatus: 'running',
      text: '{"todos":[{"content":"搭登录页","status":"completed"},{"content":"接验证码接口","status":"in_progress"},{"content":"写单测","status":"pending"}]}', toolContent: '' },
    { key: 'g_todo_done', kind: 'tool', toolName: 'TodoWrite', toolStatus: 'done',
      text: '{"todos":[{"content":"搭登录页","status":"completed"},{"content":"接验证码接口","status":"completed"},{"content":"写单测","status":"in_progress"}]}',
      toolContent: 'Todos updated.' },
  ],
  '结构化 MCP · spawn_worker（出参 JSON）': [
    { key: 'g_mcp_run', kind: 'tool', toolName: 'mcp__spawn-worker__spawn_worker', toolStatus: 'running',
      text: '{"title":"加登录页","description":"实现登录表单，文件限制在 src/pages/Login"}', toolContent: '' },
    { key: 'g_mcp_done', kind: 'tool', toolName: 'mcp__spawn-worker__spawn_worker', toolStatus: 'done',
      text: '{"title":"加登录页","description":"实现登录表单"}',
      toolContent: '{"task_id":"task_1","worker_id":"w_ab","branch":"task/w_ab"}' },
    { key: 'g_mcp_err', kind: 'tool', toolName: 'mcp__spawn-worker__merge_mr', toolStatus: 'error',
      text: '{"iid":18}', toolContent: 'core 409: merge conflict on src/App.tsx' },
  ],
  '子 Agent · Task（进度卡，可展开子对话流）': [
    { key: 'g_task_run', kind: 'tool', toolName: 'Task', toolStatus: 'running', task: {
        subagentType: 'general-purpose', durationMs: 12800, toolUses: 3, totalTokens: 8200,
        lastToolName: 'Bash', summary: '正在跑测试套件…' },
      text: '{"subagent_type":"general-purpose","description":"跑全量测试","prompt":"运行 npm test 并总结失败项"}',
      toolContent: '',
      subStream: [
        { key: 'gr1', kind: 'tool', toolName: 'Read', toolStatus: 'done', text: '{"file_path":"package.json"}', toolContent: '     1→{ "scripts": { "test": "vitest" } }' },
        { key: 'gr2', kind: 'tool', toolName: 'Bash', toolStatus: 'running', text: '{"command":"npm test"}', toolContent: '' },
      ] },
    { key: 'g_task_done', kind: 'tool', toolName: 'Task', toolStatus: 'done', task: {
        subagentType: 'Explore', durationMs: 42300, toolUses: 6, totalTokens: 18400,
        lastToolName: 'Read', summary: '已读 5 个文件、grep 2 次，定位到 3 个读点、1 个写点' },
      text: '{"subagent_type":"Explore","description":"排查 useChatStore 用法","prompt":"总结读写点"}',
      toolContent: 'useChatStore 在 3 处使用；写入集中在 store 的 append/patch。',
      subStream: [
        { key: 'gd1', kind: 'tool', toolName: 'Grep', toolStatus: 'done', text: '{"pattern":"useChatStore"}', toolContent: 'src/stores/chat.ts' },
        { key: 'gd2', kind: 'tool', toolName: 'Read', toolStatus: 'done', text: '{"file_path":"src/stores/chat.ts"}', toolContent: '     1→export const useChatStore = create(...)' },
      ] },
    { key: 'g_task_err', kind: 'tool', toolName: 'Task', toolStatus: 'error', task: {
        subagentType: 'general-purpose', durationMs: 5100, toolUses: 1, totalTokens: 2300,
        lastToolName: 'Bash', summary: '子 Agent 异常退出' },
      text: '{"subagent_type":"general-purpose","description":"部署","prompt":"deploy"}',
      toolContent: '子 Agent 执行失败：命令 deploy.sh 返回非零退出码 (127)' },
  ],
  '用户交互 · AskUserQuestion（唯一会卡住等用户）': [
    { key: 'g_ask_run', kind: 'tool', toolName: 'AskUserQuestion', toolStatus: 'running',
      text: '{"questions":[{"header":"布局","question":"首页用哪种结构？","options":[{"label":"单列信息流","description":"更快上线"},{"label":"左导航右内容","description":"可扩展"}]}]}', toolContent: '' },
    { key: 'g_ask_done', kind: 'tool', toolName: 'AskUserQuestion', toolStatus: 'done',
      text: '{"questions":[{"header":"布局","question":"首页用哪种结构？","options":[{"label":"单列信息流","description":"更快上线"},{"label":"左导航右内容","description":"可扩展"}]}]}',
      toolContent: '用户选择：单列信息流' },
    { key: 'g_ask_timeout', kind: 'tool', toolName: 'AskUserQuestion', toolStatus: 'done',
      text: '{"questions":[{"header":"布局","question":"首页用哪种结构？","options":[{"label":"单列信息流"},{"label":"左导航右内容"}]}]}',
      toolContent: '用户选择：（用户未选择——请直接在回复文本中列出编号选项让用户回答）' },
  ],
  '兜底 · 未知 name / Skill / 插件 MCP': [
    { key: 'g_fb_run', kind: 'tool', toolName: 'Skill', toolStatus: 'running',
      text: '{"skill":"pdf","args":"report.pdf"}', toolContent: '' },
    { key: 'g_fb_done', kind: 'tool', toolName: 'mcp__plugin-x__do_thing', toolStatus: 'done',
      text: '{"foo":"bar","n":42}', toolContent: '{"ok":true,"detail":"done"}' },
    { key: 'g_fb_err', kind: 'tool', toolName: 'EnterPlanMode', toolStatus: 'error',
      text: '{}', toolContent: 'Plan mode disabled in debug-daemon' },
  ],
};

// ── 分段对比演示 ──────────────────────────────────────────
// 同一段工作（查 3 → 改 3 → 测 1 → 推送 1），推送为高危副作用。
const baseWork = [
  { key: 'b1', kind: 'tool', toolName: 'Read', toolStatus: 'done',
    text: '{"file_path":"src/auth/login.ts"}', toolContent: '     1→export function login() {}' },
  { key: 'b2', kind: 'tool', toolName: 'Read', toolStatus: 'done',
    text: '{"file_path":"src/auth/session.ts"}', toolContent: '     1→export function session() {}' },
  { key: 'b3', kind: 'tool', toolName: 'Grep', toolStatus: 'done',
    text: '{"pattern":"validateToken","path":"src/auth"}', toolContent: 'src/auth/login.ts\nsrc/auth/session.ts' },
  { key: 'b4', kind: 'tool', toolName: 'Edit', toolStatus: 'done',
    text: '{"file_path":"src/auth/login.ts","old_string":"if(t)","new_string":"if(validate(t))"}', toolContent: 'updated' },
  { key: 'b5', kind: 'tool', toolName: 'Edit', toolStatus: 'done',
    text: '{"file_path":"src/auth/session.ts","old_string":"raw","new_string":"validated"}', toolContent: 'updated' },
  { key: 'b6', kind: 'tool', toolName: 'Edit', toolStatus: 'done',
    text: '{"file_path":"src/auth/index.ts","old_string":"export *","new_string":"export { validate }"}', toolContent: 'updated' },
  { key: 'b7', kind: 'tool', toolName: 'Bash', toolStatus: 'done',
    text: '{"command":"npm test -- src/auth"}', toolContent: ' Tests  12 passed (12)' },
  { key: 'b8', kind: 'tool', toolName: 'Bash', toolStatus: 'done', risk: 'destructive',
    text: '{"command":"git push origin main"}', toolContent: 'To github.com:acme/app.git\n   a1b2c3d..e4f5g6h  main -> main' },
];

const intro = { key: 'intro', kind: 'text', text: '目标：加固 auth 的 token 校验，三处文件改动，跑测试后推送到远端。' };
const outro = { key: 'outro', kind: 'text', text: '完成：三处重构、单测 12 项通过，已推送 main。' };

// 惜字模型：几乎不叙述——除首尾外无插话。
export const terseTranscript = [intro, ...baseWork, outro];

// 话痨模型：每个 tool 前都有一句引子（lead:true）。
const leads = [
  '先看登录实现。', '再看会话模块。', '搜一下 validateToken 的引用。',
  '改登录里的校验分支。', '同步改会话模块。', '顺手把入口导出也改了。',
  '跑一遍单测确认没坏。', '没问题，推上去。',
];
export const verboseTranscript = [
  intro,
  ...baseWork.flatMap((t, i) => [{ key: `lead${i}`, kind: 'text', lead: true, text: leads[i] }, t]),
  outro,
];
