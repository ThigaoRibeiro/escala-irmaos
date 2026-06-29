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

// Credenciais do Supabase carregadas EXCLUSIVAMENTE via variáveis de ambiente (.env ou GitHub Secrets)
const DEFAULT_URL = import.meta.env.VITE_SUPABASE_URL || '';
const DEFAULT_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// --- CONFIGURAÇÕES DO SUPABASE ---

export function getSupabaseConfig() {
  try {
    const config = localStorage.getItem(CONFIG_KEY);
    if (config) {
      return JSON.parse(config);
    }
    // Se o usuário desativou explicitamente, roda local
    const isLocalMode = localStorage.getItem('escala_local_mode_active') === 'true';
    if (isLocalMode) {
      return { url: '', key: '' };
    }
    // Por padrão, usa as credenciais do banco online
    return { url: DEFAULT_URL, key: DEFAULT_KEY };
  } catch (e) {
    console.error('Erro ao ler config do Supabase:', e);
    return { url: DEFAULT_URL, key: DEFAULT_KEY };
  }
}

export function saveSupabaseConfig(url, key) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, key }));
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
    try {
      const { data, error } = await client
        .from('caregivers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Erro ao carregar cuidadoras do Supabase, caindo para local:', e);
    }
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
    try {
      const { data, error } = await client
        .from('caregivers')
        .insert({ name })
        .select();
      if (error) throw error;
      return data[0];
    } catch (e) {
      console.error('Erro ao adicionar cuidadora no Supabase:', e);
    }
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
    try {
      const { error } = await client
        .from('caregivers')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Erro ao remover cuidadora no Supabase:', e);
    }
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
    try {
      const { data, error } = await client
        .from('shifts')
        .select('*');
      if (error) throw error;
      
      const shiftsObj = {};
      data.forEach(shift => {
        shiftsObj[`${shift.date}_${shift.period}`] = shift;
      });
      return shiftsObj;
    } catch (e) {
      console.error('Erro ao buscar escalas no Supabase, caindo para local:', e);
    }
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
  
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client
        .from('shifts')
        .upsert({
          id,
          date,
          period,
          assigned_to,
          caregiver_assigned,
          status,
          updated_at: updatedAt
        });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Erro ao atualizar escala no Supabase, tentando local:', e);
    }
  }
  
  const shifts = await getShifts();
  shifts[id] = {
    id,
    date,
    period,
    assigned_to,
    caregiver_assigned,
    status,
    updated_at: updatedAt
  };
  localStorage.setItem(LOCAL_SHIFTS_KEY, JSON.stringify(shifts));
  return true;
}

// --- OPERAÇÕES DE DIÁRIO (LOGS) ---

export async function getDailyLogs() {
  const client = getSupabaseClient();
  if (client) {
    try {
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
    } catch (e) {
      console.error('Erro ao buscar logs no Supabase, caindo para local:', e);
    }
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
  
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client
        .from('daily_logs')
        .upsert({
          id,
          date,
          period,
          author,
          caregiver,
          meds_given,
          meals_ok,
          notes,
          created_at: createdAt
        });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Erro ao salvar log no Supabase, tentando local:', e);
    }
  }
  
  const logs = await getDailyLogs();
  logs[id] = {
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
  localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs));
  return true;
}

// --- SCRIPT SQL DO SUPABASE ---

export const SUPABASE_SQL_SETUP = `-- Script para criar as tabelas no Supabase SQL Editor

-- 1. Tabela de Cuidadoras (caregivers)
CREATE TABLE IF NOT EXISTS public.caregivers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security) e permitir acesso público
ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público total caregivers" ON public.caregivers FOR ALL USING (true) WITH CHECK (true);

-- Inserir cuidadoras padrão
INSERT INTO public.caregivers (name) VALUES ('Nathália'), ('Viviane'), ('Paula') ON CONFLICT DO NOTHING;

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

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público total shifts" ON public.shifts FOR ALL USING (true) WITH CHECK (true);

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

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público total logs" ON public.daily_logs FOR ALL USING (true) WITH CHECK (true);
`;
