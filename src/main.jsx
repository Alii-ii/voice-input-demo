import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ChatLab from './chat/ChatLab.jsx'
import InspectLab from './inspect/InspectLab.jsx'
import { cn } from './lib/cn.js'
import { useMobileStage } from './lib/useMobileStage.js'
import './index.css'

/**
 * 极简 hash 路由（适配 GitHub Pages 静态托管：deep-link 免服务端 rewrite）
 *  - #/chat    → 对话 Minimap 实验台
 *  - #/voice   → 语音输入交互探索
 *  - #/inspect → 移动端点选编辑
 *  分享 URL 自带 hash 即可直达对应 demo，无需手动切 tab。
 */
const ROUTES = [
  { key: 'chat', hash: '#/chat', label: '对话 Minimap 实验台', title: '对话 Minimap 实验台' },
  { key: 'voice', hash: '#/voice', label: '语音输入交互探索', title: '语音输入交互探索' },
  { key: 'inspect', hash: '#/inspect', label: '移动端点选', title: '移动端点选编辑' },
]
const DEFAULT_KEY = 'chat'

function keyFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, '').toLowerCase() // '#/voice' -> 'voice'
  return ROUTES.some((r) => r.key === raw) ? raw : DEFAULT_KEY
}

function Root() {
  const [tab, setTab] = useState(keyFromHash)
  // 移动端打开点选 demo 时藏掉外层切换条；手机壳内不进全屏态。换 demo 仍走 hash
  const mobileStage = useMobileStage()

  // 首次加载无 hash → 补上默认路由，让分享出去的 URL 永远显式带页面定位
  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, '', ROUTES.find((r) => r.key === DEFAULT_KEY).hash)
    }
  }, [])

  // 监听前进/后退与手动改 hash，保持 UI 与 URL 同步
  useEffect(() => {
    const onHash = () => setTab(keyFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // 标题随路由变化，分享/收藏时更清晰
  useEffect(() => {
    const cur = ROUTES.find((r) => r.key === tab)
    if (cur) document.title = cur.title
  }, [tab])

  const go = (key) => {
    const cur = ROUTES.find((r) => r.key === key)
    if (cur) window.location.hash = cur.hash // 触发 hashchange → setTab
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* 窄屏顶栏横向滚动，tab 不换行、不挤扁 */}
      <div
        className={cn(
          'flex min-w-0 shrink-0 flex-nowrap gap-1.5 overflow-x-auto border-b border-[#3a3a3c] bg-[rgba(28,28,30,0.7)] px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          mobileStage && tab === 'inspect' && 'hidden',
        )}
      >
        {ROUTES.map((r) => (
          <button
            key={r.key}
            type="button"
            className={cn(
              'shrink-0 cursor-pointer whitespace-nowrap rounded-[9px] border border-transparent px-3 py-1.5 text-[13px]',
              tab === r.key
                ? 'border-[#46464a] bg-ink text-white'
                : 'bg-transparent text-muted',
            )}
            onClick={() => go(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>
      {/* chat / inspect：整页锁在视口内；voice：仍允许整页滚动 */}
      <div className={cn('min-h-0 flex-1', tab === 'voice' ? 'overflow-auto' : 'overflow-hidden')}>
        {tab === 'chat' && <ChatLab />}
        {tab === 'voice' && <App />}
        {tab === 'inspect' && <InspectLab />}
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
