import { createClient } from '@supabase/supabase-js';

// Lista pré-cadastrada de membros da família (com avatares por gênero)
export const MEMBERS = [
  { name: 'David', color: '#1e40af', lightColor: '#dbeafe', avatar: '👨‍💻' }, // Masculino
  { name: 'Aldeyr', color: '#0369a1', lightColor: '#e0f2fe', avatar: '👨‍⚕️' }, // Masculino
  { name: 'Ana Nery', color: '#be185d', lightColor: '#fce7f3', avatar: '👩‍⚕️' }, // Feminino
  { name: 'Jeane', color: '#0f766e', lightColor: '#ccfbf1', avatar: '👩‍🏫' }, // Feminino
  { name: 'Haniel', color: '#15803d', lightColor: '#dcfce7', avatar: '👨‍🌾' }, // Masculino
  { name: 'Ester', color: '#c2410c', lightColor: '#ffedd5', avatar: '👩‍🎨' }  // Feminino
];

// Ícone padrão e cor para as Cuidadoras Contratadas
export const CAREGIVER_STYLE = {
  color: '#6d28d9', // Roxo
  lightColor: '#f3e8ff',
  avatar: '👩‍❤️‍🩹' // Ícone de cuidado
};

const CONFIG_KEY = 'escala_supabase_config';
const LOCAL_SHIFTS_KEY = 'escala_local_shifts_v2';
const LOCAL_LOGS_KEY = 'escala_local_logs_v2';
const LOCAL_CAREGIVERS_KEY = 'escala_local_caregivers_v2';
const REALTIME_CHANNEL = 'escala-familia-live';

function normalizeSupabaseUrl(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed;
  }
}

// Credenciais do Supabase carregadas EXCLUSIVAMENTE via variáveis de ambiente (.env ou GitHub Secrets)
const DEFAULT_URL = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '');
const DEFAULT_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// --- CONFIGURAÇÕES DO SUPABASE ---

export function getSupabaseConfig() {
  try {
    if (DEFAULT_URL && DEFAULT_KEY) {
      localStorage.removeItem(CONFIG_KEY);
      localStorage.setItem('escala_local_mode_active', 'false');
      return { url: DEFAULT_URL, key: DEFAULT_KEY };
    }

    // Se o usuário desativou explicitamente, roda local
    const isLocalMode = localStorage.getItem('escala_local_mode_active') === 'true';
    if (isLocalMode) {
      return { url: '', key: '' };
    }

    const config = localStorage.getItem(CONFIG_KEY);
    if (config) {
      const parsed = JSON.parse(config);
      if (parsed.url && parsed.key) {
        return { url: normalizeSupabaseUrl(parsed.url), key: parsed.key };
      }
    }

    return { url: DEFAULT_URL, key: DEFAULT_KEY };
  } catch (e) {
    console.error('Erro ao ler config do Supabase:', e);
    return { url: DEFAULT_URL, key: DEFAULT_KEY };
  }
}

export function saveSupabaseConfig(url, key) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url: normalizeSupabaseUrl(url), key }));
  localStorage.setItem('escala_local_mode_active', 'false');
}

export function clearSupabaseConfig() {
  localStorage.removeItem(CONFIG_KEY);
  localStorage.setItem('escala_local_mode_active', 'true');
}

let supabaseClient = null;
export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  const { url, key } = getSupabaseConfig();
  if (url && key) {
    try {
      supabaseClient = createClient(url, key);
      return supabaseClient;
    } catch (e) {
      console.error('Falha ao inicializar o Supabase:', e);
      return null;
    }
  }
  return null;
}

export function resetSupabaseClient() {
  supabaseClient = null;
  broadcastChannel = null;
  broadcastReadyPromise = null;
}

let broadcastChannel = null;
let broadcastReadyPromise = null;

function getBroadcastChannel() {
  const client = getSupabaseClient();
  if (!client) return null;
  if (broadcastChannel) return broadcastChannel;

  broadcastReadyPromise = new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 2500);

    broadcastChannel = client.channel(REALTIME_CHANNEL);
    broadcastChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        resolve(true);
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  });

  return broadcastChannel;
}

