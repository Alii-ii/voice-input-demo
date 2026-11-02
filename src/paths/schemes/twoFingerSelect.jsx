import { CornerBracket, CORNER_RADIUS } from '../corners/CornerBracket.jsx'
import { MASK_SCRIM } from '../edgeSwipeEffect.jsx'

/** 只有双指入口放行 */
export function twoFingerAllows(entry) {
  return entry === 'two-finger'
}

/** 不进全屏。周围遮罩由双指选框自己挖洞，不走点选那张带虚线的整页遮罩 */
export function twoFingerDefaults() {
  return { fullscreen: false }
}

/** 坐标相对覆盖层，读 { x, y } */
function readFinger(finger) {
  const x = Number(finger?.x)
  const y = Number(finger?.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

/**
 * 两指是轴对齐矩形的一组对角。
 * 宽 = 两点水平距离，高 = 两点垂直距离，矩形被这段距离撑开。
 * 这个矩形就是选区，不是手指划过的路径。
 */
export function twoFingerRect(a, b) {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  }
}

/** 遮罩上的方框收成预览页内容比例，松手后还能按同一块矩形重投 */
export function overlayRectToPageRatio(rect, overlayRect, pageEl) {
  const page = pageEl.getBoundingClientRect()
  const width = pageEl.scrollWidth || page.width || 1
  const height = pageEl.scrollHeight || page.height || 1
  return {
    x: (rect.left + overlayRect.left - page.left + pageEl.scrollLeft) / width,
    y: (rect.top + overlayRect.top - page.top + pageEl.scrollTop) / height,
    w: rect.width / width,
    h: rect.height / height,
  }
}

/** 页面比例投回当前遮罩。滚动或全屏之后，方框还落在原来那一块内容上 */
export function pageRatioRectToOverlay(ratio, pageEl, origin) {
  const page = pageEl.getBoundingClientRect()
  const width = pageEl.scrollWidth || page.width || 1
  const height = pageEl.scrollHeight || page.height || 1
  return {
    left: page.left + ratio.x * width - pageEl.scrollLeft - origin.left,
    top: page.top + ratio.y * height - pageEl.scrollTop - origin.top,
    width: ratio.w * width,
    height: ratio.h * height,
  }
}

/**
 * 双指选框。fingerA / fingerB 相对覆盖层。
 * 页面若仍把两点放在 fingers 里，取前两点当对角。
 * 周围是点选那层 MASK_SCRIM，方框按 8px 圆角挖空。
 * 点选选区洞的填充是 none，框内不再铺颜色，露出的内容就是高亮。
 */
export function TwoFingerOverlay({ fingerA, fingerB, fingers, width, height }) {
  const a = readFinger(fingerA) ?? readFinger(fingers?.[0])
  const b = readFinger(fingerB) ?? readFinger(fingers?.[1])
  if (!a || !b) return null
  const rect = twoFingerRect(a, b)
  const frameW = Number(width) || 0
  const frameH = Number(height) || 0
  return (
    <div className="pointer-events-none absolute inset-0">
      {frameW > 0 && frameH > 0 ? (
        <svg
          aria-hidden="true"
          width={frameW}
          height={frameH}
          className="pointer-events-none absolute left-0 top-0"
          style={{ width: frameW, height: frameH }}
        >
          <defs>
            {/* 白底留住周围遮罩，黑色圆角矩形把选区挖空。圆角和角标外弧同一个数 */}
            <mask
              id="two-finger-scrim-mask"
              maskUnits="userSpaceOnUse"
              maskContentUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={frameW}
              height={frameH}
            >
              <rect x="0" y="0" width={frameW} height={frameH} fill="white" />
              <rect
                x={rect.left}
                y={rect.top}
                width={Math.max(rect.width, 0)}
                height={Math.max(rect.height, 0)}
                rx={CORNER_RADIUS}
                ry={CORNER_RADIUS}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width={frameW}
            height={frameH}
            fill={MASK_SCRIM}
            mask="url(#two-finger-scrim-mask)"
          />
        </svg>
      ) : null}
      <div
        className="absolute overflow-hidden border-0 bg-transparent"
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          // 圆角跟角标外弧、挖空边缘同一个值，角标被裁在选框内
          borderRadius: CORNER_RADIUS,
        }}
      >
        <CornerBracket />
      </div>
    </div>
  )
}
