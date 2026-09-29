/**
 * 对话数据 mock
 *
 * 一「轮 (turn)」= 一条 user + 一条 assistant。
 * makeConversation(turns) 生成 turns*2 条消息，用于压测 minimap 在长对话下的表现。
 *
 * 预设档位见 PRESETS：从「正常」一路到「极端」的 3 位数轮次，
 * 用来复现 Chat Minimap 固定密度 rail 撑爆面板的问题。
 */

// —— 语料池：围绕 AI Coding / 前端 / 设计工程化，贴近真实长对话 ——
const USER_PROMPTS = [
  '帮我理一下 AI Coding 里任务复杂度和协作模式的匹配关系',
  '广度代理和精度控制这两条产品路线，本质区别在哪？',
  'Figma 到 React 的迁移，设计师最容易卡在哪一步？',
  '单人全栈的 P-D-E 模型，瓶颈通常出现在哪个环节？',
  'prompt / spec / test 三层框架，各自该承担什么职责？',
  '为什么说 AI 产品真正的瓶颈在对齐侧而不是生成侧？',
  '异步委托 + 同步校正的工作流，人的角色具体是什么？',
  'Conventional Commits 在多分支 worktree 并行时怎么组织比较顺？',
  '给我讲讲 scrollspy、minimap、anchor rail 这几个概念的区别',
  '长对话的导航组件，固定密度和 scale-to-fit 哪个更合理？',
  '帮我把这段逻辑重构一下，抽出可复用的 hook',
  '这个组件在 3 位数轮次下会不会有性能问题？',
  '虚拟化列表和固定高度列表，取舍点在哪？',
  '如果要做一个鱼眼放大的 dock，falloff 曲线用线性还是余弦？',
  '帮我评估一下这个交互的可访问性，键盘能不能完整操作？',
]

const ASSISTANT_OPENERS = [
  '可以拆成三层来看。',
  '核心的取舍在于一个变量：',
  '先给结论，再展开。',
  '这里有个常见的误区需要先澄清。',
  '本质上这是一个带宽分配问题。',
  '我把它归纳为一个矩阵。',
  '分场景讨论会更清楚。',
  '关键不在工具，而在流程设计。',
]

const ASSISTANT_BODIES = [
  '第一层是信息处理，这部分 AI 可以大幅压缩流程；第二层是价值判断，只能让有上下文的人更快到达判断节点，而不是替代判断本身。',
  '瓶颈往往不在生成侧——生成越来越快、越来越多、越来越久——真正的堵点在对齐侧：人看不过来、看了不知道怎么判断、判断了不知道怎么反馈回去。',
  '所以产品设计的命题变成了「让人更快到达判断节点」的路径设计，而不是单纯堆生成能力。',
  '实现上建议保留清晰的主线，把细节收进折叠面板，用 note/tip 突出核心原则，用颜色区分重要性等级，避免细节干扰主线阅读。',
  '从工程角度，固定高度列表实现简单但在 3 位数量级会线性膨胀；虚拟化能扛量，但会牺牲「一屏俯瞰全局」的直觉。',
  '如果要 scale-to-fit，marker 高度应该等于「可视高度 / 轮次数」，再叠加一个鱼眼透镜解决点不中的问题。',
  '落到代码，我会先抽一个 useActiveMessage 的 hook 负责 IntersectionObserver，再让 minimap 只消费 activeId，职责分离更好维护。',
  '可访问性上要保证 rail 里的每个 marker 都是可聚焦的按钮，方向键可上下移动，Enter 跳转，并尊重 prefers-reduced-motion。',
]

const TOPIC_TAGS = ['对齐', '生成', '协作', '重构', '导航', '性能', '可访问性', '设计', '架构']

// 稳定的伪随机，保证每次生成同一份数据（便于对比调参）
function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)]
}

/**
 * @param {number} turns 轮次数（一轮 = user + assistant）
 * @returns {Array<{id,role,title,tag,content}>} 扁平消息列表
 */
export function makeConversation(turns) {
  const rand = seeded(20260929 + turns)
  const messages = []
  for (let i = 0; i < turns; i++) {
    const prompt = pick(rand, USER_PROMPTS)
    messages.push({
      id: `u-${i}`,
      role: 'user',
      title: prompt,
      tag: pick(rand, TOPIC_TAGS),
      content: prompt,
    })

    const opener = pick(rand, ASSISTANT_OPENERS)
    // 回答长度随机，模拟真实对话里长短不一的气泡
    const paraCount = 1 + Math.floor(rand() * 3)
    const paras = []
    for (let p = 0; p < paraCount; p++) paras.push(pick(rand, ASSISTANT_BODIES))
    messages.push({
      id: `a-${i}`,
      role: 'assistant',
      title: opener + paras[0].slice(0, 18) + '…',
      tag: pick(rand, TOPIC_TAGS),
      content: opener + '\n\n' + paras.join('\n\n'),
    })
  }
  return messages
}

// 档位预设：turns 为轮次；messages = turns*2
export const PRESETS = [
  { key: 'normal', label: '正常 · 12 轮', turns: 12 },
  { key: 'medium', label: '中等 · 60 轮', turns: 60 },
  { key: 'long', label: '长 · 150 轮', turns: 150 },
  { key: 'extreme', label: '极端 · 300 轮', turns: 300 },
]
