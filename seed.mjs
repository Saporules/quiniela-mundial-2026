import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { join } from 'path'

const DB_URL = process.env.TURSO_URL
  ?? (process.env.DB_PATH ? `file:${process.env.DB_PATH}` : `file:${join(process.cwd(), 'quiniela.db')}`)
const DB_TOKEN = process.env.TURSO_TOKEN

const client = createClient({ url: DB_URL, authToken: DB_TOKEN })

function generateToken() {
  return randomBytes(16).toString('hex')
}

async function run() {
  console.log('🌱 Iniciando seed...\n')

  // ─── Schema ───────────────────────────────────────────────────────────────
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      token      TEXT UNIQUE NOT NULL,
      admin_id   INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS quinielas (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      slug            TEXT UNIQUE NOT NULL,
      name            TEXT NOT NULL,
      tournament      TEXT NOT NULL DEFAULT 'world_cup_2026',
      base_price      INTEGER NOT NULL DEFAULT 300,
      favorito_price  INTEGER NOT NULL DEFAULT 150,
      creyente_price  INTEGER NOT NULL DEFAULT 100,
      malete_price    INTEGER NOT NULL DEFAULT 50,
      status          TEXT NOT NULL DEFAULT 'setup',
      mode            TEXT NOT NULL DEFAULT 'reclamo',
      created_at      TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS participants (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      quiniela_id  INTEGER NOT NULL,
      name         TEXT NOT NULL,
      email        TEXT NOT NULL,
      access_token TEXT UNIQUE NOT NULL,
      created_at   TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (quiniela_id) REFERENCES quinielas(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS team_assignments (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      quiniela_id      INTEGER NOT NULL,
      participant_id   INTEGER NOT NULL,
      team_code        TEXT NOT NULL,
      assignment_type  TEXT NOT NULL DEFAULT 'random',
      share_percentage REAL NOT NULL DEFAULT 100.0,
      extra_paid       INTEGER NOT NULL DEFAULT 0,
      UNIQUE(quiniela_id, participant_id, team_code),
      FOREIGN KEY (quiniela_id)    REFERENCES quinielas(id)    ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS team_claims (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      quiniela_id    INTEGER NOT NULL,
      participant_id INTEGER NOT NULL,
      team_code      TEXT NOT NULL,
      created_at     TEXT DEFAULT (datetime('now')),
      UNIQUE(quiniela_id, participant_id, team_code),
      FOREIGN KEY (quiniela_id)    REFERENCES quinielas(id)    ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS match_cache (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      cache_key  TEXT UNIQUE NOT NULL,
      data_json  TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // ─── Admin ────────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash('mundial2026', 12)
  await client.execute({
    sql: 'INSERT OR IGNORE INTO admin_users (username, password_hash) VALUES (?, ?)',
    args: ['admin', hash],
  })
  console.log('✅ Admin: admin / mundial2026')

  // ─── Quiniela ─────────────────────────────────────────────────────────────
  const SLUG = 'quiniela2026'
  await client.execute({
    sql: `INSERT OR IGNORE INTO quinielas
            (slug, name, tournament, base_price, favorito_price, creyente_price, malete_price, status, mode)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [SLUG, 'Quiniela 2026', 'world_cup_2026', 300, 150, 100, 50, 'active', 'full_random'],
  })
  const qRow = await client.execute({ sql: 'SELECT id FROM quinielas WHERE slug = ?', args: [SLUG] })
  const quinielaId = Number(qRow.rows[0].id)
  console.log(`✅ Quiniela "${SLUG}" (id ${quinielaId})`)

  // ─── Participantes ────────────────────────────────────────────────────────
  const PARTICIPANTS = [
    { name: 'Rudy',      email: 'elrudyman96@gmail.com' },
    { name: 'Charmin',   email: 'jorge.ptrt@gmail.com' },
    { name: 'Dannister', email: 'dnevarezgarcia@gmail.com' },
    { name: 'Tito',      email: 'ernestoshdz@gmail.com' },
    { name: 'Asaf',      email: 'asaf.eduardo@gmail.com' },
  ]

  const pMap = {}   // name → { id, token }
  console.log('\n📋 Links de acceso (comparte estos con cada participante):\n')

  for (const p of PARTICIPANTS) {
    const token = generateToken()
    const res = await client.execute({
      sql: 'INSERT OR IGNORE INTO participants (quiniela_id, name, email, access_token) VALUES (?, ?, ?, ?)',
      args: [quinielaId, p.name, p.email, token],
    })
    let id
    if (Number(res.rowsAffected) === 0) {
      // Ya existía, recuperar id y token existente
      const existing = await client.execute({
        sql: 'SELECT id, access_token FROM participants WHERE quiniela_id = ? AND email = ?',
        args: [quinielaId, p.email],
      })
      id = Number(existing.rows[0].id)
      pMap[p.name] = { id, token: existing.rows[0].access_token }
    } else {
      id = Number(res.lastInsertRowid)
      pMap[p.name] = { id, token }
    }
    console.log(`  ${p.name.padEnd(10)} /quiniela/${SLUG}?token=${pMap[p.name].token}`)
  }

  // ─── Asignaciones ─────────────────────────────────────────────────────────
  const ASSIGNMENTS = [
    // Grupo A
    { team: 'MEX', participant: 'Rudy' },
    { team: 'RSA', participant: 'Tito' },
    { team: 'KOR', participant: 'Tito' },
    { team: 'CZE', participant: 'Tito' },
    // Grupo B
    { team: 'CAN', participant: 'Rudy' },
    { team: 'BIH', participant: 'Rudy' },
    { team: 'QAT', participant: 'Charmin' },
    { team: 'SUI', participant: 'Dannister' },
    // Grupo C
    { team: 'BRA', participant: 'Asaf' },
    { team: 'MAR', participant: 'Asaf' },
    { team: 'HAI', participant: 'Tito' },
    { team: 'SCO', participant: 'Dannister' },
    // Grupo D
    { team: 'USA', participant: 'Dannister' },
    { team: 'PAR', participant: 'Dannister' },
    { team: 'AUS', participant: 'Charmin' },
    { team: 'TUR', participant: 'Rudy' },
    // Grupo E
    { team: 'GER', participant: 'Dannister' },
    { team: 'CUR', participant: 'Dannister' },
    { team: 'CIV', participant: 'Tito' },
    { team: 'ECU', participant: 'Asaf' },
    // Grupo F
    { team: 'NED', participant: 'Tito' },
    { team: 'JPN', participant: 'Tito' },
    { team: 'SWE', participant: 'Charmin' },
    { team: 'TUN', participant: 'Asaf' },
    // Grupo G
    { team: 'BEL', participant: 'Asaf' },
    { team: 'EGY', participant: 'Dannister' },
    { team: 'IRN', participant: 'Tito' },
    { team: 'NZL', participant: 'Rudy' },
    // Grupo H
    { team: 'ESP', participant: 'Tito' },
    { team: 'CPV', participant: 'Charmin' },
    { team: 'KSA', participant: 'Charmin' },
    { team: 'URU', participant: 'Asaf' },
    // Grupo I
    { team: 'FRA', participant: 'Charmin' },
    { team: 'SEN', participant: 'Rudy' },
    { team: 'IRQ', participant: 'Dannister' },
    { team: 'NOR', participant: 'Charmin' },
    // Grupo J
    { team: 'ARG', participant: 'Dannister' },
    { team: 'ALG', participant: 'Charmin' },
    { team: 'AUT', participant: 'Dannister' },
    { team: 'JOR', participant: 'Tito' },
    // Grupo K
    { team: 'POR', participant: 'Charmin' },
    { team: 'COD', participant: 'Asaf' },
    { team: 'UZB', participant: 'Asaf' },
    { team: 'COL', participant: 'Rudy' },
    // Grupo L
    { team: 'ENG', participant: 'Rudy' },
    { team: 'CRO', participant: 'Asaf' },
    { team: 'GHA', participant: 'Rudy' },
    { team: 'PAN', participant: 'Rudy' },
  ]

  for (const a of ASSIGNMENTS) {
    const p = pMap[a.participant]
    await client.execute({
      sql: `INSERT OR IGNORE INTO team_assignments
              (quiniela_id, participant_id, team_code, assignment_type, share_percentage, extra_paid)
            VALUES (?, ?, ?, 'random', 100.0, 0)`,
      args: [quinielaId, p.id, a.team],
    })
  }

  console.log(`\n✅ ${ASSIGNMENTS.length} asignaciones de equipos creadas`)
  console.log('\n🎉 Seed completado. La quiniela está lista.')
}

run().catch(err => { console.error('❌ Error:', err); process.exit(1) })
