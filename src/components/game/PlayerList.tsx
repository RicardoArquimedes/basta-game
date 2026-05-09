import type { Player } from '../../types'

interface Props {
  players: Player[]
  adminId: string
  myUid: string
  letterMap?: Record<string, string>
  answers?: Record<string, boolean>
  onEliminate?: (uid: string) => void
}

export default function PlayerList({ players, adminId, myUid, letterMap = {}, answers = {}, onEliminate }: Props) {
  const sorted = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="space-y-2">
      {sorted.map((p, i) => (
        <div
          key={p.uid}
          className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-all
            ${p.status === 'eliminated' ? 'opacity-40' : 'bg-white shadow-sm'}
            ${p.uid === myUid ? 'ring-2 ring-brand-400' : ''}
          `}
        >
          <span className="text-xs font-bold text-gray-400 w-4">#{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 truncate text-sm">
              {p.displayName}
              {p.uid === myUid && <span className="text-brand-500 ml-1 text-xs">(tú)</span>}
              {p.uid === adminId && <span className="text-yellow-500 ml-1 text-xs">★</span>}
            </p>
            {letterMap[p.uid] && (
              <p className="text-xs text-brand-600 font-bold">Letra: {letterMap[p.uid]}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {answers[p.uid] !== undefined && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${answers[p.uid] ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                {answers[p.uid] ? '✓' : '✗'}
              </span>
            )}
            <span className="text-sm font-bold text-brand-700 tabular-nums">{p.score}pts</span>
            {p.status === 'eliminated' && (
              <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full font-bold">Eliminado</span>
            )}
            {onEliminate && p.uid !== adminId && p.uid !== myUid && p.status === 'active' && (
              <button
                onClick={() => onEliminate(p.uid)}
                className="text-xs text-red-400 hover:text-red-600 font-bold ml-1"
                title="Eliminar jugador"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
