import { ALL_LETTERS } from '../../constants'

interface Props {
  excludedLetters: string[]
  selectedLetter: string | null
  onSelect: (letter: string) => void
  disabled?: boolean
  letterMap?: Record<string, string>
  myUid?: string
}

export default function LetterGrid({
  excludedLetters,
  selectedLetter,
  onSelect,
  disabled,
  letterMap = {},
  myUid = '',
}: Props) {
  const available = ALL_LETTERS.filter(l => !excludedLetters.includes(l))
  const takenByOthers = Object.entries(letterMap)
    .filter(([uid]) => uid !== myUid)
    .map(([, l]) => l)

  return (
    <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
      {available.map(letter => {
        const isMyLetter = selectedLetter === letter
        const isTaken = takenByOthers.includes(letter)
        return (
          <button
            key={letter}
            onClick={() => !disabled && onSelect(letter)}
            disabled={disabled}
            className={`
              aspect-square rounded-xl font-bold text-lg sm:text-xl
              flex items-center justify-center
              transition-all duration-150 select-none
              ${isMyLetter
                ? 'bg-brand-600 text-white shadow-lg scale-110 ring-2 ring-brand-300'
                : isTaken
                  ? 'bg-gray-200 text-gray-400 cursor-default'
                  : disabled
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border-2 border-gray-300 hover:border-brand-400 hover:bg-brand-50 active:scale-95 cursor-pointer'
              }
            `}
          >
            {letter}
          </button>
        )
      })}
    </div>
  )
}
