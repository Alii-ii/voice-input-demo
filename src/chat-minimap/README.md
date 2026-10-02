# chat-minimap

可直接带走的对话时间轴（居中胶片 + 鱼眼 + hover 详情卡）。

## 安装依赖

- `react`
- `clsx`
- Tailwind CSS（组件使用 utility class）

把整个 `chat-minimap/` 目录拷进你的项目即可。

## 快速接入

```jsx
import {
  ChatMinimap,
  buildTurnItems,
  getRailReserve,
  useMinimapScrollSpy,
} from './chat-minimap'

function Chat({ messages }) {
  const turns = useMemo(() => buildTurnItems(messages), [messages])
  const { scrollerRef, registerItem, schedule, jumpTo, activeTurnId, turnRange } =
    useMinimapScrollSpy({ messages, turns })

  const side = 'left'
  const reserve = getRailReserve({ hoverMax: 22 })

  return (
    <div className="relative h-full overflow-hidden">
      <div ref={scrollerRef} className="h-full overflow-y-auto" onScroll={schedule}>
        <div style={side === 'left' ? { paddingLeft: reserve } : { paddingRight: reserve }}>
          {messages.map((m) => (
            <article key={m.id} data-id={m.id} ref={registerItem(m.id)}>
              {m.content}
            </article>
          ))}
        </div>
      </div>

      <ChatMinimap
        items={turns}
        activeId={activeTurnId}
        visibleRange={turnRange}
        onJump={jumpTo}
        scrollerRef={scrollerRef}
        side={side}
      />
    </div>
  )
}
```

父容器需 `position: relative`；消息节点需 `data-id` + `registerItem`。

## Props

| prop | 说明 |
|------|------|
| `items` | `{ id, userText?, assistantText? }[]`，一轮一条 |
| `activeId` | 当前 active 轮 id |
| `visibleRange` | `[first, last]` 视口内轮索引 |
| `onJump(id)` | 点击跳转 |
| `scrollerRef` | 对话流滚动容器 |
| `side` | `'left'` \| `'right'` |
| `itemSize` / `hoverRow` / `dotLen` / `hoverMax` / `gap` / `lensRange` | 尺寸与鱼眼 |

## 主题变量

```css
:root {
  --cm-panel: #ffffff;
  --cm-ink: #1c1c1e;
  --cm-muted: #9a9a9d;
  --cm-pill: #d9d9de;
  --cm-pill-visible: #9a9aa0;
  --cm-pill-hover: #1c1c1e;
}
```
