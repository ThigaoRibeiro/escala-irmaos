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

const defaultFamilyEmails = [...defaultAdminEmails]

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

function getAllowedFamilyEmails() {
  const fromEnv = (Deno.env.get('FAMILY_EMAILS') ?? '')
    .split(',')
    .map((value) => normalizeEmail(value))
    .filter(Boolean)

  return new Set(fromEnv.length > 0 ? fromEnv : defaultFamilyEmails)
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function findAuthUserByEmail(email: string) {
  const targetEmail = normalizeEmail(email)
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage
    })

    if (error) {
      throw error
    }

    const users = data?.users ?? []
    const foundUser = users.find((user) => normalizeEmail(user.email) === targetEmail)
    if (foundUser) {
      return foundUser
    }

    if (users.length < perPage) {
      return null
    }

    page += 1
  }
}

async function upsertFamilyPassword(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail || !getAllowedFamilyEmails().has(normalizedEmail)) {
    throw new Error('Este e-mail não está liberado como irmão administrador.')
  }

  if (password.length < 6) {
    throw new Error('A senha deve ter pelo menos 6 caracteres.')
  }

  const existingUser = await findAuthUserByEmail(normalizedEmail)
  if (existingUser) {
    const { error: updatePasswordError } = await adminClient.auth.admin.updateUserById(
      existingUser.id,
      { password }
    )

    if (updatePasswordError) {
      throw updatePasswordError
    }

    return {
      email: normalizedEmail,
      userId: existingUser.id,
      action: 'updated'
    }
  }

  const { data: createdUserData, error: createUserError } = await adminClient.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'ADMIN'
    }
  })

  if (createUserError || !createdUserData.user) {
    throw createUserError ?? new Error('Não foi possível criar o usuário da família.')
  }

  return {
    email: normalizedEmail,
    userId: createdUserData.user.id,
    action: 'created'
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.' })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!token) {
      return jsonResponse(401, { error: 'Token de autenticação ausente.' })
    }

    const { data: authData, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !authData.user) {
      return jsonResponse(401, { error: 'Usuário não autenticado.' })
    }

    const callerEmail = normalizeEmail(authData.user.email)
    if (!getAllowedAdminEmails().has(callerEmail)) {
      return jsonResponse(403, { error: 'Somente administradores podem gerenciar acessos.' })
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
        return jsonResponse(400, { error: 'O login da cuidadora deve usar o padrão @lessacare.com.' })
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
        return jsonResponse(409, { error: 'Já existe uma cuidadora cadastrada com esse login.' })
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
        return jsonResponse(400, { error: createUserError?.message || 'Não foi possível criar o usuário da cuidadora.' })
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
        return jsonResponse(500, { error: insertCaregiverError?.message || 'Não foi possível salvar a cuidadora.' })
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
        return jsonResponse(404, { error: 'Cuidadora não encontrada.' })
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

    if (action === 'reset_caregiver_password') {
      const caregiverId = String(body?.caregiverId ?? '').trim()
      const newPassword = String(body?.newPassword ?? '').trim()

      if (!caregiverId) {
        return jsonResponse(400, { error: 'Informe a cuidadora que terá a senha redefinida.' })
      }

      if (newPassword.length < 6) {
        return jsonResponse(400, { error: 'A nova senha deve ter pelo menos 6 caracteres.' })
      }

      const { data: caregiver, error: caregiverError } = await adminClient
        .from('caregivers')
        .select('*')
        .eq('id', caregiverId)
        .maybeSingle()

      if (caregiverError) {
        return jsonResponse(500, { error: caregiverError.message })
      }

      if (!caregiver?.auth_user_id) {
        return jsonResponse(404, { error: 'Cuidadora sem vínculo válido no Auth.' })
      }

      const { error: updatePasswordError } = await adminClient.auth.admin.updateUserById(
        caregiver.auth_user_id,
        { password: newPassword }
      )

      if (updatePasswordError) {
        return jsonResponse(500, { error: updatePasswordError.message })
      }

      return jsonResponse(200, { success: true, caregiverId })
    }

    if (action === 'upsert_family_password') {
      const email = normalizeEmail(body?.email)
      const newPassword = String(body?.newPassword ?? '').trim()

      if (!email) {
        return jsonResponse(400, { error: 'Informe o e-mail do irmão.' })
      }

      if (newPassword.length < 6) {
        return jsonResponse(400, { error: 'A nova senha deve ter pelo menos 6 caracteres.' })
      }

      const result = await upsertFamilyPassword(email, newPassword)
      return jsonResponse(200, { success: true, result })
    }

    if (action === 'reset_all_family_passwords') {
      const newPassword = String(body?.newPassword ?? '').trim()
      const requestedEmails = Array.isArray(body?.emails)
        ? body.emails.map((value: unknown) => normalizeEmail(value)).filter(Boolean)
        : []

      if (newPassword.length < 6) {
        return jsonResponse(400, { error: 'A nova senha deve ter pelo menos 6 caracteres.' })
      }

      const allowedFamilyEmails = getAllowedFamilyEmails()
      const targetEmails = requestedEmails.length > 0
        ? requestedEmails.filter((email) => allowedFamilyEmails.has(email))
        : Array.from(allowedFamilyEmails)

      const results = []
      for (const email of targetEmails) {
        const result = await upsertFamilyPassword(email, newPassword)
        results.push(result)
      }

      return jsonResponse(200, { success: true, results })
    }

    return jsonResponse(400, { error: 'Ação administrativa inválida.' })
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : 'Erro inesperado na função administrativa.'
    })
  }
})
