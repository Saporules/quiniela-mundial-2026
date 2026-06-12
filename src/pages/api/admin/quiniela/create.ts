import type { APIRoute } from 'astro'
import { getAdminFromRequest } from '../../../../lib/auth.js'
import { createQuiniela, getQuinielBySlug } from '../../../../lib/db.js'
import { generateSlug } from '../../../../lib/auth.js'

export const POST: APIRoute = async ({ request }) => {
  const base = import.meta.env.BASE_URL
  const admin = await getAdminFromRequest(request)
  if (!admin) return new Response(null, { status: 302, headers: { Location: `${base}admin` } })

  const form = await request.formData()
  const name          = (form.get('name') as string)?.trim()
  const tournament    = (form.get('tournament') as string) ?? 'world_cup_2026'
  const mode          = (form.get('mode') as string) === 'full_random' ? 'full_random' : 'reclamo'
  const basePrice     = Number(form.get('base_price')) || 300
  const favoritoPrice = Number(form.get('favorito_price')) || 150
  const creyentePrice = Number(form.get('creyente_price')) || 100
  const maletePrice   = Number(form.get('malete_price')) || 50

  if (!name) return new Response(null, { status: 302, headers: { Location: `${base}admin/dashboard` } })

  let slug = generateSlug()
  let attempts = 0
  while (await getQuinielBySlug(slug) && attempts < 10) {
    slug = generateSlug()
    attempts++
  }

  const id = await createQuiniela({ slug, name, tournament, mode, basePrice, favoritoPrice, creyentePrice, maletePrice })

  return new Response(null, { status: 302, headers: { Location: `${base}admin/quiniela/${id}` } })
}
