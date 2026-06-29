import { createClient } from '@supabase/supabase-js';

// Lista pré-cadastrada de membros da família
export const MEMBERS = [
  { name: 'David', color: '#4f46e5', lightColor: '#e0e7ff', avatar: '👨‍💻' },
  { name: 'Ana Nery', color: '#db2777', lightColor: '#fce7f3', avatar: '👩‍⚕️' },
  { name: 'Jeane', color: '#0d9488', lightColor: '#ccfbf1', avatar: '👩‍🏫' },
  { name: 'Haniel', color: '#16a34a', lightColor: '#dcfce7', avatar: '👨‍🌾' },
  { name: 'Ester', color: '#ea580c', lightColor: '#ffedd5', avatar: '👩‍🎨' }
];

const CONFIG_KEY = 'escala_supabase_config';
const LOCAL_SHIFTS_KEY = 'escala_local_shifts';
const LOCAL_LOGS_KEY = 'escala_local_logs';

// Recuperar credenciais do Supabase salvas localmente
export function getSupabaseConfig() {
  try {
    const config = localStorage.getItem(CONFIG_KEY);
    return config ? JSON.parse(config) : { url: '', key: '' };
  } catch (e) {
    console.error('Erro ao ler config do Supabase:', e);
    return { url: '', key: '' };
  }
}

// Salvar credenciais do Supabase
export function saveSupabaseConfig(url, key) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, key }));
}

// Limpar credenciais do Supabase
export function clearSupabaseConfig() {
  localStorage.removeItem(CONFIG_KEY);
}

// Inicializar cliente Supabase se configurado
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

// Resetar o cliente em caso de alteração de configuração
export function resetSupabaseClient() {
  supabaseClient = null;
}

// --- MOCK DATA PARA SEGUNDA CHANCE (LOCAL STORAGE) ---
function getInitialMockShifts() {
  const shifts = {};
  const today = new Date();
  
  // Vamos criar escalas para 15 dias no passado e 30 dias no futuro
  for (let i = -15; i <= 30; i++) {
    const current = new Date();
    current.setDate(today.getDate() + i);
    const dateStr = current.toISOString().split('T')[0];
    
    // Distribui alguns turnos aleatórios para demonstração
    const dayOfWeek = current.getDay();
    
    // Turno Diurno (Manhã)
    if (dayOfWeek === 0) { // Domingo
      shifts[`${dateStr}_diurno`] = {
        id: `${dateStr}_diurno`,
        date: dateStr,
        period: 'diurno',
        assigned_to: 'David',
        status: 'confirmed',
        updated_at: new Date().toISOString()
      };
    } else if (dayOfWeek === 1) { // Segunda
      shifts[`${dateStr}_diurno`] = {
        id: `${dateStr}_diurno`,
        date: dateStr,
        period: 'diurno',
        assigned_to: 'Ana Nery',
        status: 'confirmed',
        updated_at: new Date().toISOString()
      };
    } else if (dayOfWeek === 3) { // Quarta
      shifts[`${dateStr}_diurno`] = {
        id: `${dateStr}_diurno`,
        date: dateStr,
        period: 'diurno',
        assigned_to: 'Jeane',
        status: 'confirmed',
        updated_at: new Date().toISOString()
      };
    } else if (dayOfWeek === 5) { // Sexta
      shifts[`${dateStr}_diurno`] = {
        id: `${dateStr}_diurno`,
        date: dateStr,
        period: 'diurno',
        assigned_to: 'Haniel',
        status: 'confirmed',
        updated_at: new Date().toISOString()
      };
    }

    // Turno Noturno (Noite)
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Finais de semana à noite
      shifts[`${dateStr}_noturno`] = {
        id: `${dateStr}_noturno`,
        date: dateStr,
        period: 'noturno',
        assigned_to: 'Ester',
        status: 'confirmed',
        updated_at: new Date().toISOString()
      };
    } else if (dayOfWeek === 2) { // Terça à noite
      shifts[`${dateStr}_noturno`] = {
        id: `${dateStr}_noturno`,
        date: dateStr,
        period: 'noturno',
        assigned_to: 'David',
        status: 'needs_swap',
        updated_at: new Date().toISOString()
      };
    } else if (dayOfWeek === 4) { // Quinta à noite
      shifts[`${dateStr}_noturno`] = {
        id: `${dateStr}_noturno`,
        date: dateStr,
        period: 'noturno',
        assigned_to: 'Jeane',
        status: 'confirmed',
        updated_at: new Date().toISOString()
      };
    }
  }
  return shifts;
}

