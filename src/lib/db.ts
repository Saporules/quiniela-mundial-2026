import Database from 'better-sqlite3'
import { join } from 'path'

const DB_PATH = process.env['DB_PATH'] ?? join(process.cwd(), 'quiniela.db')

let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    initSchema(_db)
  }
  return _db
}

function initSchema(db: Database.Database): void {
  db.exec(`
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
  try { db.exec("ALTER TABLE quinielas ADD COLUMN mode TEXT NOT NULL DEFAULT 'reclamo'") } catch {}
}

// ─── Admin Users ─────────────────────────────────────────────────────────────

export async function getAdminByUsername(username: string) {
  return getDb().prepare('SELECT * FROM admin_users WHERE username = ?').get(username) as
    { id: number; username: string; password_hash: string } | undefined
}

export async function countAdmins(): Promise<number> {
  const row = getDb().prepare('SELECT COUNT(*) as count FROM admin_users').get() as { count: number }
  return row.count
}

export async function createAdmin(username: string, passwordHash: string): Promise<number> {
  const result = getDb().prepare(
    'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)'
  ).run(username, passwordHash)
  return result.lastInsertRowid as number
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function createSession(token: string, adminId: number, expiresAt: string): Promise<void> {
  getDb().prepare(
    'INSERT INTO sessions (token, admin_id, expires_at) VALUES (?, ?, ?)'
  ).run(token, adminId, expiresAt)
}

export async function getSession(token: string) {
  return getDb().prepare(`
    SELECT s.*, a.username FROM sessions s
    JOIN admin_users a ON a.id = s.admin_id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token) as { id: number; token: string; admin_id: number; username: string } | undefined
}

