import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const defaultAdminEmails = [
  'thiagor21@gmail.com',
  'esterlessa13@gmail.com',
  'professorajeanelessa@gmail.com',
  'ananerianlv@gmail.com',
  'deividylan@gmail.com',
  'haniellessa@hotmail.com'
]

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })
}

function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function normalizeCaregiverEmail(value: unknown) {
  const email = normalizeEmail(value)
  if (!email) return ''
  return email.includes('@') ? email : `${email}@lessacare.com`
}

function getAllowedAdminEmails() {
  const fromEnv = (Deno.env.get('ADMIN_EMAILS') ?? '')
    .split(',')
    .map((value) => normalizeEmail(value))
    .filter(Boolean)

  return new Set(fromEnv.length > 0 ? fromEnv : defaultAdminEmails)
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nÃ£o configurados.' })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!token) {
      return jsonResponse(401, { error: 'Token de autenticaÃ§Ã£o ausente.' })
    }

    const { data: authData, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !authData.user) {
      return jsonResponse(401, { error: 'UsuÃ¡rio nÃ£o autenticado.' })
    }

    const callerEmail = normalizeEmail(authData.user.email)
    if (!getAllowedAdminEmails().has(callerEmail)) {
      return jsonResponse(403, { error: 'Somente administradores podem gerenciar cuidadoras.' })
    }

    const body = await req.json()
    const action = String(body?.action ?? '')

    if (action === 'create_caregiver') {
      const name = String(body?.name ?? '').trim()
      const email = normalizeCaregiverEmail(body?.email)
      const initialPassword = String(body?.initialPassword ?? '').trim()

      if (!name) {
        return jsonResponse(400, { error: 'Informe o nome da cuidadora.' })
      }

      if (!email || !email.endsWith('@lessacare.com')) {
        return jsonResponse(400, { error: 'O login da cuidadora deve usar o padrÃ£o @lessacare.com.' })
      }

      if (initialPassword.length < 6) {
        return jsonResponse(400, { error: 'A senha inicial deve ter pelo menos 6 caracteres.' })
      }

      const { data: existingCaregiver, error: existingCaregiverError } = await adminClient
        .from('caregivers')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (existingCaregiverError) {
        return jsonResponse(500, { error: existingCaregiverError.message })
      }

      if (existingCaregiver) {
        return jsonResponse(409, { error: 'JÃ¡ existe uma cuidadora cadastrada com esse login.' })
      }

      const { data: createdUserData, error: createUserError } = await adminClient.auth.admin.createUser({
        email,
        password: initialPassword,
        email_confirm: true,
        user_metadata: {
          role: 'CAREGIVER',
          caregiver_name: name
        }
      })

      if (createUserError || !createdUserData.user) {
        return jsonResponse(400, { error: createUserError?.message || 'NÃ£o foi possÃ­vel criar o usuÃ¡rio da cuidadora.' })
      }

      const { data: insertedCaregiver, error: insertCaregiverError } = await adminClient
        .from('caregivers')
        .insert({
          name,
          email,
          auth_user_id: createdUserData.user.id,
          active: true
        })
        .select('*')
        .single()

      if (insertCaregiverError || !insertedCaregiver) {
        await adminClient.auth.admin.deleteUser(createdUserData.user.id)
        return jsonResponse(500, { error: insertCaregiverError?.message || 'NÃ£o foi possÃ­vel salvar a cuidadora.' })
      }

      return jsonResponse(200, { caregiver: insertedCaregiver })
    }

    if (action === 'delete_caregiver') {
      const caregiverId = String(body?.caregiverId ?? '').trim()
      if (!caregiverId) {
        return jsonResponse(400, { error: 'Informe a cuidadora que deve ser removida.' })
      }

      const { data: caregiver, error: caregiverError } = await adminClient
        .from('caregivers')
        .select('*')
        .eq('id', caregiverId)
        .maybeSingle()

      if (caregiverError) {
        return jsonResponse(500, { error: caregiverError.message })
      }

      if (!caregiver) {
        return jsonResponse(404, { error: 'Cuidadora nÃ£o encontrada.' })
      }

      const today = new Date().toISOString().slice(0, 10)
      const { error: shiftCleanupError } = await adminClient
        .from('shifts')
        .update({
          caregiver_assigned: null,
          updated_at: new Date().toISOString()
        })
        .eq('caregiver_assigned', caregiver.name)
        .gte('date', today)

      if (shiftCleanupError) {
        return jsonResponse(500, { error: shiftCleanupError.message })
      }

      const { error: deleteCaregiverError } = await adminClient
        .from('caregivers')
        .delete()
        .eq('id', caregiverId)

      if (deleteCaregiverError) {
        return jsonResponse(500, { error: deleteCaregiverError.message })
      }

      if (caregiver.auth_user_id) {
        const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(caregiver.auth_user_id)
        if (deleteUserError) {
          return jsonResponse(500, { error: deleteUserError.message })
        }
      }

      return jsonResponse(200, { success: true, caregiverId })
    }

    return jsonResponse(400, { error: 'AÃ§Ã£o administrativa invÃ¡lida.' })
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : 'Erro inesperado na funÃ§Ã£o administrativa.'
    })
  }
})
