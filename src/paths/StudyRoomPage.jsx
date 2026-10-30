import { useState } from 'react'
import { cn } from '../lib/cn.js'
import heroUrl from './hero.png'

const DATES = ['10月8日', '10月9日', '10月10日', '10月11日']

const SLOTS = [
  { id: '08', label: '08:00–09:00' },
  { id: '09', label: '09:00–10:00' },
  { id: '10', label: '10:00–11:00' },
  { id: '11', label: '11:00–12:00' },
  { id: '12', label: '12:00–13:00', disabled: true },
  { id: '13', label: '13:00–14:00' },
  { id: '14', label: '14:00–15:00' },
  { id: '15', label: '15:00–16:00', disabled: true },
  { id: '16', label: '16:00–17:00' },
]

const METRICS = [
  { key: 'noise', value: '32分贝', caption: '极静环境', icon: SoundIcon, label: '噪音' },
  { key: 'temp', value: '24.0°C', caption: '恒温空间', icon: ThermoIcon, label: '温度' },
  { key: 'light', value: '4000K', caption: '自然光感', icon: SunIcon, label: '光线' },
]

/** 静域深度学习空间 · 移动端预约页。外层系统框自带状态栏时关掉这一层，避免两个时钟叠在一起 */
export default function StudyRoomPage({ showStatusBar = true }) {
  const [dateIndex, setDateIndex] = useState(0)
  const [slotId, setSlotId] = useState('09')
  const [booked, setBooked] = useState(false)

  return (
    // 整页文字不可划选，避免点选时拖出系统选区
    <div data-inspect-skip className="select-none flex min-h-full flex-col bg-white text-[#1c1c1e]">
      <div className="relative">
        <img
          src={heroUrl}
          alt="空间封面"
          draggable={false}
          className="block h-auto w-full"
        />

        {showStatusBar && (
          <header
            aria-label="状态栏"
            className="absolute inset-x-0 top-0 z-10 flex h-11 items-center justify-between px-5 text-[15px] font-semibold text-white"
          >
            <span>09:20</span>
            <span className="flex items-center gap-1.5">
              <SignalIcon />
              <WifiIcon />
              <span className="text-[12px] font-semibold tracking-wide">100</span>
              <BatteryIcon />
            </span>
          </header>
        )}

        <button
          type="button"
          aria-label="返回"
          className={cn(
            'absolute left-[11px] z-10 flex h-9 w-9 items-center justify-center rounded-full border-0 bg-[#81817f] text-white',
            showStatusBar ? 'top-[52px]' : 'top-3',
          )}
        >
          <BackIcon />
        </button>
      </div>

      <div data-inspect-skip className="flex flex-1 flex-col px-4 pb-3 pt-4">
        <h1 className="m-0 text-[22px] font-semibold leading-tight tracking-[-0.02em]">
          静域深度学习空间
        </h1>
        <p className="m-0 mt-1.5 text-[13px] text-[#a8845c]">营业中 · 10:00 – 22:00</p>
        <button
          type="button"
          className="m-0 mt-1 flex w-fit items-center gap-0.5 border-0 bg-transparent p-0 text-left text-[13px] text-[#b0b0b4]"
        >
          徐汇区西安智塔东塔楼29F
          <ChevronIcon />
        </button>

        <div className="mt-5 flex gap-2">
          {METRICS.map((item) => (
            <div
              key={item.key}
              className="flex flex-1 flex-col items-center rounded-2xl bg-[#f6f6f7] px-1 py-3.5 shadow-[0_4px_16px_rgba(28,28,30,0.04)]"
            >
              <item.icon label={item.label} />
              <p className="m-0 mt-1.5 text-[15px] font-semibold leading-none">{item.value}</p>
              <p className="m-0 mt-1 text-[11px] text-[#c5c5c8]">{item.caption}</p>
            </div>
          ))}
        </div>

        <h2 className="m-0 mb-0 mt-8 text-[15px] font-medium">选择时间</h2>

        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {DATES.map((label, index) => {
            const on = index === dateIndex
            return (
              <button
                key={label}
                type="button"
                className={cn(
                  'shrink-0 rounded-full border-0 px-4 py-2 text-[13px]',
                  on ? 'bg-[#ace4fc] font-medium text-[#00364e]' : 'bg-[#f4f4f4] text-[#c2c2c6]',
                )}
                onClick={() => {
                  setDateIndex(index)
                  setBooked(false)
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {SLOTS.map((slot) => {
            const on = slot.id === slotId
            return (
              <button
                key={slot.id}
                type="button"
                disabled={slot.disabled}
                className={cn(
                  'rounded-xl border-0 py-3 text-[13px]',
                  slot.disabled
                    ? 'bg-[#f7f7f8] text-[#dedee2]'
                    : on
                      ? 'bg-[#ace4fc] font-medium text-[#00364e]'
                      : 'bg-[#f5f5f6] text-[#c4c4c8]',
                )}
                onClick={() => {
                  if (slot.disabled) return
                  setSlotId(slot.id)
                  setBooked(false)
                }}
              >
                {slot.label}
              </button>
            )
          })}
        </div>

        <div data-inspect-skip className="mt-auto pt-8">
          <button
            type="button"
            className="h-[52px] w-full rounded-full border-0 bg-[#ace4fc] text-[16px] font-semibold text-[#00364e]"
            onClick={() => setBooked(true)}
          >
            {booked ? `已预约 · ${DATES[dateIndex]}` : '预约自习室'}
          </button>
        </div>

        <div data-inspect-skip className="flex justify-center pb-1 pt-3">
          <div aria-label="底部指示条" className="h-[5px] w-[128px] rounded-full bg-[#1c1c1e]" />
        </div>
      </div>
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3.2 5.2 8 10 12.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M4.2 2.4 7.8 6 4.2 9.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SignalIcon() {
  return (
    <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor" aria-label="信号">
      <rect x="0" y="7" width="2.4" height="4" rx="0.4" />
      <rect x="4" y="4.6" width="2.4" height="6.4" rx="0.4" />
      <rect x="8" y="2.2" width="2.4" height="8.8" rx="0.4" />
      <rect x="12" y="0" width="2.4" height="11" rx="0.4" />
    </svg>
  )
}

function WifiIcon() {
  return (
    <svg width="14" height="11" viewBox="0 0 14 11" fill="none" aria-label="无线网络">
      <path d="M1.2 4.2a8 8 0 0 1 11.6 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M3.3 6.3a5 5 0 0 1 7.4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M5.4 8.3a2.2 2.2 0 0 1 3.2 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="7" cy="10" r="0.9" fill="currentColor" />
    </svg>
  )
}

function BatteryIcon() {
  return (
    <svg width="24" height="11" viewBox="0 0 24 11" fill="none" aria-label="电量">
      <rect x="0.6" y="0.6" width="20" height="9.8" rx="2.2" stroke="currentColor" strokeWidth="1.2" />
      <rect x="2" y="2" width="17.2" height="7" rx="1" fill="currentColor" />
      <path d="M22 3.4v4.2c.9-.5.9-3.7 0-4.2Z" fill="currentColor" />
    </svg>
  )
}

function SoundIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-label="噪音" className="text-[#c6c6ca]">
      <path d="M4 10.2v1.6M7.2 8.2v5.6M11 5.6v10.8M14.8 8.2v5.6M18 10.2v1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function ThermoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-label="温度" className="text-[#c6c6ca]">
      <path d="M11 4.2a2 2 0 0 1 2 2v5.2a3.3 3.3 0 1 1-4 0V6.2a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 10.2v3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-label="光线" className="text-[#c6c6ca]">
      <circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M11 3.8v1.8M11 16.4v1.8M3.8 11h1.8M16.4 11h1.8M6 6l1.2 1.2M14.8 14.8 16 16M16 6l-1.2 1.2M7.2 14.8 6 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
