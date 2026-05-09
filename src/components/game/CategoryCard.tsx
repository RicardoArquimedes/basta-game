interface Props {
  category: string
  roundNumber: number
}

export default function CategoryCard({ category, roundNumber }: Props) {
  return (
    <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-6 text-white text-center shadow-xl animate-bounce-in">
      <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-1">
        Ronda {roundNumber} · Categoría
      </p>
      <h2 className="text-2xl sm:text-3xl font-black leading-tight">{category}</h2>
    </div>
  )
}
