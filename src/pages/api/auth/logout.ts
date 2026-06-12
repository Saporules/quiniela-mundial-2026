import type { APIRoute } from 'astro'
import { getSessionToken, endSession, clearSessionCookie } from '../../../lib/auth.js'

export const POST: APIRoute = async ({ request }) => {
  const token = getSessionToken(request)
  if (token) await endSession(token)

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${import.meta.env.BASE_URL}admin`,
      'Set-Cookie': clearSessionCookie(),
    },
  })
}
