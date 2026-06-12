import type { APIRoute } from 'astro'
import { countAdmins, createAdmin } from '../../../lib/db.js'
import { hashPassword, startSession, sessionCookie } from '../../../lib/auth.js'

export const POST: APIRoute = async ({ request }) => {
  const base = import.meta.env.BASE_URL

  if (await countAdmins() > 0) {
    return new Response(null, { status: 302, headers: { Location: `${base}admin` } })
  }

  const form = await request.formData()
  const username = (form.get('username') as string)?.trim()
  const password  = form.get('password') as string
  const confirm   = form.get('confirm') as string

  if (!username || !password || password !== confirm || password.length < 8) {
    return new Response(null, { status: 302, headers: { Location: `${base}admin/setup?error=1` } })
  }

  try {
    const hash = await hashPassword(password)
    const adminId = await createAdmin(username, hash)
    const token = await startSession(adminId)

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${base}admin/dashboard`,
        'Set-Cookie': sessionCookie(token),
      },
    })
  } catch {
    return new Response(null, { status: 302, headers: { Location: `${base}admin/setup?error=1` } })
  }
}
