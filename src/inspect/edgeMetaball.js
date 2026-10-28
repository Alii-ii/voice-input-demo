/**
 * 边缘 toggle 的一条闭合轮廓。
 * 位移小时贴边鼓成余弦小山。头离开边缘后仍是几何正圆，
 * 脖子是两条内凹曲线：边缘开口更宽，另一端贴着正圆的切线，不伸进圆里。
 */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function fmt(n) {
  return String(Math.round(n * 10) / 10)
}

function toPath(pts) {
  let d = `M ${fmt(pts[0][0])} ${fmt(pts[0][1])}`
  for (let i = 1; i < pts.length; i += 1) d += ` L ${fmt(pts[i][0])} ${fmt(pts[i][1])}`
  return `${d} Z`
}

/**
 * 贴边余弦小山。坡脚切线竖直，和边缘重合；顶也是圆的。
 * 半跨大于向内的高度，高度本身跟着位移走，不写死半径。
 */
function hillPoints(reach, foot) {
  const steps = 56
  const pts = []
  for (let i = 0; i <= steps; i += 1) {
    const y = -foot + (2 * foot * i) / steps
    const x = reach * 0.5 * (1 + Math.cos((Math.PI * y) / foot))
    pts.push([x, y])
  }
  return pts
}

function cubic(p0, p1, p2, p3, s) {
  const u = 1 - s
  return [
    u * u * u * p0[0] + 3 * u * u * s * p1[0] + 3 * u * s * s * p2[0] + s * s * s * p3[0],
    u * u * u * p0[1] + 3 * u * u * s * p1[1] + 3 * u * s * s * p2[1] + s * s * s * p3[1],
  ]
}

/**
 * 从边缘开口走到圆上的切点。
 * 前半段先保持开口的宽度往里走，中段再凹向中线，末端沿着圆的切线贴上去。
 */
function neckSide(reach, headR, alpha, foot) {
  const cosA = Math.cos(alpha)
  const sinA = Math.sin(alpha)
  const tx = reach - headR * cosA
  const ty = headR * sinA
  const edge = [0, -foot]
  const tip = [tx, -ty]
  // 到达切点时的方向：向右并略微向外，和圆的长弧接上
  const fwd = [sinA, -cosA]
  const span = Math.max(tx, 1)
  const edgeCtrl = [span * 0.42, -foot + (foot - ty) * 0.06]
  const tipCtrl = [tip[0] - fwd[0] * span * 0.38, tip[1] - fwd[1] * span * 0.38]
  const steps = 24
  const pts = []
  for (let i = 0; i <= steps; i += 1) pts.push(cubic(edge, edgeCtrl, tipCtrl, tip, i / steps))
  return pts
}

/**
 * 正圆走切点外侧的长弧，左右极点和上下顶点都取到。
 * 脖子只接在两个切点上，左极点附近少掉的一窄条仍让宽高几乎相等。
 */
function dropPoints(reach, headR, t) {
  const alpha = Math.min(0.62, Math.acos(clamp(1 - 1.4 / Math.max(headR, 1.4), -1, 1)))
  const ty = headR * Math.sin(alpha)
  const retract = clamp((t - 0.8) / 0.2, 0, 1)
  const foot = Math.max(ty * 2.15, headR * 0.95) * (1 - retract)
  const drawNeck = retract < 0.55 && foot > ty * 1.2
  const nArc = 72
  if (!drawNeck) {
    const pts = []
    for (let i = 0; i <= nArc; i += 1) {
      const ang = (2 * Math.PI * i) / nArc
      pts.push([reach + headR * Math.cos(ang), headR * Math.sin(ang)])
    }
    return pts
  }
  const upper = neckSide(reach, headR, alpha, foot)
  const pts = upper.slice()
  const start = Math.PI + alpha
  const sweep = 2 * Math.PI - 2 * alpha
  const marks = [1.5 * Math.PI, 2 * Math.PI, 2.5 * Math.PI]
  let mark = 0
  for (let i = 1; i <= nArc; i += 1) {
    const ang = start + sweep * (i / nArc)
    while (mark < marks.length && marks[mark] <= ang) {
      pts.push([reach + headR * Math.cos(marks[mark]), headR * Math.sin(marks[mark])])
      mark += 1
    }
    pts.push([reach + headR * Math.cos(ang), headR * Math.sin(ang)])
  }
  for (let i = upper.length - 2; i >= 0; i -= 1) pts.push([upper[i][0], -upper[i][1]])
  return pts
}

/**
 * x/y 相对手机框。progress 是位移/阈值。
 * 头离开边缘后圆心在指头上；到阈值时根和脖子收回，只剩半径 24 的圆。
 */
export function edgeTogglePath({ side, x, y, progress, width, height }) {
  if (!width || !height || !side) return ''
  const inward = side === 'right' ? width - x : Math.max(0, x)
  const t = clamp(progress || 0, 0, 1)
  const reach = Math.max(inward, 0)
  if (reach < 0.6 && t < 0.03) return ''
  // 先慢一点长大，脖子才有长度；到阈值仍是半径 24 的正圆
  const headR = 24 * t ** 2.4
  // 边上的半高从比鼓起更宽收到 0，小山阶段用
  const foot = reach * 1.35 * (1 - t)
  // 头一旦成形就保持正圆。圆贴回边缘时也只画这颗圆，不要退回一条细管
  const separated = t >= 0.46 && headR >= 5
  const local = separated ? dropPoints(reach, headR, t) : foot > 0.4 ? hillPoints(reach, foot) : []
  if (local.length < 4) return ''
  const mapX = (px) => (side === 'right' ? width - px : px)
  const cy = clamp(y || 0, 0, height)
  return toPath(local.map(([px, py]) => [mapX(px), cy + py]))
}