function getInitialMockLogs() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yestStr = yesterday.toISOString().split('T')[0];

  const logs = {};
  
  logs[`${yestStr}_diurno`] = {
    id: `${yestStr}_diurno`,
    date: yestStr,
    period: 'diurno',
    author: 'Ana Nery',
    meds_given: true,
    meals_ok: true,
    notes: 'Mãe comeu toda a sopa do almoço. Tomou os remédios das 08:00 e das 14:00 certinho. À tarde caminhou um pouco no quintal e estava calma.',
    created_at: new Date(yesterday.setHours(18, 0, 0)).toISOString()
  };

  logs[`${yestStr}_noturno`] = {
    id: `${yestStr}_noturno`,
    date: yestStr,
    period: 'noturno',
    author: 'Ester',
    meds_given: true,
    meals_ok: true,
    notes: 'Dormiu bem, acordou apenas uma vez às 03:00 para ir ao banheiro, mas voltou a dormir logo depois. Tomou a medicação noturna às 21:00.',
    created_at: new Date(today.setHours(6, 30, 0)).toISOString()
  };

  return logs;
}

// --- FUNÇÕES DE OPERAÇÃO DE DADOS ---

// Buscar Escalas
export async function getShifts() {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('shifts')
        .select('*');
      if (error) throw error;
      
      // Converte o array para objeto chaveado por {date}_{period}
      const shiftsObj = {};
      data.forEach(shift => {
        shiftsObj[`${shift.date}_${shift.period}`] = shift;
      });
      return shiftsObj;
    } catch (e) {
      console.error('Erro ao buscar escalas no Supabase, caindo para LocalStorage:', e);
    }
  }
  
  // Fallback LocalStorage
  let local = localStorage.getItem(LOCAL_SHIFTS_KEY);
  if (!local) {
    const initial = getInitialMockShifts();
    localStorage.setItem(LOCAL_SHIFTS_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(local);
}

// Candidatar-se, Trocar ou Alterar Turno
export async function updateShift(date, period, assigned_to, status = 'confirmed') {
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
          status,
          updated_at: updatedAt
        });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Erro ao atualizar escala no Supabase, tentando local:', e);
    }
  }
  
  // Fallback LocalStorage
  const shifts = await getShifts();
  shifts[id] = {
    id,
    date,
    period,
    assigned_to,
    status,
    updated_at: updatedAt
  };
  localStorage.setItem(LOCAL_SHIFTS_KEY, JSON.stringify(shifts));
  return true;
}

// Buscar Diários de Bordo
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
      console.error('Erro ao buscar logs no Supabase, caindo para LocalStorage:', e);
    }
  }
  
  // Fallback LocalStorage
  let local = localStorage.getItem(LOCAL_LOGS_KEY);
  if (!local) {
    const initial = getInitialMockLogs();
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(local);
}

// Salvar/Editar Diário de Bordo
export async function saveDailyLog(date, period, author, meds_given, meals_ok, notes) {
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
  
  // Fallback LocalStorage
  const logs = await getDailyLogs();
  logs[id] = {
    id,
    date,
    period,
    author,
    meds_given,
    meals_ok,
    notes,
    created_at: createdAt
  };
  localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs));
  return true;
}

// SQL Script exposto para os usuários configurarem o Supabase
export const SUPABASE_SQL_SETUP = `-- Script para criar as tabelas no Supabase SQL Editor

-- 1. Tabela de Escalas (shifts)
CREATE TABLE IF NOT EXISTS public.shifts (
    id text PRIMARY KEY,
    date date NOT NULL,
    period text NOT NULL,
    assigned_to text,
    status text DEFAULT 'confirmed'::text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security) se desejar, ou deixar livre para facilidade inicial
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público total" ON public.shifts FOR ALL USING (true) WITH CHECK (true);

-- 2. Tabela de Diários de Bordo (daily_logs)
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id text PRIMARY KEY,
    date date NOT NULL,
    period text NOT NULL,
    author text NOT NULL,
    meds_given boolean DEFAULT false,
    meals_ok boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público total logs" ON public.daily_logs FOR ALL USING (true) WITH CHECK (true);
`;
