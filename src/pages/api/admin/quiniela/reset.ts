import type { APIRoute } from 'astro'
import { getAdminFromRequest } from '../../../../lib/auth.js'
import { getQuinielById, resetQuiniela } from '../../../../lib/db.js'

export const POST: APIRoute = async ({ request }) => {
  const base = import.meta.env.BASE_URL
  const admin = await getAdminFromRequest(request)
  if (!admin) return new Response(null, { status: 302, headers: { Location: `${base}admin` } })

  const form = await request.formData()
  const quinielaId = Number(form.get('quiniela_id'))

  const q = await getQuinielById(quinielaId)
  if (!q) return new Response(null, { status: 302, headers: { Location: `${base}admin/dashboard` } })

  await resetQuiniela(quinielaId)

  return new Response(null, { status: 302, headers: { Location: `${base}admin/quiniela/${quinielaId}` } })
}
