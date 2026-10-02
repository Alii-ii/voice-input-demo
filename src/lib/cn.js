import clsx from 'clsx'

/** 合并 className（条件类 / 数组 / 字符串） */
export function cn(...args) {
  return clsx(...args)
}
