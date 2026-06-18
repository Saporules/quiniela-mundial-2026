# PLAN — Tooltip de clasificación en fase de grupos
**Rama de origen:** develop
**Rama de desarrollo:** feature/group-qualification-tooltip
**Fecha:** 2026-06-13
**Estado:** COMPLETADO

---

## Contexto

La tabla de grupos muestra standings en vivo pero no le dice al participante qué necesita para clasificar. Cuando un equipo lleva 2 partidos jugados (1 restante), mostrar:
- Tooltip al hacer hover sobre el **nombre del equipo** con los escenarios en los que clasifica directamente (top-2), incluyendo rangos de GD cuando hay empate de puntos
- Colores de fila cuando la clasificación o eliminación es matemáticamente definitiva
- Emoji 🥉 cuando el equipo está, en el snapshot actual, dentro de los 8 mejores terceros (criterio FIFA)

---

## Estados y prioridad de resolución

Cada equipo recibe **un** estado de render. Se resuelven en este orden de prioridad estricto (el primero que aplica gana):

| Prioridad | Estado | UI | Condición |
|---|---|---|---|
| 1 | `qualified` | Fila verde | Matemáticamente top-2: termina 1ro o 2do en **todos** los escenarios restantes del grupo |
| 2 | `contending` | Tooltip (sin color) | Aún puede alcanzar top-2: termina top-2 en **algún** escenario (pero no en todos) |
| 3 | `third` | Emoji 🥉 + nombre | Eliminado de top-2, pero **actualmente** dentro de los 8 mejores terceros (snapshot FIFA) |
| 4 | `eliminated` | Fila roja | Eliminado de top-2 **Y** matemáticamente imposible ser mejor tercero (ver regla segura abajo) |
| 5 | `none` | Fila normal | Cualquier otro caso (incl. eliminado de top-2 pero aún puede trepar a mejores terceros, o torneo no iniciado) |

**Nota de prioridad:** un equipo que sigue vivo para top-2 muestra el tooltip (prioridad 2), nunca el emoji, aunque ahora mismo esté 3ro en la tabla. El tooltip de top-2 es información más útil y directa que el emoji de tercero.

---

## Lógica de "mejor tercero" (criterios FIFA)

Clasifican los **8 mejores** entre los 12 equipos que terminan en 3er lugar de su grupo. Criterios FIFA oficiales, en orden:

1. Más puntos en fase de grupos
2. Mejor diferencia de goles (3 partidos)
3. Más goles a favor
4. Mejor fair play (tarjetas amarillas/rojas) — **NO disponible en ESPN API** → omitido
5. Mejor posición en el Ranking FIFA — **estático, hardcodeado en `teams.ts`**

**Decisión de datos:** implementamos criterios 1-3 (puntos → GD → GF, de ESPN) **+ criterio 5 (ranking FIFA)**. El ranking FIFA es estático durante el Mundial (se congela con el ranking oficial vigente al inicio, abril 2026), así que NO se usa API en vivo: se guarda como campo `fifaRank` en cada equipo de `teams.ts`. La cadena de desempate queda:

```
puntos → diferencia de gol → goles a favor → fifaRank (menor número = mejor)
```

El criterio 4 (fair play) se omite porque ESPN no expone tarjetas; la cadena salta de #3 a #5. El caso donde el fair play separaría a dos equipos empatados en puntos/GD/GF (pero con distinto ranking FIFA) es extremadamente raro y se acepta como límite conocido. Esto reemplaza el placeholder arbitrario de "letra de grupo" por el criterio FIFA real.

### Snapshot de mejores terceros (alimenta el emoji 🥉)

```
function rankThirds(allGroupsStandings):
  thirds = []
  for each group G:
    sorted = sortByFifa(G.standings)        // puntos desc, gd desc, gf desc, fifaRank asc
    if sorted.length >= 3:
      thirds.push({ group: G.name, team: sorted[2] })
  thirds.sort by puntos desc, gd desc, gf desc, fifaRank asc
  return thirds                              // hasta 12 elementos

bestThirdCodes = rankThirds(...).slice(0, 8).map(t => t.team.teamCode)
```
Un equipo recibe `third` (🥉) si su `teamCode ∈ bestThirdCodes` Y quedó eliminado de top-2 (prioridad 3). Es un snapshot que se recalcula en cada render; refleja "ahora mismo estás en zona de clasificación como tercero".

