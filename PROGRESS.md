# Quiniela Mundial 2026 — Estado del Proyecto

## Stack
- **Framework**: Astro 5.18.2, SSR, adaptador `@astrojs/node` (standalone)
- **Base de datos**: MySQL vía `mysql2/promise` (puro JS, sin binarios nativos)
- **CSS**: Tailwind CSS 3 + CSS custom properties para overrides
- **Íconos**: Phosphor Icons CDN (`@phosphor-icons/web@2.1.1`)
- **Auth**: bcryptjs + cookies HttpOnly
- **Build**: `astro build` → `dist/server/entry.mjs`

## Despliegue (cPanel)
- **Servidor**: cPanel Node.js App
- **Ruta del app**: `/public_html/asaflopez/quiniela/`
- **Startup file**: `dist/server/entry.mjs`
- **Puerto**: 2083 (seteado en cPanel env vars)
- **Base de datos**: MySQL en localhost
  - `DB_HOST=localhost`
  - `DB_USER=qgpwshwt_fulbito`
  - `DB_PASS=Y2{p7&kpsH}{`
  - `DB_NAME=qgpwshwt_quiniela`
  - `SESSION_SECRET=quiniela-mundial-2026-secret-change-this`
  - `HOST=0.0.0.0`
  - `PORT=2083`

### Procedimiento de deploy
1. Hacer `npm run build` en local
2. Crear zip: `dist/`, `public/`, `package.json`, `package-lock.json`, `.env`
3. En cPanel File Manager: borrar `dist/` viejo, subir y extraer nuevo zip
4. **Run NPM Install** (instala `piccolore` y demás deps)
5. **Restart** la app
6. Primera vez: ir a `/admin/setup` para crear cuenta admin

### Credenciales admin locales
- Usuario: `admin` / Contraseña: `mundial2026`

## Zip más reciente
- `~/Desktop/quiniela-mundial-2026.zip` (770K, 2026-06-11) — incluye fix de `piccolore`
- El zip viejo en el proyecto (`quiniela-deploy.zip`, 666K, 2026-05-29) está desactualizado

## Estructura de archivos clave
```
src/
  lib/
    teams.ts        — 48 equipos oficiales WC2026, grupos A-L
    db.ts           — Pool MySQL async, schema auto-init, todas las queries
    auth.ts         — Sesiones, cookies, bcrypt
    assignment.ts   — Lógica de asignación de equipos
    espn.ts         — Fetch de partidos desde ESPN API
  pages/
    index.astro                     — Homepage: hero con fondo + bracket
    quiniela/[slug].astro           — Vista del participante: equipos, reclamos
    admin/
      setup.astro                   — Primera vez: crear cuenta admin
      index.astro                   — Login admin
      dashboard.astro               — Lista de quinielas
      quiniela/[id].astro           — Panel admin de una quiniela
    api/
      auth/login.ts, logout.ts
      admin/setup.ts
      admin/quiniela/
        create.ts, delete.ts, reset.ts, copy.ts
        assign.ts, participant.ts, resolve-claims.ts
  components/
    Bracket.astro     — Visualización de llaves tipo bracket (R32→SF→Final→SF→R32)
    GroupStage.astro  — Vista de fase de grupos
    MatchCard.astro   — Tarjeta de partido
    TeamCard.astro    — Tarjeta de equipo
    TeamsTab.astro    — Tab de equipos con reclamos
public/
  copa-del-mundo.png      — PNG de la copa (centro del bracket)
  fondo-mundial-2026.webp — Foto de fondo del hero
```

## Equipos oficiales WC2026 (grupos)
```
A: MEX, RSA, KOR, CZE      G: BEL, EGY, IRN, NZL
B: CAN, BIH, QAT, SUI      H: ESP, CPV, KSA, URU
C: BRA, MAR, HAI, SCO      I: FRA, SEN, IRQ, NOR
D: USA, PAR, AUS, TUR      J: ARG, ALG, AUT, JOR
E: GER, CUR, CIV, ECU      K: POR, COD, UZB, COL
F: NED, JPN, SWE, TUN      L: ENG, CRO, GHA, PAN
```
Categorías: 8 favoritos / 16 creyentes / 24 maletas

## Modo de funcionamiento
La quiniela tiene dos modos: `reclamo` (participantes eligen equipos con costo dinámico) y `random` (asignación aleatoria). El precio de un equipo reclamado se divide entre todos los que lo reclaman.

## Historial de errores resueltos
| Error | Causa | Fix |
|---|---|---|
| `GLIBC_2.29 not found` | better-sqlite3 binario nativo | Migrar a MySQL (mysql2 es JS puro) |
| `Access denied for user` | Credenciales MySQL incorrectas | Setear correctas en cPanel env vars |
| `Cannot find module 'dist/server/entry.mjs'` | Startup file mal configurado | Cambiar a `dist/server/entry.mjs` |
| `Cannot find package 'piccolore'` | Dep transitiva de @astrojs/node no listada | Agregar `"piccolore": "^0.1.3"` a package.json |
| CSS left overflow con justify-center | Browser solo muestra overflow derecho | `width: max-content; margin: 0 auto` |
| Íconos solapan texto en inputs | padding shorthand override | CSS custom property `--input-pl` |
| Bracket derecho espejado incorrecto | flex-row-reverse invertía columnas Y posición score/nombre | Reordenar columnas en HTML + flip score/nombre en tarjetas derechas |

## Estado actual
El código local está **completo y funcional**. El zip con todos los fixes (`~/Desktop/quiniela-mundial-2026.zip`) está listo para subir al servidor. Está pendiente que el usuario lo desplegue en cPanel.
