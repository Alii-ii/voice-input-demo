import { cn } from '../../lib/cn.js'

/**
 * 跟随手指的空 tag。外形仍对齐点选序号徽标：26px 方块、蓝底。
 * 指向角 4px，其余三角按边长一半（13px）画成整圆；右下角指向接触点。
 * 里面不放序号，也不放「指定区域」和手型光标。松手后输入框芯片仍用「指定区域」。
 */
export default function AreaTag({ className }) {
  return (
    <span
      data-area-tag=""
      className={cn(
        // 边长和序号徽标一样是 26。写成 9999px 时相邻半径会超过边长，4px 指向角会被缩成尖角
        'inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center border-0 bg-[#2f89ff] p-0 text-[15px] font-light leading-none text-white',
        'rounded-tl-[13px] rounded-tr-[13px] rounded-br-[4px] rounded-bl-[13px]',
        className,
      )}
    />
  )
}