async function sendRealtimeBroadcast(event, payload) {
  try {
    const channel = getBroadcastChannel();
    if (!channel || !broadcastReadyPromise) return false;

    const isReady = await broadcastReadyPromise;
    if (!isReady) return false;

    await channel.send({
      type: 'broadcast',
      event,
      payload
    });

    return true;
  } catch (e) {
    console.warn('Falha ao enviar broadcast realtime:', e);
    return false;
  }
}

export function subscribeToRealtimeChanges({ onShiftChange, onLogChange, onCaregiverChange, onStatusChange } = {}) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel(REALTIME_CHANNEL)
    .on('broadcast', { event: 'shift-change' }, (message) => {
      const payload = message.payload || {};
      if (onShiftChange) onShiftChange({
        eventType: payload.eventType || 'UPSERT',
        new: payload.row || payload.new,
        old: payload.old
      });
    })
    .on('broadcast', { event: 'log-change' }, (message) => {
      const payload = message.payload || {};
      if (onLogChange) onLogChange({
        eventType: payload.eventType || 'UPSERT',
        new: payload.row || payload.new,
        old: payload.old
      });
    })
    .on('broadcast', { event: 'caregiver-change' }, (message) => {
      const payload = message.payload || {};
      if (onCaregiverChange) onCaregiverChange({
        eventType: payload.eventType || 'UPSERT',
        new: payload.row || payload.new,
        old: payload.old
      });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, (payload) => {
      if (onShiftChange) onShiftChange(payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs' }, (payload) => {
      if (onLogChange) onLogChange(payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'caregivers' }, (payload) => {
      if (onCaregiverChange) onCaregiverChange(payload);
    })
    .subscribe((status) => {
      if (onStatusChange) onStatusChange(status);
    });

  return () => {
    client.removeChannel(channel);
  };
}

// --- MOCK DATA INICIAL ---

function getInitialMockCaregivers() {
  return [
    { id: '1', name: 'Nathália' },
    { id: '2', name: 'Viviane' },
    { id: '3', name: 'Paula' }
  ];
}

function getInitialMockShifts() {
  const shifts = {};
  const today = new Date();
  
  for (let i = -15; i <= 30; i++) {
    const current = new Date();
    current.setDate(today.getDate() + i);
    const dateStr = current.toISOString().split('T')[0];
    const dayOfWeek = current.getDay();
    
    // Distribui alguns turnos aleatórios para demonstração
    if (dayOfWeek === 0) { // Domingo
      shifts[`${dateStr}_diurno`] = {
        id: `${dateStr}_diurno`,
        date: dateStr,
        period: 'diurno',
        assigned_to: 'David',
        caregiver_assigned: 'Nathália',
        status: 'confirmed',
        updated_at: new Date().toISOString()
      };
    } else if (dayOfWeek === 1) { // Segunda
      shifts[`${dateStr}_diurno`] = {
        id: `${dateStr}_diurno`,
        date: dateStr,
        period: 'diurno',
        assigned_to: 'Ana Nery',
        caregiver_assigned: 'Viviane',
        status: 'confirmed',
        updated_at: new Date().toISOString()
      };
      shifts[`${dateStr}_noturno`] = {
        id: `${dateStr}_noturno`,
        date: dateStr,
        period: 'noturno',
        assigned_to: 'Aldeyr',
        caregiver_assigned: 'Paula',
        status: 'confirmed',
        updated_at: new Date().toISOString()
      };
    } else if (dayOfWeek === 3) { // Quarta
      shifts[`${dateStr}_diurno`] = {
        id: `${dateStr}_diurno`,
        date: dateStr,
        period: 'diurno',
        assigned_to: 'Jeane',
        caregiver_assigned: 'Nathália',
        status: 'confirmed',
        updated_at: new Date().toISOString()
      };
    } else if (dayOfWeek === 5) { // Sexta
      shifts[`${dateStr}_diurno`] = {
        id: `${dateStr}_diurno`,
        date: dateStr,
        period: 'diurno',
        assigned_to: 'Haniel',
        caregiver_assigned: 'Viviane',
        status: 'confirmed',
        updated_at: new Date().toISOString()
      };
    }
  }
  return shifts;
}

function getInitialMockLogs() {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yestStr = yesterday.toISOString().split('T')[0];

  const logs = {};
  
  logs[`${yestStr}_diurno`] = {
    id: `${yestStr}_diurno`,
    date: yestStr,
    period: 'diurno',
    author: 'Ana Nery',
    caregiver: 'Viviane',
    meds_given: true,
    meals_ok: true,
    notes: 'Mãe passou o dia super bem com a Viviane. Almoçou toda a refeição, tomou o remédio de manhã e da tarde. Ficou um pouco sonolenta após o almoço.',
    created_at: new Date(yesterday.setHours(18, 0, 0)).toISOString()
  };

  return logs;
}

// --- OPERAÇÕES DE CUIDADORAS ---

export async function getCaregivers() {
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('caregivers')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  }
  
  const local = localStorage.getItem(LOCAL_CAREGIVERS_KEY);
  if (!local) {
    const initial = getInitialMockCaregivers();
    localStorage.setItem(LOCAL_CAREGIVERS_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(local);
}

export async function addCaregiver(name) {
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('caregivers')
      .insert({ name })
      .select();
    if (error) throw error;
    await sendRealtimeBroadcast('caregiver-change', {
      eventType: 'UPSERT',
      row: data[0]
    });
    return data[0];
  }
  
  const list = await getCaregivers();
  const newItem = { id: String(Date.now()), name };
  list.push(newItem);
  localStorage.setItem(LOCAL_CAREGIVERS_KEY, JSON.stringify(list));
  return newItem;
}

export async function deleteCaregiver(id) {
  const client = getSupabaseClient();
  if (client) {
    const { error } = await client
      .from('caregivers')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await sendRealtimeBroadcast('caregiver-change', {
      eventType: 'DELETE',
      old: { id }
    });
    return true;
  }
  
  const list = await getCaregivers();
  const filtered = list.filter(item => item.id !== id);
  localStorage.setItem(LOCAL_CAREGIVERS_KEY, JSON.stringify(filtered));
  return true;
}

// --- OPERAÇÕES DE ESCALAS (SHIFTS) ---

export async function getShifts() {
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('shifts')
      .select('*');
    if (error) throw error;

    const shiftsObj = {};
    data.forEach(shift => {
      shiftsObj[`${shift.date}_${shift.period}`] = shift;
    });
    return shiftsObj;
  }
  
  let local = localStorage.getItem(LOCAL_SHIFTS_KEY);
  if (!local) {
    const initial = getInitialMockShifts();
    localStorage.setItem(LOCAL_SHIFTS_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(local);
}

export async function updateShift(date, period, assigned_to, caregiver_assigned, status = 'confirmed') {
  const id = `${date}_${period}`;
  const updatedAt = new Date().toISOString();
  const row = {
    id,
    date,
    period,
    assigned_to,
    caregiver_assigned,
    status,
    updated_at: updatedAt
  };

  const client = getSupabaseClient();
  if (client) {
    const { error } = await client
      .from('shifts')
      .upsert(row);
    if (error) throw error;
    await sendRealtimeBroadcast('shift-change', {
      eventType: 'UPSERT',
      row
    });
    return true;
  }

  const shifts = await getShifts();
  shifts[id] = row;
  localStorage.setItem(LOCAL_SHIFTS_KEY, JSON.stringify(shifts));
  return true;
}

// --- OPERAÇÕES DE DIÁRIO (LOGS) ---

export async function getDailyLogs() {
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('daily_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const logsObj = {};
    data.forEach(log => {
      logsObj[`${log.date}_${log.period}`] = log;
    });
    return logsObj;
  }
  
  let local = localStorage.getItem(LOCAL_LOGS_KEY);
  if (!local) {
    const initial = getInitialMockLogs();
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(local);
}

export async function saveDailyLog(date, period, author, caregiver, meds_given, meals_ok, notes) {
  const id = `${date}_${period}`;
  const createdAt = new Date().toISOString();
  const row = {
    id,
    date,
    period,
    author,
    caregiver,
    meds_given,
    meals_ok,
    notes,
    created_at: createdAt
  };
  
  const client = getSupabaseClient();
  if (client) {
    const { error } = await client
      .from('daily_logs')
      .upsert(row);
    if (error) throw error;
    await sendRealtimeBroadcast('log-change', {
      eventType: 'UPSERT',
      row
    });
    return true;
  }
  
  const logs = await getDailyLogs();
  logs[id] = row;
  localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs));
  return true;
}

// --- SCRIPT SQL DO SUPABASE ---

export const SUPABASE_SQL_SETUP = `-- Script para criar/atualizar as tabelas no Supabase SQL Editor
-- Modelo simples: sem login no app. Todos que acessarem o link usam a chave publishable/anon.
-- Atenção: isso é funcional e simples, mas não impede que alguém com o link/chave pública acesse a API.

-- 1. Tabela de Cuidadoras (caregivers)
CREATE TABLE IF NOT EXISTS public.caregivers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.caregivers (name)
VALUES ('Nathália'), ('Viviane'), ('Paula')
ON CONFLICT DO NOTHING;

-- 2. Tabela de Escalas (shifts)
CREATE TABLE IF NOT EXISTS public.shifts (
    id text PRIMARY KEY,
    date date NOT NULL,
    period text NOT NULL,
    assigned_to text,
    caregiver_assigned text,
    status text DEFAULT 'confirmed'::text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Diários de Bordo (daily_logs)
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id text PRIMARY KEY,
    date date NOT NULL,
    period text NOT NULL,
    author text NOT NULL,
    caregiver text,
    meds_given boolean DEFAULT false,
    meals_ok boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.caregivers REPLICA IDENTITY FULL;
ALTER TABLE public.shifts REPLICA IDENTITY FULL;
ALTER TABLE public.daily_logs REPLICA IDENTITY FULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.caregivers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shifts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_logs TO anon, authenticated;

-- Remove policies antigas, inclusive a versão com login/allowlist se ela tiver sido aplicada.
DROP POLICY IF EXISTS "Acesso público total caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "Acesso público total shifts" ON public.shifts;
DROP POLICY IF EXISTS "Acesso público total logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Acesso publico total caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "Acesso publico total shifts" ON public.shifts;
DROP POLICY IF EXISTS "Acesso publico total logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Familia pode ler caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "Familia pode inserir caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "Familia pode atualizar caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "Familia pode remover caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "Familia pode ler shifts" ON public.shifts;
DROP POLICY IF EXISTS "Familia pode inserir shifts" ON public.shifts;
DROP POLICY IF EXISTS "Familia pode atualizar shifts" ON public.shifts;
DROP POLICY IF EXISTS "Familia pode remover shifts" ON public.shifts;
DROP POLICY IF EXISTS "Familia pode ler daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Familia pode inserir daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Familia pode atualizar daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Familia pode remover daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "App publico pode ler caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "App publico pode inserir caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "App publico pode atualizar caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "App publico pode remover caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "App publico pode ler shifts" ON public.shifts;
DROP POLICY IF EXISTS "App publico pode inserir shifts" ON public.shifts;
DROP POLICY IF EXISTS "App publico pode atualizar shifts" ON public.shifts;
DROP POLICY IF EXISTS "App publico pode remover shifts" ON public.shifts;
DROP POLICY IF EXISTS "App publico pode ler daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "App publico pode inserir daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "App publico pode atualizar daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "App publico pode remover daily_logs" ON public.daily_logs;

CREATE POLICY "App publico pode ler caregivers"
ON public.caregivers
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "App publico pode inserir caregivers"
ON public.caregivers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "App publico pode atualizar caregivers"
ON public.caregivers
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App publico pode remover caregivers"
ON public.caregivers
FOR DELETE
TO anon, authenticated
USING (true);

CREATE POLICY "App publico pode ler shifts"
ON public.shifts
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "App publico pode inserir shifts"
ON public.shifts
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "App publico pode atualizar shifts"
ON public.shifts
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App publico pode remover shifts"
ON public.shifts
FOR DELETE
TO anon, authenticated
USING (true);

CREATE POLICY "App publico pode ler daily_logs"
ON public.daily_logs
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "App publico pode inserir daily_logs"
ON public.daily_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "App publico pode atualizar daily_logs"
ON public.daily_logs
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App publico pode remover daily_logs"
ON public.daily_logs
FOR DELETE
TO anon, authenticated
USING (true);

-- Habilitar Supabase Realtime para atualizações ao vivo entre navegadores.
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.caregivers;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_logs;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;
`;
