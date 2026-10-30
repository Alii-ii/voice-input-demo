import { cn } from '../lib/cn.js'
import { PATH_SCHEMES } from './pathHash.js'

/** 隐藏页自己的二级 tab，不进全局顶栏 */
export { PATH_SCHEMES }

export default function PathTabs({ value, onChange }) {
  return (
    <div className="flex min-w-0 shrink-0 flex-nowrap gap-1.5 overflow-x-auto border-b border-[#3a3a3c] bg-[rgba(28,28,30,0.7)] px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {PATH_SCHEMES.map((item) => (
        <button
          key={item.key}
          type="button"
          className={cn(
            'shrink-0 cursor-pointer whitespace-nowrap rounded-[9px] border border-transparent px-3 py-1.5 text-[13px]',
            value === item.key
              ? 'border-[#46464a] bg-ink text-white'
              : 'bg-transparent text-muted',
          )}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