### Regla SEGURA de eliminación de mejor tercero (alimenta el rojo)

Objetivo: **nunca** marcar rojo a un equipo que aún tenga posibilidad matemática. Solo declaramos `eliminated` por terceros cuando es 100% seguro:

```
function isThirdEliminated(team, group, allGroups):
  if team.played < 3:
    return false          // aún tiene partidos: puede sumar puntos y trepar → NUNCA rojo todavía
  // team.played == 3 (puntos congelados):
  posInGroup = índice de team en sortByFifa(group)   // 0..3
  if posInGroup == 3:     // terminó 4to en grupo cerrado → no puede ser tercero
    return true
  if posInGroup <= 1:     // 1ro/2do: no aplica esta rama (lo cubre top-2)
    return false
  // posInGroup == 2: es el 3ro de un grupo ya cerrado
  // Contar SOLO terceros YA CONGELADOS (de grupos completamente terminados) que rankean por encima.
  // Un grupo terminado tiene su 3ro bloqueado y no puede caer; por eso es seguro contarlo.
  lockedThirdsAbove = count over otros grupos Gx donde:
       Gx está completamente terminado (sus 4 equipos played == 3)
       AND el 3ro de Gx rankea por encima de team (puntos→gd→gf→letra)
  return lockedThirdsAbove >= 8
```
Razonamiento: un grupo terminado produce un tercero **bloqueado** que no puede empeorar. Si ya hay ≥8 terceros bloqueados por encima del equipo, este es 9no o peor entre terceros → eliminado con certeza. Grupos sin terminar podrían producir terceros mejores o peores, pero al no contarlos evitamos cualquier falso positivo. Esto es exacto y conservador.

---

## Alcance

**Incluido:**
- Tooltip al hover sobre el nombre del equipo (no la fila completa), solo para `contending` con 1 partido propio restante
- Condiciones de clasificación directa (top-2) en español, con rangos de GD cuando el desempate lo exige
- Emoji 🥉 para los 8 mejores terceros del snapshot FIFA (criterios 1-3 + ranking FIFA estático)
- Fila verde (`qualified`) / fila roja (`eliminated`) según las reglas de arriba
- `getGroupFixtures()` reutiliza los eventos `pre` del scoreboard ya cacheado (sin llamada extra a ESPN)
- Campo `fifaRank` estático en `teams.ts` (ranking oficial abril 2026) como desempate #5

**Fuera de alcance:**
- Criterio FIFA 4 (fair play / tarjetas): no disponible en ESPN API
- Ranking FIFA en vivo vía API: innecesario, el ranking es estático durante el torneo
- Tiebreaker head-to-head dentro del grupo (ESPN no lo provee; usamos GD→GF→fifaRank)
- Texto de condiciones para "cómo ser mejor tercero" (el emoji es solo snapshot, sin tooltip)
- Tooltip para equipos con != 1 partido propio restante

---

## Pasos atómicos

- [x] 1. `src/lib/teams.ts` — Agregar campo `fifaRank: number` a la interfaz de equipo y poblarlo en los 48 equipos con su posición del ranking FIFA oficial de abril 2026 (menor número = mejor). Exportar helper `getFifaRank(code): number` que devuelve el rank o un valor alto (ej. 999) si el código no existe

- [x] 2. `src/lib/espn.ts` — Agregar campo `gf` (goles a favor) a la interfaz `GroupStanding` y a su parser en `getGroupStandings()` (stat `pointsFor`/`goalsFor`/`gf`); agregar `getGroupFixtures(tournament)` que filtra eventos con `status.type.state === 'pre'` del scoreboard (reutiliza caché existente), agrupa por `competitions[0].groups.shortName` y devuelve `Record<string, {home: string, away: string}[]>` (códigos de equipo en mayúsculas)

- [x] 3. `src/lib/qualification.ts` (nuevo) — Helpers base + simulación top-2. Tipos: `RemainingMatch {home, away}`, `MatchOutcome 'win'|'draw'|'loss'`, `RenderStatus 'qualified'|'contending'|'third'|'eliminated'|'none'`, `TeamQualification {status: RenderStatus, conditions: string[]}`, `GroupQualificationMap = Record<teamCode, TeamQualification>`. Funciones: `sortByFifa(standings)` (puntos→gd→gf→fifaRank vía `getFifaRank`); `simulateGroup(standings, fixtures, outcomes)` que aplica resultados y devuelve tabla final ordenada; `computeTop2(teamCode, standings, fixtures)` que enumera las 3^R combinaciones (R = fixtures restantes del grupo) y devuelve `'qualified' | 'contending' | 'eliminated_top2'` según en cuántos escenarios el equipo termina en posición 0 o 1

