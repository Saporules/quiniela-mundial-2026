import type { APIRoute } from 'astro'
import { getAdminFromRequest, generateAccessToken, generateSlug } from '../../../../lib/auth.js'
import { getQuinielById, getParticipants, createQuiniela, addParticipant, getQuinielBySlug } from '../../../../lib/db.js'

export const POST: APIRoute = async ({ request }) => {
  const base = import.meta.env.BASE_URL
  const admin = await getAdminFromRequest(request)
  if (!admin) return new Response(null, { status: 302, headers: { Location: `${base}admin` } })

  const form = await request.formData()
  const quinielaId = Number(form.get('quiniela_id'))

  const q = await getQuinielById(quinielaId)
  if (!q) return new Response(null, { status: 302, headers: { Location: `${base}admin/dashboard` } })

  const participants = await getParticipants(quinielaId)

  // Generate unique slug for new quiniela
  let slug = generateSlug()
  let attempts = 0
  while (await getQuinielBySlug(slug) && attempts < 10) {
    slug = generateSlug()
    attempts++
  }

  const newId = await createQuiniela({
    slug,
    name: `${q.name} (copia)`,
    tournament: q.tournament,
    mode: q.mode,
    basePrice: q.base_price,
    favoritoPrice: q.favorito_price,
    creyentePrice: q.creyente_price,
    maletePrice: q.malete_price,
  })

  // Copy participants with new access tokens
  for (const p of participants) {
    await addParticipant({
      quinielaId: newId,
      name: p.name,
      email: p.email,
      accessToken: generateAccessToken(),
    })
  }

  return new Response(null, { status: 302, headers: { Location: `${base}admin/quiniela/${newId}` } })
}
