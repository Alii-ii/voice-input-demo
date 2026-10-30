import { useEffect, useState } from 'react'
import InspectLab from './InspectLab.jsx'
import PathTabs from './PathTabs.jsx'
import { ensurePathsClickHash, hashForScheme } from './pathHash.js'

/** 隐藏一级路由 #/paths。四个方案各有一条 hash，切 tab 时整页重挂 */
export default function PathsPage() {
  const [scheme, setScheme] = useState(() => ensurePathsClickHash())

  useEffect(() => {
    const sync = () => setScheme(ensurePathsClickHash())
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  // 点 tab 写入对应 hash，前进后退和直接打开 URL 都靠 hashchange 对齐选中态
  const onChange = (key) => {
    const next = hashForScheme(key)
    if (window.location.hash.toLowerCase() === next) {
      setScheme(key)
      return
    }
    window.location.hash = next
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-path-scheme={scheme}>
      <PathTabs value={scheme} onChange={onChange} />
      <div className="min-h-0 flex-1 overflow-hidden">
        <InspectLab key={scheme} scheme={scheme} />
      </div>
    </div>
  )
}
