import type { APIRoute } from 'astro'
import { getAdminFromRequest } from '../../../../lib/auth.js'
import { getQuinielById } from '../../../../lib/db.js'
import { resolveClaims } from '../../../../lib/assignment.js'

export const POST: APIRoute = async ({ request }) => {
  const base = import.meta.env.BASE_URL
  const admin = await getAdminFromRequest(request)
  if (!admin) return new Response(null, { status: 302, headers: { Location: `${base}admin` } })

  const form = await request.formData()
  const quinielaId = Number(form.get('quiniela_id'))
  const q = await getQuinielById(quinielaId)

  if (!q || q.status !== 'draft') {
    return new Response(null, { status: 302, headers: { Location: `${base}admin/quiniela/${quinielaId}` } })
  }

  try {
    await resolveClaims(quinielaId, {
      favoritoPrice: q.favorito_price,
      creyentePrice: q.creyente_price,
      maletePrice: q.malete_price,
    })
  } catch (err) {
    console.error('Error resolving claims:', err)
  }

  return new Response(null, { status: 302, headers: { Location: `${base}admin/quiniela/${quinielaId}` } })
}
