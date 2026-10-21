import { useState } from 'react'
import { cn } from '../lib/cn.js'

const LETTER_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
]

const NUMBER_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['-', '/', ':', ';', '(', ')', '¥', '&', '@', '"'],
  ['#', '.', ',', '?', '!', "'"],
]

const SUGGESTIONS = ['“los”', 'iOS', 'lons']

/**
 * 画在手机框里的 iOS 键盘。按键把字符交给输入框，不唤起系统键盘。
 */
export default function IosKeyboard({ onInsert, onBackspace }) {
  const [letters, setLetters] = useState(true)
  const [shift, setShift] = useState(false)

  const typeLetter = (char) => {
    const next = letters && shift ? char.toUpperCase() : char
    onInsert(next)
    if (shift) setShift(false)
  }

  return (
    <div className="select-none bg-[#d1d4db] pb-1.5 pt-0 text-[#111]">
      <div className="flex h-11 items-stretch bg-[#d1d4db] text-[16px]">
        {SUGGESTIONS.map((word, index) => (
          <button
            key={word}
            type="button"
            className={cn(
              'flex-1 border-0 bg-transparent text-[#1c1c1e]',
              index > 0 && 'border-l border-black/10',
              index === 0 ? 'font-semibold' : 'font-normal',
            )}
            onPointerDown={(e) => {
              e.preventDefault()
              // 联想词去掉引号后插入，并补一个空格
              const plain = word.replace(/[“”"]/g, '')
              onInsert(`${plain} `)
            }}
          >
            {word}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5 px-[3px] pt-1.5">
        {letters ? (
          <>
            <KeyRow>
              {LETTER_ROWS[0].map((char) => (
                <Key key={char} onPress={() => typeLetter(char)}>
                  {char.toUpperCase()}
                </Key>
              ))}
            </KeyRow>
            <KeyRow className="px-3">
              {LETTER_ROWS[1].map((char) => (
                <Key key={char} onPress={() => typeLetter(char)}>
                  {char.toUpperCase()}
                </Key>
              ))}
            </KeyRow>
            <KeyRow>
              <Key dark className="max-w-[44px] flex-none basis-[44px]" onPress={() => setShift((v) => !v)} label="切换大小写">
                <ShiftIcon active={shift} />
              </Key>
              {LETTER_ROWS[2].map((char) => (
                <Key key={char} onPress={() => typeLetter(char)}>
                  {char.toUpperCase()}
                </Key>
              ))}
              <Key dark className="max-w-[44px] flex-none basis-[44px]" onPress={onBackspace} label="删除">
                <BackspaceIcon />
              </Key>
            </KeyRow>
          </>
        ) : (
          <>
            <KeyRow>
              {NUMBER_ROWS[0].map((char) => (
                <Key key={char} onPress={() => onInsert(char)}>
                  {char}
                </Key>
              ))}
            </KeyRow>
            <KeyRow>
              {NUMBER_ROWS[1].map((char) => (
                <Key key={char} onPress={() => onInsert(char)}>
                  {char}
                </Key>
              ))}
            </KeyRow>
            <KeyRow>
              <Key dark className="max-w-[44px] flex-none basis-[44px]" onPress={() => setLetters(true)} label="返回字母">
                <span className="text-[15px]">ABC</span>
              </Key>
              {NUMBER_ROWS[2].map((char) => (
                <Key key={char} onPress={() => onInsert(char)}>
                  {char}
                </Key>
              ))}
              <Key dark className="max-w-[44px] flex-none basis-[44px]" onPress={onBackspace} label="删除">
                <BackspaceIcon />
              </Key>
            </KeyRow>
          </>
        )}

        <KeyRow>
          <Key
            dark
            className="max-w-[92px] flex-none basis-[92px] text-[16px]"
            onPress={() => {
              setLetters((v) => !v)
              setShift(false)
            }}
          >
            {letters ? '123' : 'ABC'}
          </Key>
          <Key className="text-[16px] text-[#6b6b6f]" onPress={() => onInsert(' ')}>
            space
          </Key>
          <Key dark className="max-w-[92px] flex-none basis-[92px] text-[16px]" onPress={() => onInsert('\n')}>
            return
          </Key>
        </KeyRow>
      </div>

      <div className="flex items-center justify-between px-5 pb-1 pt-2.5 text-[#1c1c1e]">
        <EmojiIcon />
        <KeyboardMicIcon />
      </div>
      <div className="flex justify-center pb-1 pt-1">
        <div className="h-[5px] w-[128px] rounded-full bg-black" />
      </div>
    </div>
  )
}

function KeyRow({ children, className }) {
  return <div className={cn('flex gap-[6px]', className)}>{children}</div>
}

function Key({ children, onPress, dark, className, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'flex h-[42px] min-w-0 flex-1 items-center justify-center rounded-[5px] border-0 text-[22px] leading-none text-[#111] shadow-[0_1px_0_rgba(0,0,0,0.35)] active:opacity-60',
        dark ? 'bg-[#adb3bd]' : 'bg-white',
        className,
      )}
      onPointerDown={(e) => {
        // 避免按键抢走焦点，光标留在输入框
        e.preventDefault()
        onPress()
      }}
    >
      {children}
    </button>
  )
}

function ShiftIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 2.2 2.4 9.2h3.3V15h6.6V9.2h3.3L9 2.2Z"
        fill={active ? '#111' : 'none'}
        stroke="#111"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BackspaceIcon() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden="true">
      <path
        d="M7.2 1.4h12.2A1.6 1.6 0 0 1 21 3v10a1.6 1.6 0 0 1-1.6 1.6H7.2L1.4 8l5.8-6.6Z"
        stroke="#111"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="m10 5.2 5.2 5.6M15.2 5.2 10 10.8" stroke="#111" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function EmojiIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <circle cx="13" cy="13" r="9" stroke="#1c1c1e" strokeWidth="1.6" />
      <circle cx="9.5" cy="11" r="1.1" fill="#1c1c1e" />
      <circle cx="16.5" cy="11" r="1.1" fill="#1c1c1e" />
      <path d="M9 15.2c1.1 1.4 2.2 2 4 2s2.9-.6 4-2" stroke="#1c1c1e" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function KeyboardMicIcon() {
  return (
    <svg width="18" height="26" viewBox="0 0 18 26" fill="none" aria-hidden="true">
      <rect x="5" y="1.4" width="8" height="13" rx="4" stroke="#1c1c1e" strokeWidth="1.6" />
      <path d="M3.2 11.5a5.8 5.8 0 0 0 11.6 0M9 17.4V22" stroke="#1c1c1e" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 22.6h6" stroke="#1c1c1e" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
