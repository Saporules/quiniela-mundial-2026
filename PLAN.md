# PLAN — Correcciones de auditoría: qualification tooltip
**Rama de origen:** develop
**Rama de desarrollo:** feature/group-qualification-tooltip
**Fecha:** 2026-06-17
**Estado:** APROBADO ✓ (auditoría 2026-06-18)

---

## Contexto

La implementación original del tooltip de clasificación fue rechazada en auditoría con dos fallas críticas y cuatro observaciones importantes/menores. Este plan corrige todos los puntos identificados sin alterar la funcionalidad visible ya aprobada.

---

## Problemas a resolver (en orden de prioridad)

### [CRÍTICO 1] Artefactos binarios SQLite en el repositorio
`quiniela.db-shm` (32 KB) y `quiniela.db-wal` (1.9 MB) fueron commiteados en `9ff1128`. El `.gitignore` cubre `*.db` pero no los sufijos WAL/SHM. Deben ser desrastreados y los patrones añadidos al `.gitignore`.

### [CRÍTICO 2] `isThirdEliminated` — skip de grupo propio incorrecto + lectura del 3ro sin sortear
Línea 186: `gName === group[0].teamCode?.slice(0,1)` compara la clave del grupo contra la primera letra del código del primer equipo del grupo evaluado. Falla en cualquier grupo donde el nombre no coincida con la inicial del equipo top. Solución: pasar `groupKey` explícitamente y comparar `gName === groupKey`.
Línea 188: `gStandings[2]` usa el orden crudo de ESPN; `rankThirds` usa `sortByFifa(gStandings)[2]`. Inconsistencia que puede comparar terceros distintos. Solución: usar siempre `sortByFifa(gStandings)[2]`.

### [IMPORTANTE 1] `computeTop2` — falsos positivos en `qualified`/`eliminated_top2` por margen de goles
`applyOutcome` usa siempre GD=±1. Un equipo puede marcarse verde (`qualified`) pero una derrota abultada (GD=-9) lo dejaría fuera del top-2; igualmente puede marcarse rojo (`eliminated_top2`) cuando una victoria dominante (GD=+9) lo salvaría. Solución: agregar dos verificaciones de frontera tras los escenarios estándar.

### [IMPORTANTE 2] `computeTop2` — cuenta de escenarios incorrecta (rendimiento)
Línea 95: `generateScenarios(standings.length * 2)` genera `3^8 = 6,561` escenarios para un grupo de 4 equipos, cuando con 2 fixtures restantes solo se necesitan `3^2 = 9`. Los resultados son correctos (los escenarios extra son duplicados ignorados) pero la carga computacional es innecesaria. Solución: `generateScenarios(fixtures.length)`.

### [MENOR 1] Código muerto: `simulateGroup`
Definida en `qualification.ts:35` y nunca usada (la simulación real la hace `simulateAll`). Eliminar.

### [MENOR 2] Import sin uso: `bestThirdCodes` en `[slug].astro`
Importada pero nunca llamada en el código de aplicación (solo en tests). Eliminar.

### [MENOR 3] `rankThirds` — búsqueda O(n²) innecesaria
El segundo `.map(team => ({ group: find(...) }))` vuelve a recorrer todo el mapa para recuperar la clave de grupo que ya se conocía en el primer loop. Refactorizar para pre-computar `{ group, team }` antes de sortear.

---

## Alcance

**Incluido:**
- Corrección de todos los puntos de auditoría anteriores
- Sin cambios en UI ni comportamiento visible para el usuario
- Nuevos tests de frontera para `computeTop2` e `isThirdEliminated`

**Fuera de alcance:**
- Criterio FIFA 4 (fair play) — ya en la lista de exclusiones del plan original
- Cambios en otras partes de la aplicación no relacionadas con `qualification.ts`

---

## Pasos atómicos

- [x] 1. `.gitignore` + git — Añadir patrones `*.db-shm`, `*.db-wal`, `*.db-journal`; ejecutar `git rm --cached quiniela.db-shm quiniela.db-wal`; commit del cleanup

- [x] 2. `src/lib/qualification.ts` — Refactor limpieza menor:
  - Eliminar función `simulateGroup` (dead code)
  - Refactorizar `rankThirds`: pre-computar `{ group, team }[]` en el primer loop, sortear el array completo, eliminar el `.find()` O(n²) del segundo `.map()`
  - Corregir `generateScenarios(fixtures.length)` en lugar de `standings.length * 2`

- [x] 3. `src/lib/qualification.ts` — Corregir `isThirdEliminated`:
  - Añadir `groupKey: string` como segundo parámetro (antes de `group`)
  - Reemplazar `if (gName === group[0].teamCode?.slice(0, 1)) continue` por `if (gName === groupKey) continue`
  - Reemplazar `const thirdStanding = gStandings[2]` por `const thirdStanding = sortByFifa(gStandings)[2]`

- [x] 4. `src/lib/qualification.ts` — Corregir `resolveStatus`:
  - Añadir `groupKey: string` como segundo parámetro (antes de `group`)
  - Pasar `groupKey` a la llamada de `isThirdEliminated`