export async function deleteSession(token: string): Promise<void> {
  getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

// ─── Quinielas ────────────────────────────────────────────────────────────────

export async function createQuiniela(data: {
  slug: string; name: string; tournament: string; mode: string
  basePrice: number; favoritoPrice: number; creyentePrice: number; maletePrice: number
}): Promise<number> {
  const result = getDb().prepare(
    `INSERT INTO quinielas (slug, name, tournament, base_price, favorito_price, creyente_price, malete_price, mode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(data.slug, data.name, data.tournament, data.basePrice, data.favoritoPrice, data.creyentePrice, data.maletePrice, data.mode)
  return result.lastInsertRowid as number
}

export async function getAllQuinielas() {
  return getDb().prepare(`
    SELECT q.*, COUNT(p.id) as participant_count
    FROM quinielas q LEFT JOIN participants p ON p.quiniela_id = q.id
    GROUP BY q.id ORDER BY q.created_at DESC
  `).all() as Array<{
    id: number; slug: string; name: string; tournament: string
    base_price: number; favorito_price: number; creyente_price: number; malete_price: number
    status: string; mode: string; created_at: string; participant_count: number
  }>
}

export async function getQuinielById(id: number) {
  return getDb().prepare('SELECT * FROM quinielas WHERE id = ?').get(id) as {
    id: number; slug: string; name: string; tournament: string
    base_price: number; favorito_price: number; creyente_price: number; malete_price: number
    status: string; mode: string
  } | undefined
}

export async function getQuinielBySlug(slug: string) {
  return getDb().prepare('SELECT * FROM quinielas WHERE slug = ?').get(slug) as {
    id: number; slug: string; name: string; tournament: string
    base_price: number; favorito_price: number; creyente_price: number; malete_price: number
    status: string; mode: string
  } | undefined
}

export async function updateQuinielaStatus(id: number, status: string): Promise<void> {
  getDb().prepare('UPDATE quinielas SET status = ? WHERE id = ?').run(status, id)
}

export async function deleteQuiniela(id: number): Promise<void> {
  getDb().prepare('DELETE FROM quinielas WHERE id = ?').run(id)
}

export async function resetQuiniela(id: number): Promise<void> {
  const db = getDb()
  db.prepare('DELETE FROM team_assignments WHERE quiniela_id = ?').run(id)
  db.prepare('DELETE FROM team_claims WHERE quiniela_id = ?').run(id)
  db.prepare("UPDATE quinielas SET status = 'setup' WHERE id = ?").run(id)
}

// ─── Participants ─────────────────────────────────────────────────────────────

export async function addParticipant(data: {
  quinielaId: number; name: string; email: string; accessToken: string
}): Promise<number> {
  const result = getDb().prepare(
    'INSERT INTO participants (quiniela_id, name, email, access_token) VALUES (?, ?, ?, ?)'
  ).run(data.quinielaId, data.name, data.email, data.accessToken)
  return result.lastInsertRowid as number
}

export async function getParticipants(quinielaId: number) {
  return getDb().prepare(
    'SELECT * FROM participants WHERE quiniela_id = ? ORDER BY created_at'
  ).all(quinielaId) as Array<{
    id: number; quiniela_id: number; name: string; email: string; access_token: string; created_at: string
  }>
}

export async function getParticipantByToken(token: string) {
  return getDb().prepare('SELECT * FROM participants WHERE access_token = ?').get(token) as
    { id: number; quiniela_id: number; name: string; email: string; access_token: string } | undefined
}

export async function deleteParticipant(id: number): Promise<void> {
  getDb().prepare('DELETE FROM participants WHERE id = ?').run(id)
}

// ─── Team Assignments ─────────────────────────────────────────────────────────

export async function insertTeamAssignment(data: {
  quinielaId: number; participantId: number; teamCode: string
  assignmentType: string; sharePercentage: number; extraPaid: number
}): Promise<void> {
  getDb().prepare(`
    INSERT INTO team_assignments (quiniela_id, participant_id, team_code, assignment_type, share_percentage, extra_paid)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(quiniela_id, participant_id, team_code) DO UPDATE SET
      assignment_type  = excluded.assignment_type,
      share_percentage = excluded.share_percentage,
      extra_paid       = excluded.extra_paid
  `).run(data.quinielaId, data.participantId, data.teamCode, data.assignmentType, data.sharePercentage, data.extraPaid)
}

export async function getAssignments(quinielaId: number) {
  return getDb().prepare(`
    SELECT ta.*, p.name as participant_name
    FROM team_assignments ta JOIN participants p ON p.id = ta.participant_id
    WHERE ta.quiniela_id = ? ORDER BY p.name, ta.team_code
  `).all(quinielaId) as Array<{
    id: number; quiniela_id: number; participant_id: number; team_code: string
    assignment_type: string; share_percentage: number; extra_paid: number; participant_name: string
  }>
}

export async function clearAssignments(quinielaId: number): Promise<void> {
  const db = getDb()
  db.prepare('DELETE FROM team_assignments WHERE quiniela_id = ?').run(quinielaId)
  db.prepare('DELETE FROM team_claims WHERE quiniela_id = ?').run(quinielaId)
}

// ─── Team Claims ──────────────────────────────────────────────────────────────

export async function addClaim(quinielaId: number, participantId: number, teamCode: string): Promise<void> {
  getDb().prepare(
    'INSERT OR IGNORE INTO team_claims (quiniela_id, participant_id, team_code) VALUES (?, ?, ?)'
  ).run(quinielaId, participantId, teamCode)
}

export async function removeClaim(quinielaId: number, participantId: number, teamCode: string): Promise<void> {
  getDb().prepare(
    'DELETE FROM team_claims WHERE quiniela_id = ? AND participant_id = ? AND team_code = ?'
  ).run(quinielaId, participantId, teamCode)
}

export async function getClaims(quinielaId: number) {
  return getDb().prepare(`
    SELECT tc.*, p.name as participant_name
    FROM team_claims tc JOIN participants p ON p.id = tc.participant_id
    WHERE tc.quiniela_id = ?
  `).all(quinielaId) as Array<{
    id: number; quiniela_id: number; participant_id: number; team_code: string; participant_name: string
  }>
}

// ─── Match Cache ──────────────────────────────────────────────────────────────

export async function getCachedData(cacheKey: string, maxAgeMinutes = 10): Promise<string | null> {
  const row = getDb().prepare(
    `SELECT data_json FROM match_cache WHERE cache_key = ? AND updated_at > datetime('now', ?)`
  ).get(cacheKey, `-${maxAgeMinutes} minutes`) as { data_json: string } | undefined
  return row?.data_json ?? null
}

export async function setCachedData(cacheKey: string, dataJson: string): Promise<void> {
  getDb().prepare(`
    INSERT INTO match_cache (cache_key, data_json) VALUES (?, ?)
    ON CONFLICT(cache_key) DO UPDATE SET data_json = excluded.data_json, updated_at = datetime('now')
  `).run(cacheKey, dataJson)
}
