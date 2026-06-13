# Tareas pendientes

## Prioridad crítica

### [ ] Conectar Turso como base de datos persistente
Sin esto la DB se borra en cada redeploy de Railway.

**Pasos:**
1. Crear cuenta en turso.tech (gratis, sin tarjeta)
2. Instalar CLI: `brew install tursodatabase/tap/turso`
3. Login: `turso auth login`
4. Crear DB: `turso db create quiniela-mundial-2026`
5. Obtener URL: `turso db show quiniela-mundial-2026 --url`
6. Crear token: `turso db tokens create quiniela-mundial-2026`
7. En Railway Variables agregar: `TURSO_URL` y `TURSO_TOKEN`
8. Actualizar `src/lib/db.ts` (3 líneas — ver PROGRESS.md)
9. Correr `node seed.mjs` con las vars de Turso para restaurar datos

### [ ] Correr seed.mjs en producción para restaurar la quiniela
El archivo `seed.mjs` en la raíz del proyecto restaura toda la quiniela (admin, participantes, 48 asignaciones). Correr después de configurar Turso.

---

## Prioridad media

### [ ] Endpoint de reclamos para participante
`TeamsTab.astro` muestra el botón de reclamo pero falta la ruta API:
- `POST /api/quiniela/[slug]/claim` — reclama equipo
- `DELETE /api/quiniela/[slug]/claim` — quita reclamo

### [ ] Página de resultados finales
No existe lógica para calcular ganador al terminar el torneo:
- Integración con ESPN API para resultados reales
- Cálculo de puntos por participante
- Página de resultados

### [ ] Notificaciones por correo
- Enviar link de acceso al agregar participante
- Notificar cuando se asignan equipos

---

## Prioridad baja / Mejoras

### [ ] Favicon personalizado
`public/favicon.svg` es genérico.

### [ ] Tests
Vitest para lib/, Playwright para e2e.