- [x] 5. `src/lib/qualification.ts` — Corregir `computeTop2` con verificaciones de frontera:
  - Extraer `applyOutcome` a una versión que acepta `goalDiff: number` explícito (en lugar de hardcode 1)
  - Añadir `simulateExtreme(teamCode, standings, fixtures, teamGD, otherGD)`: aplica `teamGD` a los fixtures del equipo y `|otherGD|` (home wins si positivo, away wins si negativo) a los demás
  - Lógica de frontera para `qualified`: si todos los escenarios estándar califican → verificar con pesimista (teamGD=-9, otherGD=+9); si el pesimista NO clasifica → downgrade a `contending`
  - Lógica de frontera para `eliminated_top2`: si ningún escenario estándar califica → verificar con optimista (teamGD=+9, otherGD=-9); si el optimista SÍ clasifica → downgrade a `contending`
  - Constantes: `BOUNDARY_GD = 9`

- [x] 6. `src/pages/quiniela/[slug].astro` — Actualizar callers:
  - Eliminar `bestThirdCodes` del import
  - Pasar `groupName` a `resolveStatus(standing.teamCode, groupName, groupStandingsList, groupStandings, fixtures)`

- [x] 7. `src/lib/__tests__/qualification.test.ts` — Actualizar firmas + añadir casos de frontera:
  - Actualizar todas las llamadas a `isThirdEliminated` con `groupKey` como segundo argumento
  - Actualizar todas las llamadas a `resolveStatus` con `groupKey` como segundo argumento
  - Añadir test `isThirdEliminated / should correctly skip own group using group key, not team code initial` — usa claves de grupo realistas ('A'..'L') donde la inicial no coincide con el código del primer equipo
  - Añadir test `computeTop2 / should downgrade qualified to contending when large loss would drop below top-2`
  - Añadir test `computeTop2 / should downgrade eliminated_top2 to contending when large win would reach top-2`

---

## Casos borde cubiertos

- Grupo cuya clave ('B') coincide con la inicial del código del primer equipo ('BRA') — skip sigue correcto porque ahora usa clave exacta
- Grupo cuya clave ('D') NO coincide con la inicial del primer equipo ('DEN' → 'D' sí coincide, 'FRA' → 'F' no) — ahora siempre correcto
- Grupo terminado con equipo en posición 3 y GD/GF distintos entre ESPN y sortByFifa — ahora usa sortByFifa consistente
- Equipo con 1 fixture restante: GD=1 dice qualified, GD=9 loss lo deja 3ro → devuelve contending
- Equipo con 1 fixture restante: GD=1 dice eliminated, GD=9 win lo sube a 2do → devuelve contending
- Fixtures vacíos: `computeTop2` usa posición actual; sin fixtures, no hay boundary check
- Fixture del equipo es away (no home): `simulateExtreme` aplica `teamGD` correctamente según posición

---

## Dependencias

- `src/lib/qualification.ts` — archivo principal afectado
- `src/lib/__tests__/qualification.test.ts` — firmas de test a actualizar
- `src/pages/quiniela/[slug].astro` — caller a actualizar
- `.gitignore` — patrones a añadir

---

## Tests generados

- [x] `src/lib/__tests__/qualification.test.ts` — Suite actualizada (41 tests total)
  - [x] `computeTop2 / should downgrade qualified to contending when a large loss would drop team below top-2` *(nuevo — boundary GD)*
  - [x] `computeTop2 / should downgrade eliminated_top2 to contending when a large win would reach top-2` *(nuevo — boundary GD)*
  - [x] `isThirdEliminated / should skip own group using groupKey and identify third via sortByFifa, not raw index` *(nuevo — corrección crítica)*
  - [x] Todos los `isThirdEliminated` existentes actualizados con firma `(teamCode, groupKey, group, allGroups)`
  - [x] Todos los `resolveStatus` existentes actualizados con firma `(teamCode, groupKey, group, allGroups, fixtures)`

Estado inicial: **13 failing / 28 passing** (red correcto — implementación pendiente)

---

## Criterios de aceptación

1. `quiniela.db-shm` y `quiniela.db-wal` ya no están trackeados por git (`git ls-files | grep db` no los muestra)
2. `.gitignore` incluye `*.db-shm`, `*.db-wal`, `*.db-journal`
3. `isThirdEliminated('CZE', 'A', evalGroup, allGroups)` con grupo 'A' y primer equipo 'BRA' (inicial 'B' ≠ 'A') salta correctamente el grupo propio
4. La lectura del 3ro en `isThirdEliminated` usa `sortByFifa(gStandings)[2]` en todos los casos
5. `computeTop2` con un equipo que en GD=1 está siempre top-2 pero en GD=-9 cae a 3ro → devuelve `contending`, no `qualified`
6. `computeTop2` con un equipo que en GD=1 nunca llega a top-2 pero en GD=+9 sí → devuelve `contending`, no `eliminated_top2`
7. `computeTop2` genera exactamente `3^fixtures.length` escenarios (no `3^(standings.length * 2)`)
8. `simulateGroup` eliminada del módulo (no aparece en el diff final)
9. `bestThirdCodes` no aparece en los imports de `[slug].astro`
10. Todos los tests pasan (≥41/41 — 38 existentes + 3 nuevos de frontera)
11. Build limpio sin errores TypeScript
