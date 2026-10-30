/** 隐藏页二级路由。key 与 hash 一一对应，点 tab 和直接打开 URL 都走这里 */
export const PATH_SCHEMES = [
  { key: 'click', label: '点击进入选择', hash: '#/paths/click' },
  { key: 'fullscreen', label: '全屏下点击进入选择', hash: '#/paths/fullscreen' },
  { key: 'two-finger', label: '双指长按选择', hash: '#/paths/two-finger' },
  { key: 'long-press', label: '单指长按选择', hash: '#/paths/long-press' },
]

const SLUGS = new Set(PATH_SCHEMES.map((item) => item.key))

function pathParts(hash = window.location.hash) {
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean)
}

/** #/paths 以及 #/paths/... 都算隐藏路由 */
export function isPathsHash(hash = window.location.hash) {
  const head = (pathParts(hash)[0] || '').toLowerCase()
  return head === 'paths'
}

/** 读出当前二级方案。没有合法 slug 时先按 click 理解，不改地址 */
export function schemeFromHash(hash = window.location.hash) {
  const slug = (pathParts(hash)[1] || '').toLowerCase()
  return SLUGS.has(slug) ? slug : 'click'
}

/**
 * #/paths 和 #/paths/ 换成 #/paths/click。
 * 用 replaceState，刷新后仍停在 click，不多留一条历史。
 */
export function ensurePathsClickHash() {
  const parts = pathParts()
  if ((parts[0] || '').toLowerCase() !== 'paths') return schemeFromHash()
  const slug = (parts[1] || '').toLowerCase()
  if (SLUGS.has(slug)) return slug
  if (parts.length > 1) return 'click'
  const next = `${window.location.pathname}${window.location.search}#/paths/click`
  window.history.replaceState(null, '', next)
  return 'click'
}

export function hashForScheme(key) {
  return PATH_SCHEMES.find((item) => item.key === key)?.hash || '#/paths/click'
}
