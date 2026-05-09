import { useEffect, useState } from 'react'
import { ANSWER_SECONDS } from '../../constants'

interface Props {
  startAt: number | null
  onExpire: () => void
}

export default function Timer({ startAt, onExpire }: Props) {
  const [remaining, setRemaining] = useState(ANSWER_SECONDS)

  useEffect(() => {
    if (!startAt) return
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startAt) / 1000)
      const left = Math.max(0, ANSWER_SECONDS - elapsed)
      setRemaining(left)
      if (left === 0) {
        clearInterval(interval)
        onExpire()
      }
    }, 250)
    return () => clearInterval(interval)
  }, [startAt, onExpire])

  const pct = (remaining / ANSWER_SECONDS) * 100
  const color = remaining <= 3 ? 'bg-red-500' : remaining <= 6 ? 'bg-yellow-400' : 'bg-green-400'

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`text-5xl font-black tabular-nums ${remaining <= 3 ? 'text-red-500 animate-pulse-fast' : 'text-brand-700'}`}
      >
        {remaining}
      </div>
      <div className="w-48 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
