import bcrypt from 'bcryptjs'
import { createSession, getSession, deleteSession } from './db.js'
import type { APIContext } from 'astro'

const SESSION_COOKIE = 'qm_session'
const SESSION_DAYS = 7

function generateToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateAccessToken(): string {
  return generateToken()
}

export function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let slug = ''
  const arr = new Uint8Array(8)
  crypto.getRandomValues(arr)
  for (const b of arr) {
    slug += chars[b % chars.length]
  }
  return slug
}

export async function startSession(adminId: number): Promise<string> {
  const token = generateToken()
  const expires = new Date()
  expires.setDate(expires.getDate() + SESSION_DAYS)
  await createSession(token, adminId, expires.toISOString())
  return token
}

export async function endSession(token: string): Promise<void> {
  await deleteSession(token)
}

export async function getAdminFromRequest(request: Request): Promise<{ id: number; username: string } | null> {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const token = parseCookie(cookieHeader, SESSION_COOKIE)
  if (!token) return null
  const session = await getSession(token)
  if (!session) return null
  return { id: session.admin_id, username: session.username }
}

export async function requireAdmin(request: Request): Promise<{ id: number; username: string }> {
  const admin = await getAdminFromRequest(request)
  if (!admin) throw new Error('Unauthorized')
  return admin
}

export function sessionCookie(token: string): string {
  const maxAge = SESSION_DAYS * 24 * 60 * 60
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
}

export function getSessionToken(request: Request): string | null {
  return parseCookie(request.headers.get('cookie') ?? '', SESSION_COOKIE)
}

function parseCookie(cookieStr: string, name: string): string | null {
  const match = cookieStr.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]!) : null
}
