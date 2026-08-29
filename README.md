# Sistema Aceleração — Food Scale

App web com login, controle de acesso por papel (RBAC) e PWA. Stack:
Next.js + Supabase (Postgres + Auth + Row Level Security) + Vercel.

## Como o acesso é controlado

Toda permissão é checada em **duas camadas**, nenhuma delas dependendo
do que aparece na tela:

1. **No servidor** — todo `layout.tsx`/`page.tsx` protegido chama
   `requireProfile()` ou `requireMaster()` (`src/lib/auth.ts`) *antes*
   de buscar qualquer dado. Sem sessão válida, redireciona pro login
   sem rodar nenhuma query.
2. **No banco** — Row Level Security em toda tabela
   (`supabase/migrations/0001_init.sql`), mais uma view
   (`clientes_view`) que esconde `liq`/`marg` (lucro por cliente) de
   quem tem papel financeiro/onboarding, e um trigger que impede o
   papel comercial de alterar valores financeiros de um cliente já
   existente. Uma chamada direta na API REST do Supabase, sem passar
   pela tela, é barrada do mesmo jeito.

## Rodando localmente

```bash
npm install
cp .env.local.example .env.local   # preencha com os dados do seu projeto Supabase
npm run dev
```

## Publicando pela primeira vez (passo a passo)

### 1. Criar o projeto no Supabase

1. Crie uma conta grátis em [supabase.com](https://supabase.com).
2. "New Project" → escolha um nome e uma senha de banco (guarde essa
   senha em um cofre de senhas).
3. Espere o projeto provisionar (~2 min).
4. Vá em **SQL Editor** → cole o conteúdo de
   `supabase/migrations/0001_init.sql` → Run.
5. (Opcional, recomendado) Cole o conteúdo de `supabase/seed.sql` →
   Run — isso carrega os 16 clientes e o restante dos dados que já
   existiam no sistema anterior.
6. Vá em **Configurações do Projeto → API**: copie a "Project URL" e a
   "anon public key" — vão no `.env.local`/nas variáveis de ambiente da
   Vercel. Copie também a "service_role key" — **essa é secreta**,
   nunca cole em nenhum lugar público, só nas variáveis de ambiente da
   Vercel.

### 2. Colocar o código no GitHub

Se você (ou eu, com sua autorização) ainda não tiver feito isso:
```bash
git add -A
git commit -m "Sistema Aceleração — versão inicial"
```
Crie um repositório vazio no GitHub e siga as instruções que ele
mostra pra "push an existing repository".

### 3. Deploy na Vercel

1. Crie uma conta grátis em [vercel.com](https://vercel.com) (dá pra
   entrar direto com a conta do GitHub).
2. "Add New… → Project" → selecione o repositório que você acabou de
   criar.
3. Em **Environment Variables**, adicione as 4 variáveis do
   `.env.local.example` com os valores reais do Supabase. Pra
   `NEXT_PUBLIC_SITE_URL`, use o domínio que a Vercel vai gerar (dá pra
   editar depois de o primeiro deploy terminar, ex:
   `https://sistema-web-xxxx.vercel.app`).
4. Deploy. A cada novo commit enviado ao repositório, a Vercel publica
   uma nova versão sozinha.

### 4. Configurar o Supabase pra saber a URL do site

No painel do Supabase → **Authentication → URL Configuration**:
- Site URL: a URL da Vercel (a mesma do passo anterior).
- Redirect URLs: adicione `https://SEU-DOMINIO.vercel.app/**`.

Sem isso, os emails de convite e redefinição de senha apontam pro
lugar errado.

### 5. Criar o primeiro usuário master

O primeiro usuário precisa ser criado direto no painel do Supabase (o
"Configurações > Usuários" só existe *depois* de já ter alguém
master):
1. Supabase → **Authentication → Users → Add User → Create new user**.
2. Preencha seu email (`guiaraujo532@gmail.com`) e uma senha
   temporária (você troca no primeiro login).
3. Vá em **Table Editor → profiles**, ache a linha desse usuário e
   mude a coluna `role` pra `master`.
4. Faça login no sistema com esse email/senha. A partir daí, use
   **Configurações → Usuários** pra convidar todo o resto da equipe
   (inclusive a segunda pessoa master) — o convite já cria o perfil
   com o papel certo automaticamente.

### 6. PWA — adicionar à tela de início

- **Android/Chrome**: abra o site, toque no menu (⋮) → "Adicionar à
  tela inicial" (ou vai aparecer um banner automático de instalação).
- **iPhone/Safari**: abra o site no Safari (tem que ser o Safari, não
  funciona em outro navegador no iOS) → toque no ícone de
  compartilhar → "Adicionar à Tela de Início".

## Domínio próprio (quando quiser trocar do subdomínio da Vercel)

Vercel → seu projeto → **Settings → Domains** → adicione seu domínio e
siga as instruções de DNS que aparecem lá (geralmente um registro CNAME
ou A). Depois disso, atualize `NEXT_PUBLIC_SITE_URL` e a Site URL do
Supabase pro domínio novo.

## Estrutura do projeto

```
src/
  app/
    login/, esqueci-senha/, redefinir-senha/   → páginas públicas
    (app)/                                      → tudo autenticado
      layout.tsx                                → checa sessão, monta MetaBar/nav
      dashboard/, financeiro/, clientes/,
      tarefas/, icp/, configuracoes/usuarios/
  actions/            → Server Actions (única forma de escrever no banco)
  lib/
    supabase/         → clientes Supabase (browser, server, admin)
    auth.ts           → requireProfile()/requireMaster()
    permissions.ts    → o que cada papel VÊ (a permissão de verdade é o RLS)
    types.ts, data.ts
  components/         → UI (client components onde precisa de interação)
supabase/
  migrations/0001_init.sql   → schema + RLS + views + triggers
  seed.sql                    → carga dos dados que já existiam
```
