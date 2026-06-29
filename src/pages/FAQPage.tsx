import { useNavigate } from 'react-router-dom'

interface Section {
  icon: string
  title: string
  items: { q: string; a: string | string[] }[]
}

const sections: Section[] = [
  {
    icon: '🎮',
    title: '¿Qué es ¡BASTA!?',
    items: [
      {
        q: '¿De qué trata el juego?',
        a: '¡BASTA! es un juego de palabras por turnos. En cada ronda se elige una letra y una categoría (por ejemplo "Animales"). Cada jugador tiene que escribir una palabra que empiece con esa letra dentro de esa categoría antes de que se acabe el tiempo.',
      },
      {
        q: '¿Cuántos jugadores pueden jugar?',
        a: 'Desde 2 jugadores hasta el máximo configurado por el administrador al crear la partida.',
      },
    ],
  },
  {
    icon: '👤',
    title: 'Tipos de cuenta',
    items: [
      {
        q: '¿Cuál es la diferencia entre administrador, registrado e invitado?',
        a: [
          '🔑 Administrador: cualquier usuario registrado con correo o Google. Puede crear partidas, seleccionar categorías, validar respuestas y ver el panel de administración.',
          '🎮 Jugador registrado: se une a partidas creadas por otros admins y lleva historial de puntajes.',
          '👤 Invitado: puede unirse a partidas usando solo un nombre. No guarda historial ni puede crear partidas.',
        ],
      },
      {
        q: '¿Puedo convertir mi cuenta de invitado a registrada?',
        a: 'Sí. Ve a tu perfil y usa la opción "Vincular cuenta" para agregar correo y contraseña. Tu sesión activa se conserva.',
      },
    ],
  },
  {
    icon: '🚀',
    title: 'Crear y unirse a una partida',
    items: [
      {
        q: '¿Cómo creo una partida?',
        a: [
          '1. Inicia sesión con tu cuenta (correo o Google).',
          '2. En el inicio verás el botón "Crear partida".',
          '3. Configura el máximo de jugadores.',
          '4. Comparte el código de 4 letras que aparece en pantalla.',
        ],
      },
      {
        q: '¿Cómo se unen los demás jugadores?',
        a: 'En la pantalla de inicio ingresan el código de 4 letras y su nombre (si son invitados) o simplemente el código (si tienen cuenta). ¡Listo!',
      },
      {
        q: '¿Cuándo inicia la partida?',
        a: 'El administrador elige la primera categoría y presiona "▶ Iniciar partida". Puede esperar a que lleguen todos los jugadores antes de comenzar.',
      },
    ],
  },
  {
    icon: '🔤',
    title: 'Flujo de juego',
    items: [
      {
        q: '¿Cómo funciona un turno?',
        a: [
          '1. 📂 Se anuncia la categoría (ej. "Países").',
          '2. 🔤 El jugador activo elige una letra de las disponibles (tiene ~5 segundos, si no elige se asigna una aleatoria).',
          '3. ✍️ El mismo jugador escribe una palabra con esa letra en la categoría (tiene ~10 segundos).',
          '4. ✅ El administrador valida la respuesta: 10 pts (única), 5 pts (repetida) o 0 pts (incorrecta).',
          '5. Sigue el turno del siguiente jugador con una letra diferente.',
        ],
      },
      {
        q: '¿Cuándo termina una categoría?',
        a: 'Cuando se han usado todas las letras disponibles. El administrador también puede terminarla antes si lo desea.',
      },
      {
        q: '¿Cuándo termina la partida?',
        a: 'El administrador decide cuándo terminar la partida. Puede hacerlo al final de cualquier categoría. Se muestran los puntajes finales, estadísticas de velocidad y un resumen de la partida.',
      },
    ],
  },
  {
    icon: '🏆',
    title: 'Puntajes',
    items: [
      {
        q: '¿Cómo se asignan los puntos?',
        a: [
          '10 pts → respuesta correcta y única (nadie más dijo lo mismo).',
          '5 pts → respuesta correcta pero repetida (otro jugador dijo lo mismo).',
          '0 pts → respuesta incorrecta o sin respuesta.',
        ],
      },
      {
        q: '¿Quién valida las respuestas?',
        a: 'El administrador valida cada respuesta después de cada turno. Puede asignar 10, 5 o 0 puntos manualmente. También puede corregir puntajes anteriores de la categoría antes de pasar a la siguiente.',
      },
      {
        q: '¿Hay puntos extra?',
        a: 'Sí. Al terminar una categoría el administrador puede otorgar puntos extra (bonus) al jugador con mayor puntaje en esa categoría.',
      },
    ],
  },
  {
    icon: '📂',
    title: 'Categorías',
    items: [
      {
        q: '¿Cómo se elige la categoría?',
        a: 'El administrador la elige manualmente en el selector, o presiona 🎲 para que el sistema elija una al azar de las categorías habilitadas. Al hacer clic en 🎲 aparece un selector donde puedes marcar exactamente cuáles categorías entran al sorteo.',
      },
      {
        q: '¿Puedo agregar mis propias categorías?',
        a: 'Sí. El administrador puede crear categorías personalizadas desde el Panel de Administración (⚙️ Admin en la barra superior) o directamente al iniciar/continuar una partida.',
      },
      {
        q: '¿Qué significa que una categoría esté "excluida del sorteo"?',
        a: 'Esa categoría no aparecerá cuando presiones 🎲 para elegir al azar. Sigue disponible para elegirla manualmente.',
      },
    ],
  },
  {
    icon: '⚙️',
    title: 'Panel de administración',
    items: [
      {
        q: '¿Dónde está el panel de admin?',
        a: 'Si tu cuenta es de administrador, verás el botón "⚙️ Admin" en la barra de navegación superior. También hay un botón "← Volver al inicio" dentro del panel para regresar al home.',
      },
      {
        q: '¿Qué puedo hacer desde el panel?',
        a: [
          '📂 Gestionar categorías: agregar, editar, eliminar, reordenar (arrastrando), incluir/excluir del sorteo, selección múltiple.',
          '🎮 Ver y eliminar partidas activas.',
          '📋 Ver el historial de partidas terminadas, editar puntajes y eliminar registros.',
        ],
      },
    ],
  },
  {
    icon: '❓',
    title: 'Preguntas frecuentes',
    items: [
      {
        q: '¿Puedo jugar desde el celular?',
        a: 'Sí, ¡BASTA! está diseñado para funcionar en móvil y escritorio.',
      },
      {
        q: '¿Qué pasa si se me acaba el tiempo?',
        a: 'Si no eliges una letra a tiempo, el sistema asigna una al azar. Si no escribes una respuesta a tiempo, tu turno cuenta como sin respuesta (0 pts).',
      },
      {
        q: '¿Puedo ver mi puntaje durante la partida?',
        a: 'Sí. En la barra superior aparece el botón ⭐ con tu puntaje actual. También puedes ver la tabla completa de posiciones tocando ese botón.',
      },
      {
        q: '¿Olvidé mi contraseña, qué hago?',
        a: 'En la pantalla de inicio de sesión toca "¿Olvidaste tu contraseña?" e ingresa tu correo. Recibirás un enlace para restablecerla.',
      },
    ],
  },
]

