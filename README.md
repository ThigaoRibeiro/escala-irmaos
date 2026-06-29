# 👵 Escala Família - Cuidado da Mãe

Aplicativo web leve e responsivo desenvolvido em React + Vite para ajudar os filhos a organizarem e gerenciarem de forma simples e visual a escala de cuidados de sua mãe.

---

## ☀️ Turnos e Horários
A escala está dividida em dois turnos diários de 12 horas:
- ☀️ **Diurno (Manhã):** 07:00 às 19:00
- 🌙 **Noturno (Noite):** 19:00 às 07:00

## 👥 Cuidadores (Filhos)
- David (👨‍💻)
- Ana Nery (👩‍⚕️)
- Jeane (👩‍🏫)
- Haniel (👨‍🌾)
- Ester (👩‍🎨)

---

## 🚀 Funcionalidades Principais
1. **Calendário Semanal Interativo:** Permite que qualquer irmão assuma um turno vago, libere um turno que havia assumido ou solicite uma troca caso tenha algum imprevisto.
2. **Resumo para WhatsApp:** Botão de um clique para gerar a escala formatada e organizada com emojis prontinha para colar no grupo da família.
3. **Diário de Bordo (Passagem de Plantão):** Registro rápido de ocorrências com checklist para remédios ministrados (💊) e alimentação (🍲), além de observações livres.
4. **Sincronização em Nuvem (Supabase):** Suporte para salvar os dados em tempo real na nuvem do Supabase, com fallback para LocalStorage (modo demonstração local).

---

## ⚙️ Configurando o Banco de Dados (Supabase)
1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e inicie um projeto.
2. Acesse o **SQL Editor** no painel do Supabase, crie uma **New Query** e cole o seguinte script SQL para criar as tabelas:

```sql
-- 1. Tabela de Escalas
CREATE TABLE IF NOT EXISTS public.shifts (
    id text PRIMARY KEY,
    date date NOT NULL,
    period text NOT NULL,
    assigned_to text,
    status text DEFAULT 'confirmed'::text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público total" ON public.shifts FOR ALL USING (true) WITH CHECK (true);

-- 2. Tabela de Diários de Bordo
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
```

3. No painel do Supabase, vá em **Project Settings** > **API**, copie a **Project URL** e a **API anon key**.
4. No aplicativo publicado, vá na aba **Configurar**, cole as credenciais e clique em **Salvar e Conectar**.
