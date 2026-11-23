import AccountUsage from './AccountUsage.jsx'
import accountUsageSource from './AccountUsage.jsx?raw'
import CopyComponentCodeBar from '../lib/CopyComponentCodeBar.jsx'

export default function AccountUsageDemo() {
  return (
    <div className="flex h-full flex-col">
      <main className="min-h-0 flex-1 overflow-auto bg-[#ededee]" aria-label="账号与用量组件演示">
        <div className="grid justify-items-center px-3 pb-6 pt-[max(326px,calc(50dvh+104px))]">
          <AccountUsage name="UserB5EEZA66GMAWW" accountId="421981591923474432" />
        </div>
      </main>
      <CopyComponentCodeBar source={accountUsageSource} filename="AccountUsage.jsx"
        format="React" contents="含组件 / 样式 / SVG 图标" />
    </div>
  )
}
