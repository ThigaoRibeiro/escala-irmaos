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
4. **Sincronização em Nuvem (Supabase):** Salva os dados no Supabase quando configurado e atualiza a escala em tempo real nos navegadores abertos. O modo local fica disponível apenas como demonstração/desenvolvimento.

---

## ⚙️ Configurando o Banco de Dados (Supabase)
1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e inicie um projeto.
2. Execute o script SQL mantido no projeto para criar as tabelas, remover policies antigas e habilitar Supabase Realtime.
3. Em **Project Settings > API**, use a **Project URL** e a chave **Publishable/anon** no `.env` e nos GitHub Secrets.
4. A aba **Cuidadoras** do app permite editar apenas os nomes das cuidadoras.
5. Nunca coloque `service_role`, `sb_secret_*` ou senha de banco no frontend.