- [x] 4. `src/lib/qualification.ts` — Lógica de mejor tercero. `rankThirds(allGroupsStandings)` (devuelve los hasta-12 terceros ordenados por puntos→gd→gf→fifaRank); `bestThirdCodes(allGroupsStandings)` (primeros 8 teamCodes); `isThirdEliminated(teamCode, group, allGroupsStandings)` implementando la **regla segura** (played<3 → false; played==3 con regla de `lockedThirdsAbove >= 8`); `resolveStatus(teamCode, group, allGroupsStandings, fixtures)` que combina todo en el `RenderStatus` final respetando la **prioridad** qualified > contending > third > eliminated > none

- [x] 5. `src/lib/qualification.ts` — `formatConditions(teamCode, standings, fixtures)`: solo para equipos `contending` con exactamente 1 partido propio restante. Enumera escenarios donde clasifica y produce frases español: "Gana a [nombre]", "Empata con [nombre]", "Gana a [nombre] con +N de diferencia de gol", "[A] no le gana a [B]", combinaciones unidas con " + ". Usa `getTeam(code)?.name ?? code`. Agrupa por condición propia y deduplica

- [x] 6. `src/pages/quiniela/[slug].astro` — Importar `getGroupFixtures` y `resolveStatus`/`formatConditions`; agregar `getGroupFixtures()` al `Promise.all` existente; construir `qualificationMap: Record<string, GroupQualificationMap>` iterando cada grupo y cada equipo con `resolveStatus(...)` + `formatConditions(...)`; pasar `<GroupStage qualificationMap={qualificationMap} />`

- [x] 7. `src/components/GroupStage.astro` — Aceptar prop `qualificationMap?: Record<string, GroupQualificationMap>`; en cada `<tr>` aplicar `class:list`: `bg-green-900/30 border-l-2 border-l-green-400` si `qualified`, `bg-red-900/20 border-l-2 border-l-red-500` si `eliminated`; en el nombre: prefijo `🥉 ` si `third`; envolver el nombre en `<span class="relative group/tt">` con `<div class="... hidden group-hover/tt:block ...">` listando las `conditions` como `<p>`, solo cuando `status === 'contending' && conditions.length > 0`

---

## Casos borde cubiertos

- ESPN no devuelve fixtures: `getGroupFixtures` devuelve `{}`; sin fixtures no se simula → todos los equipos con partidos pendientes quedan `none`; equipos con played==3 igual reciben color (su tabla es final)
- Empate de puntos entre 3 equipos en un escenario: `sortByFifa` desempata por gd→gf→fifaRank de forma determinista
- Equipo played==3: standings finales; `computeTop2` con 0 fixtures restantes devuelve qualified/eliminated por posición actual
- Equipo played 0 o 1: puede entrar a simulación de color pero el **tooltip** solo se genera con exactamente 1 partido propio restante (played==2)
- Torneo no iniciado (todos en 0): sin fixtures jugados → `none` en todos; sin colores ni emoji
- `getTeam(code)` undefined: fallback a `code` en el texto
- Grupo con <3 equipos en el standings (datos parciales de ESPN): `rankThirds` omite ese grupo del pool de terceros

---

## Dependencias

- `src/lib/espn.ts` — extendido (campo `gf`, función `getGroupFixtures`)
- `src/lib/teams.ts` — extendido (campo `fifaRank`, helper `getFifaRank`) + leído para nombres en español en tooltips
- `src/pages/quiniela/[slug].astro` — modificado para construir y pasar `qualificationMap`
- `src/components/GroupStage.astro` — modificado para UI (colores, emoji, tooltip)

---

## Criterios de aceptación

