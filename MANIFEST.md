# MANIFIESTO DEL PRODUCTO — Quiniela Mundial 2026
**Versión:** 1.0 — MVP en producción

---

## 1. VISIÓN

Aplicación web privada para gestionar una quiniela del Mundial de Fútbol 2026 entre un grupo cerrado de amigos. Cada participante recibe equipos asignados al azar y sigue su evolución en tiempo real. El admin controla toda la configuración; los participantes solo acceden a su vista personal vía link con token.

---

## 2. CONTEXTO DEL NEGOCIO

- Grupo de 5 participantes: Rudy, Charmin, Dannister, Tito, Asaf.
- Quiniela activa: `quiniela2026` (slug), modo `full_random` (equipos ya asignados, sin reclamos activos).
- 48 equipos del Mundial 2026 distribuidos entre los 5 participantes (≈9-10 equipos por persona).
- Sistema de precios por categoría de equipo:
  - `base_price`: 300 (equipos base)
  - `favorito_price`: 150 (equipos favoritos)
  - `creyente_price`: 100
  - `malete_price`: 50
- Todos los precios son enteros (pesos mexicanos, sin decimales).

---

## 3. ALCANCE MVP (Incluido / Fuera de alcance)

### Incluido
- [x] Admin: login, crear/editar/eliminar quinielas
- [x] Admin: agregar/eliminar participantes
- [x] Admin: asignación aleatoria de equipos
- [x] Vista de participante vía token (sin registro)
- [x] Fase de grupos con standings en vivo (ESPN API, caché 30 min)
- [x] Bracket visual de eliminatoria
- [x] Sistema de reclamos UI (botón visible, lógica de precio dinámico)
- [x] Botón compartir (WhatsApp móvil / copiar link desktop)
- [x] DB persistente en Turso (no se pierde en redeploys)

### Fuera de alcance MVP
- Pagos reales / integración con pasarela de pago
- Registro de usuarios (solo admin + participantes por token)
- Notificaciones push
- Múltiples admins
- Historial de versiones de asignaciones

---

## 3b. FASES DE DESARROLLO

| Fase | Estado | Descripción |
|---|---|---|
| 0 | ✅ Completo | Setup inicial: Astro 5 SSR, Railway, SQLite/Turso |
| 1 | ✅ Completo | MVP: quiniela funcional con asignaciones y vista de participante |
| 2 | ✅ Completo | Standings en vivo desde ESPN API |
| 3 | 🔄 En curso | Endpoint de reclamos funcional (API + lógica) |
| 4 | ⬜ Pendiente | Página de resultados finales con cálculo de puntos |
| 5 | ⬜ Pendiente | Notificaciones por correo al agregar participante |

---

## 4. ROLES Y PERMISOS

### Admin
- Acceso vía: `/admin` con usuario/contraseña (bcrypt + cookie HttpOnly)
- Puede: crear/editar/eliminar quinielas, agregar/eliminar participantes, asignar equipos, cambiar modo de quiniela, ver todos los datos
- Credenciales: `admin` / `mundial2026`

### Participante
- Acceso vía: `/quiniela/[slug]?token=<token>` — sin registro, sin contraseña
- Puede: ver sus equipos asignados, ver standings en vivo, reclamar/quitar equipos (cuando el modo lo permite), compartir su link
- No puede: ver datos de otros participantes directamente, acceder al admin

---

## 5. FLUJO PRINCIPAL

```
Admin crea quiniela
  → Admin agrega participantes
  → Admin asigna equipos (modo full_random o reclamo)
  → Admin activa la quiniela
  → Admin comparte links de acceso a cada participante
  → Participante entra a su link
  → Ve sus equipos + standings en vivo
  → [futuro] Ve resultados finales y ganador
```

---

## 6. MÓDULOS FUNCIONALES

| Módulo | Archivo(s) clave | Responsabilidad |
|---|---|---|
| DB / Queries | `src/lib/db.ts` | Cliente @libsql/client, schema auto-init, todas las queries |
| Auth | `src/lib/auth.ts` | Sesiones, cookies HttpOnly, bcrypt |
| Equipos | `src/lib/teams.ts` | 48 equipos WC2026, grupos A-L, flags, nombres |
| Asignaciones | `src/lib/assignment.ts` | Lógica de distribución de equipos |
| ESPN API | `src/lib/espn.ts` | Fetch standings/partidos, caché 30 min en DB |
| Vista participante | `src/pages/quiniela/[slug].astro` | Ruta principal del participante |
| Admin | `src/pages/admin/` | Dashboard, gestión de quinielas y participantes |
| API routes | `src/pages/api/` | Endpoints REST para acciones admin y participante |
| Componentes | `src/components/` | Bracket, GroupStage, MatchCard, TeamCard, TeamsTab |

---

## 7. REQUISITOS NO FUNCIONALES

- **Precios**: enteros (pesos MXN sin centavos). No usar aritmética flotante para cálculos de precio.
- **Tokens de participante**: `randomBytes(16).toString('hex')` — 32 chars hex, generados una sola vez al crear participante.
- **Seguridad**: cookies HttpOnly, sin exposición de tokens en logs, queries parametrizadas (no interpolación de strings en SQL).
- **Caché ESPN**: 30 minutos en tabla `match_cache` de la DB. No hacer fetch en cada request.
- **Fallback**: si ESPN API falla, mostrar zeros en standings (no romper la página).
- **Compatibilidad**: Node ≥ 18.20.8, sin módulos nativos que requieran compilación (usar @libsql/client puro JS).

---

## 8. STACK TECNOLÓGICO

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Astro SSR | ^5.8.0 |
| Adapter | @astrojs/node (standalone) | ^9.5.5 |
| CSS | Tailwind CSS | ^3.4.17 |
| Íconos | Phosphor Icons CDN | @2.1.1 |
| DB cliente | @libsql/client | ^0.17.3 |
| DB cloud | Turso (libsql) | free tier |
| Auth | bcryptjs | ^3.0.2 |
| Deploy | Railway | — |
| Build | nixpacks (auto-detect Node) | — |
| Node target | ≥ 18.20.8 | — |

**Variables de entorno requeridas en producción:**
```
HOST=0.0.0.0
SESSION_SECRET=<secreto largo>
TURSO_URL=libsql://quiniela-mundial-2026-saporules.aws-us-east-2.turso.io
TURSO_TOKEN=<token de Turso>
```

---

## 9. DECISIONES TÉCNICAS TOMADAS

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| @libsql/client (puro JS) | better-sqlite3 | Sin binarios nativos; Railway usa Node 24 sin Python |
| Turso como DB persistente | Railway Volume (Hobby $5/mo) | Gratis, funciona con el mismo cliente |
| Token en query string | Sesión con login | Participantes no tienen cuenta; UX de "link directo" |
| ESPN API sin auth | API oficial FIFA | ESPN es pública, no requiere key |
| Astro SSR | SPA React | SEO irrelevante pero SSR simplifica el auth con cookies |

---

## 10. DEFINICIÓN DE ÉXITO

El producto está completo cuando:
1. Los 5 participantes pueden ver sus equipos y el torneo en vivo sin intervención del admin.
2. Los resultados finales se calculan automáticamente al terminar el torneo y se muestra un ganador.
3. El admin puede agregar un nuevo participante y el link le llega por correo automáticamente.
