import type { APIRoute } from 'astro'
import { getAdminFromRequest, generateAccessToken } from '../../../../lib/auth.js'
import { addParticipant, deleteParticipant, getQuinielById } from '../../../../lib/db.js'

export const POST: APIRoute = async ({ request }) => {
  const base = import.meta.env.BASE_URL
  const admin = await getAdminFromRequest(request)
  if (!admin) return new Response(null, { status: 302, headers: { Location: `${base}admin` } })

  const form = await request.formData()
  const action       = form.get('action') as string
  const quinielaId   = Number(form.get('quiniela_id'))

  const q = await getQuinielById(quinielaId)
  if (!q) return new Response(null, { status: 302, headers: { Location: `${base}admin/dashboard` } })
  if (q.status !== 'setup') return new Response(null, { status: 302, headers: { Location: `${base}admin/quiniela/${quinielaId}` } })

  if (action === 'add') {
    const name  = (form.get('name') as string)?.trim()
    const email = (form.get('email') as string)?.trim().toLowerCase()
    if (name && email) {
      await addParticipant({ quinielaId, name, email, accessToken: generateAccessToken() })
    }
  } else if (action === 'delete') {
    const participantId = Number(form.get('participant_id'))
    if (participantId) await deleteParticipant(participantId)
  }

  return new Response(null, { status: 302, headers: { Location: `${base}admin/quiniela/${quinielaId}` } })
}
