# ¡BASTA! 🎲

Juego de palabras por turnos en tiempo real, inspirado en el clásico juego de letras.

## ¿Cómo se juega?

En cada ronda se anuncia una **categoría** (ej. Animales, Países, Frutas). Cada jugador, en su turno, elige una **letra** disponible y debe responder con una palabra que empiece con esa letra dentro de la categoría.

- **10 pts** → respuesta correcta y única
- **5 pts** → respuesta correcta pero repetida por otro jugador
- **0 pts** → respuesta incorrecta o sin respuesta

## Roles

| Rol | Descripción |
|-----|-------------|
| **Administrador** | Cualquier usuario registrado (correo o Google). Crea partidas, valida respuestas y gestiona categorías. |
| **Jugador** | Se une con un código de 4 letras. Puede ser invitado (anónimo) o registrado. |

## Stack técnico

- **Frontend**: React 18 + TypeScript + Vite
- **Estilos**: Tailwind CSS + CSS custom properties
- **Backend**: Firebase (Firestore + Auth)
- **Deploy**: Vercel

## Desarrollo local

```bash
npm install
npm run dev
```

Requiere un archivo `.env.local` con las credenciales de Firebase (ver `.env.example`).

## Estructura principal

```
src/
├── pages/          # GamePage, AdminPage, FAQPage, ProfilePage…
├── components/     # Navbar, CategoryManager, GameHistoryManager…
├── services/       # gameService, categoryService, authService…
├── store/          # Zustand stores (auth, game, theme)
└── types/          # Interfaces TypeScript
```
