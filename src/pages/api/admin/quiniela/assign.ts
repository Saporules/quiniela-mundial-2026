import type { APIRoute } from 'astro'
import { getAdminFromRequest } from '../../../../lib/auth.js'
import { getQuinielById } from '../../../../lib/db.js'
import { assignTeams, assignTeamsFull } from '../../../../lib/assignment.js'

export const POST: APIRoute = async ({ request }) => {
  const base = import.meta.env.BASE_URL
  const admin = await getAdminFromRequest(request)
  if (!admin) return new Response(null, { status: 302, headers: { Location: `${base}admin` } })

  const form = await request.formData()
  const quinielaId = Number(form.get('quiniela_id'))
  const q = await getQuinielById(quinielaId)

  if (!q) return new Response(null, { status: 302, headers: { Location: `${base}admin/dashboard` } })

  try {
    if (q.mode === 'full_random') {
      await assignTeamsFull(quinielaId)
    } else {
      await assignTeams(quinielaId)
    }
  } catch (err) {
    console.error('Error assigning teams:', err)
  }

  return new Response(null, { status: 302, headers: { Location: `${base}admin/quiniela/${quinielaId}` } })
}
