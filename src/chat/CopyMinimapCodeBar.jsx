import CopyComponentCodeBar from '../lib/CopyComponentCodeBar.jsx'
import minimapSource from '../ChatMinimap.jsx?raw'

export default function CopyMinimapCodeBar() {
  return (
    <CopyComponentCodeBar source={minimapSource} filename="ChatMinimap.jsx"
      format="React + Tailwind" contents="含组件 / scrollspy / buildTurnItems" />
  )
}
