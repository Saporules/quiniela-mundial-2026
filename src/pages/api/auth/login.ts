import type { APIRoute } from 'astro'
import { getAdminByUsername } from '../../../lib/db.js'
import { verifyPassword, startSession, sessionCookie } from '../../../lib/auth.js'

export const POST: APIRoute = async ({ request }) => {
  const base = import.meta.env.BASE_URL
  const form = await request.formData()
  const username = (form.get('username') as string)?.trim()
  const password = form.get('password') as string

  if (!username || !password) {
    return new Response(null, { status: 302, headers: { Location: `${base}admin?error=1` } })
  }

  const admin = await getAdminByUsername(username)
  if (!admin) {
    return new Response(null, { status: 302, headers: { Location: `${base}admin?error=1` } })
  }

  const valid = await verifyPassword(password, admin.password_hash)
  if (!valid) {
    return new Response(null, { status: 302, headers: { Location: `${base}admin?error=1` } })
  }

  const token = await startSession(admin.id)

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${base}admin/dashboard`,
      'Set-Cookie': sessionCookie(token),
    },
  })
}