1. Equipo `contending` con 1 partido propio restante: hover sobre su nombre muestra tooltip con condiciones en español
2. Las condiciones son correctas: "Gana a X" garantiza top-2 verificado por la lógica de puntos en todos los escenarios donde se cumple
3. Cuando el desempate exige GD, el tooltip incluye "+N de diferencia de gol"
4. Fila verde: equipo top-2 en **todos** los escenarios restantes
5. Emoji 🥉: equipo eliminado de top-2 que está entre los 8 mejores terceros del snapshot (puntos→GD→GF→fifaRank)
6. Fila roja: equipo eliminado de top-2 **Y** `isThirdEliminated` true (regla segura: played==3 + ≥8 terceros congelados por encima, o 4to en grupo cerrado)
7. Ningún equipo con partidos pendientes (played<3) se pinta de rojo por la rama de mejor tercero
8. Si ESPN no devuelve fixtures, la página no rompe; los equipos con played==3 conservan su color
9. La prioridad de estados se respeta: un equipo que aún puede llegar a top-2 muestra tooltip, no emoji
10. El desempate de terceros aplica criterios FIFA 1-3 (puntos→GD→GF) + criterio 5 (fifaRank estático); el criterio 4 (fair play) se omite por falta de datos
11. `fifaRank` está poblado para los 48 equipos del torneo con el ranking oficial de abril 2026

---

## Tests generados

- [ ] `src/lib/__tests__/qualification.test.ts` — Suite principal: lógica de clasificación
  - [ ] `sortByFifa / should sort by points descending`
  - [ ] `sortByFifa / should sort by GD when points are equal`
  - [ ] `sortByFifa / should sort by GF when points and GD are equal`
  - [ ] `sortByFifa / should sort by fifaRank ascending when points GD GF are all equal`
  - [ ] `sortByFifa / should return empty array unchanged`
  - [ ] `sortByFifa / should not mutate the original array`
  - [ ] `computeTop2 / should return qualified when team finishes top-2 in ALL scenarios`
  - [ ] `computeTop2 / should return eliminated_top2 when team cannot finish top-2 in ANY scenario`
  - [ ] `computeTop2 / should return contending when team can reach top-2 in some but not all scenarios`
  - [ ] `computeTop2 / should return qualified when played==3 and currently position 0 or 1`
  - [ ] `computeTop2 / should return eliminated_top2 when played==3 and currently position 2 or 3`
  - [ ] `computeTop2 / should handle multiple remaining fixtures without crashing`
  - [ ] `rankThirds / should return exactly one third-place team per group`
  - [ ] `rankThirds / should correctly identify the 3rd-place finisher in each group`
  - [ ] `rankThirds / should rank thirds by points descending`
  - [ ] `rankThirds / should use fifaRank as tiebreaker when points GD GF are equal`
  - [ ] `rankThirds / should skip groups with fewer than 3 teams`
  - [ ] `bestThirdCodes / should return at most 8 team codes`
  - [ ] `bestThirdCodes / should return the best thirds in order`
  - [ ] `isThirdEliminated / should return false when evaluated team has played fewer than 3 games`
  - [ ] `isThirdEliminated / should return true when team finished 4th in a completed group`
  - [ ] `isThirdEliminated / should return true when 8+ locked thirds have better stats`
  - [ ] `isThirdEliminated / should return false when only 7 locked thirds rank above`
  - [ ] `isThirdEliminated / should NOT count groups not fully finished as locked thirds`
  - [ ] `resolveStatus / should return qualified for a team guaranteed top-2`
  - [ ] `resolveStatus / should return eliminated for 4th-place team in completed group`
  - [ ] `resolveStatus / should return contending over third when team can still reach top-2`
  - [ ] `resolveStatus / should return third when eliminated from top-2 but in best-8 thirds`
  - [ ] `resolveStatus / should respect priority: qualified > contending > third > eliminated`
  - [ ] `formatConditions / should return array of strings when contending with 1 game remaining`
  - [ ] `formatConditions / should return empty array for teams with 3 games played`
  - [ ] `formatConditions / should produce strings containing the opponent name`
  - [ ] `formatConditions / should include GD condition text when winning is not enough`
  - [ ] `formatConditions / should produce combined conditions with "+" separator`
  - [ ] `formatConditions / should use team code as fallback when getTeam returns undefined`
  - [ ] `getFifaRank / should return correct rank for known WC2026 teams`
  - [ ] `getFifaRank / should return a high fallback value for unknown team codes`
  - [ ] `getFifaRank / should have fifaRank populated for all 48 WC2026 teams`