export default function FAQPage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto p-4 pb-12 space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #FF5714, #111)' }}>
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-bold opacity-80 hover:opacity-100 transition-opacity mb-3 block"
        >
          ← Volver
        </button>
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="BASTA" className="w-12 h-12" />
          <div>
            <h1 className="text-2xl font-display font-semibold">¿Cómo se juega?</h1>
            <p className="text-sm opacity-75 mt-0.5">Guía completa de ¡BASTA!</p>
          </div>
        </div>
      </div>

      {/* Quick start */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
        <h2 className="font-display font-semibold text-lg" style={{ color: '#FF5714' }}>⚡ Inicio rápido</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '1️⃣', label: 'Admin crea la partida', sub: 'Obtiene un código de 4 letras' },
            { icon: '2️⃣', label: 'Jugadores se unen', sub: 'Ingresan el código' },
            { icon: '3️⃣', label: 'Admin elige categoría', sub: 'Manual o al azar 🎲' },
            { icon: '4️⃣', label: '¡A jugar!', sub: 'Letra → Respuesta → Puntos' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 space-y-0.5" style={{ background: 'var(--c-surface2)' }}>
              <p className="text-xl">{s.icon}</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>{s.label}</p>
              <p className="text-xs" style={{ color: 'var(--c-text3)' }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      {sections.map(section => (
        <div key={section.title} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
          {/* Section header */}
          <div className="px-5 py-3" style={{ background: 'var(--c-surface2)' }}>
            <h2 className="font-display font-semibold" style={{ color: 'var(--c-text)' }}>
              {section.icon} {section.title}
            </h2>
          </div>

          {/* Items */}
          <div style={{ background: 'var(--c-surface)' }}>
            {section.items.map((item, i) => (
              <div
                key={i}
                className="px-5 py-4 space-y-2"
                style={i > 0 ? { borderTop: '1px solid var(--c-border)' } : {}}
              >
                <p className="text-sm font-semibold" style={{ color: '#FF5714' }}>{item.q}</p>
                {Array.isArray(item.a) ? (
                  <ul className="space-y-1">
                    {item.a.map((line, j) => (
                      <li key={j} className="text-sm" style={{ color: 'var(--c-text2)' }}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--c-text2)' }}>{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Footer */}
      <div className="text-center space-y-3 pt-2">
        <p className="text-sm" style={{ color: 'var(--c-text3)' }}>
          ¿Listo para jugar?
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 rounded-xl font-display font-semibold text-white transition-all hover:scale-105 active:scale-95"
          style={{ background: '#FF5714' }}
        >
          ¡Jugar ahora!
        </button>
      </div>
    </div>
  )
}
