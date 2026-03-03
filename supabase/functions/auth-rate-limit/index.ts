import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type RateLimitAction = 'check' | 'failure' | 'success'

type RateLimitRecord = {
  email: string
  attempts: number
  window_started_at: string
  lock_until: string | null
}

const MAX_ATTEMPTS = 3
const WINDOW_MINUTES = 30
const LOCK_MINUTES = 30
const WINDOW_MS = WINDOW_MINUTES * 60 * 1000
const LOCK_MS = LOCK_MINUTES * 60 * 1000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function minutesLeft(lockUntil: string) {
  return Math.max(1, Math.ceil((new Date(lockUntil).getTime() - Date.now()) / 60000))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ success: false, message: 'Supabase env não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    const body = await req.json().catch(() => ({}))
    const email = normalizeEmail(body?.email || '')
    const action = (body?.action || 'check') as RateLimitAction

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ success: false, message: 'E-mail inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['check', 'failure', 'success'].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Ação inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: existing, error: existingError } = await supabase
      .from('auth_rate_limits')
      .select('email, attempts, window_started_at, lock_until')
      .eq('email', email)
      .maybeSingle<RateLimitRecord>()

    if (existingError) {
      throw existingError
    }

    const now = Date.now()

    if (action === 'success') {
      await supabase.from('auth_rate_limits').delete().eq('email', email)
      return new Response(
        JSON.stringify({
          success: true,
          blocked: false,
          attempts: 0,
          max_attempts: MAX_ATTEMPTS,
          lock_minutes: LOCK_MINUTES,
          window_minutes: WINDOW_MINUTES,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existing?.lock_until && new Date(existing.lock_until).getTime() > now) {
      return new Response(
        JSON.stringify({
          success: true,
          blocked: true,
          attempts: existing.attempts,
          max_attempts: MAX_ATTEMPTS,
          retry_after_minutes: minutesLeft(existing.lock_until),
          lock_until: existing.lock_until,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const baseWindowStartedAt = existing?.window_started_at
      ? new Date(existing.window_started_at).getTime()
      : now

    const windowExpired = !existing || now - baseWindowStartedAt > WINDOW_MS

    if (action === 'check') {
      if (existing && windowExpired) {
        await supabase
          .from('auth_rate_limits')
          .upsert({
            email,
            attempts: 0,
            window_started_at: new Date(now).toISOString(),
            lock_until: null,
          })
      }

      return new Response(
        JSON.stringify({
          success: true,
          blocked: false,
          attempts: windowExpired ? 0 : existing?.attempts ?? 0,
          max_attempts: MAX_ATTEMPTS,
          remaining_attempts: MAX_ATTEMPTS - (windowExpired ? 0 : existing?.attempts ?? 0),
          lock_minutes: LOCK_MINUTES,
          window_minutes: WINDOW_MINUTES,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const attempts = windowExpired ? 1 : (existing?.attempts ?? 0) + 1
    const shouldLock = attempts >= MAX_ATTEMPTS
    const lockUntil = shouldLock ? new Date(now + LOCK_MS).toISOString() : null

    await supabase
      .from('auth_rate_limits')
      .upsert({
        email,
        attempts,
        window_started_at: windowExpired ? new Date(now).toISOString() : existing?.window_started_at,
        lock_until: lockUntil,
      })

    return new Response(
      JSON.stringify({
        success: true,
        blocked: shouldLock,
        attempts,
        max_attempts: MAX_ATTEMPTS,
        remaining_attempts: Math.max(0, MAX_ATTEMPTS - attempts),
        retry_after_minutes: shouldLock && lockUntil ? minutesLeft(lockUntil) : 0,
        lock_until: lockUntil,
        lock_minutes: LOCK_MINUTES,
        window_minutes: WINDOW_MINUTES,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Erro inesperado',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
