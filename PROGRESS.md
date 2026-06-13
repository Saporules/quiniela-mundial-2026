# Quiniela Mundial 2026 — Estado del Proyecto

## Stack
- **Framework**: Astro 5 SSR, adaptador `@astrojs/node` (standalone)
- **Base de datos**: SQLite vía `@libsql/client` (puro JS, sin binarios nativos)
- **CSS**: Tailwind CSS 3 + CSS custom properties
- **Íconos**: Phosphor Icons CDN (`@phosphor-icons/web@2.1.1`)
- **Auth**: bcryptjs + cookies HttpOnly
- **Build**: `astro build` → `node dist/server/entry.mjs`

## Repositorio
- GitHub: https://github.com/Saporules/quiniela-mundial-2026
- Rama principal: `main`
- Rama de desarrollo: `develop`
- Flujo: feature en `develop` → PR → merge a `main` → Railway autodespliega

## Despliegue (Railway)
- **URL**: quiniela-mundial-2026-production-dccb.up.railway.app
- **Build**: nixpacks detecta Node.js automáticamente
- **Start**: `node dist/server/entry.mjs`
- **Variables de entorno requeridas**:
  - `HOST=0.0.0.0`
  - `SESSION_SECRET=quiniela-mundial-2026-secret-cambia-esto`
  - `TURSO_URL=` (pendiente — ver sección Turso)
  - `TURSO_TOKEN=` (pendiente — ver sección Turso)

## Base de datos — Turso (pendiente configurar)
Actualmente `@libsql/client` usa archivo local `quiniela.db` que se pierde en cada redeploy.
La solución es conectar a **Turso** (SQLite cloud, free tier):
1. Registrarse en turso.tech
2. Crear una DB: `turso db create quiniela-mundial-2026`
3. Obtener URL: `turso db show quiniela-mundial-2026 --url`
4. Crear token: `turso db tokens create quiniela-mundial-2026`
5. Agregar en Railway: `TURSO_URL` y `TURSO_TOKEN`
6. Actualizar `src/lib/db.ts` para leer esas variables

Cambio pendiente en db.ts (3 líneas):
```ts
const client = createClient({
  url: process.env['TURSO_URL'] ?? `file:${process.env['DB_PATH'] ?? 'quiniela.db'}`,
  authToken: process.env['TURSO_TOKEN'],
})
```

## Credenciales admin locales
- Usuario: `admin` / Contraseña: `mundial2026`

## Participantes de la quiniela
| Nombre | Email |
|---|---|
| Rudy | elrudyman96@gmail.com |
| Charmin | jorge.ptrt@gmail.com |
| Dannister | dnevarezgarcia@gmail.com |
| Tito | ernestoshdz@gmail.com |
| Asaf | asaf.eduardo@gmail.com |

## Seed script
`seed.mjs` en la raíz del proyecto recrea toda la quiniela desde cero:
- Admin account
- Quiniela "Quiniela 2026" (slug: `quiniela2026`, modo: `full_random`)
- 5 participantes con tokens de acceso
- 48 asignaciones de equipos (extraídas de fotos del sistema anterior)

Ejecutar: `node seed.mjs` (local) o desde Railway shell con `DB_PATH=/data/quiniela.db node seed.mjs`

## Asignaciones de equipos (por grupo)
```
A: MEX→Rudy,  RSA→Tito,      KOR→Tito,      CZE→Tito
B: CAN→Rudy,  BIH→Rudy,      QAT→Charmin,   SUI→Dannister
C: BRA→Asaf,  MAR→Asaf,      HAI→Tito,      SCO→Dannister
D: USA→Dann,  PAR→Dann,      AUS→Charmin,   TUR→Rudy
E: GER→Dann,  CUR→Dann,      CIV→Tito,      ECU→Asaf
F: NED→Tito,  JPN→Tito,      SWE→Charmin,   TUN→Asaf
G: BEL→Asaf,  EGY→Dann,      IRN→Tito,      NZL→Rudy
H: ESP→Tito,  CPV→Charmin,   KSA→Charmin,   URU→Asaf
I: FRA→Charm, SEN→Rudy,      IRQ→Dann,      NOR→Charmin
J: ARG→Dann,  ALG→Charmin,   AUT→Dann,      JOR→Tito
K: POR→Charm, COD→Asaf,      UZB→Asaf,      COL→Rudy
L: ENG→Rudy,  CRO→Asaf,      GHA→Rudy,      PAN→Rudy
```

## Estructura de archivos clave
```
src/
  lib/
    teams.ts        — 48 equipos oficiales WC2026, grupos A-L
    db.ts           — Cliente @libsql/client, schema auto-init, todas las queries
    auth.ts         — Sesiones, cookies, bcrypt
    assignment.ts   — Lógica de asignación de equipos
    espn.ts         — Fetch de partidos y standings desde ESPN API
  pages/
    index.astro                     — Homepage: hero + bracket
    quiniela/[slug].astro           — Vista del participante
    admin/
      setup.astro, index.astro, dashboard.astro
      quiniela/[id].astro
    api/
      auth/login.ts, logout.ts
      admin/setup.ts
      admin/quiniela/ (create, delete, reset, copy, assign, participant, resolve-claims)
  components/
    Bracket.astro, GroupStage.astro, MatchCard.astro, TeamCard.astro, TeamsTab.astro
public/
  copa-del-mundo.png, fondo-mundial-2026.webp, favicon.svg
seed.mjs            — Script de seed para restaurar datos
railway.json        — Config de build/deploy para Railway
```

## Features implementados
- [x] Hero con imagen de fondo
- [x] Bracket visual tipo eliminatoria (drag-to-scroll, vista lista/llaves)
- [x] Fase de grupos con standings en vivo desde ESPN API (caché 30 min)
- [x] Vista de participante con equipos asignados
- [x] Sistema de reclamos con precio dinámico y tooltip
- [x] Botón compartir (WhatsApp en móvil, copiar link en desktop)
- [x] Admin: crear/editar/eliminar quinielas, gestionar participantes
- [x] Asignación aleatoria de equipos

## Historial de errores resueltos
| Error | Causa | Fix |
|---|---|---|
| `GLIBC_2.29` en cPanel | better-sqlite3 binario nativo | Migrar a mysql2, luego a @libsql/client |
| `piccolore not found` | Dep transitiva de @astrojs/node | Agregar explícitamente a package.json |
| `clsx not found` | Dep transitiva de astro | Agregar todas las deps runtime |
| `better-sqlite3` falla en Railway Node 24 | Sin prebuilts ni Python | Migrar a @libsql/client |
| `HOST=localhost` en Railway | Astro no bindea a 0.0.0.0 | Setear `HOST=0.0.0.0` en Railway vars |
| DB se borra en redeploy | Filesystem efímero en Railway | Pendiente: migrar a Turso |
| nixpacks ignora .node-version | Cache de build | Usar NIXPACKS_NODE_VERSION en toml |
