# Instruções para agentes de IA neste repositório

Estas regras tornam você produtivo rapidamente no BusinessApp (Expo + React Native + expo-router + Supabase). Seja conciso, preserve padrões existentes e siga estes pontos ao propor mudanças ou gerar código.

## Arquitetura e fluxo principal
- Navegação: `expo-router` com grupos de rotas.
  - Layout raiz: `app/_layout.tsx` com o “porteiro” que redireciona conforme estado.
  - Grupos: `(auth)` para autenticação, `(app)` para app principal, `(admin)` para administração.
  - Exemplo: telas em `app/(auth)/login.tsx`, `app/(auth)/boas-vindas.tsx`, `app/(admin)/dashboard.tsx`, etc.
- Autenticação/estado do usuário: `contexts/AuthContext.tsx` usa Supabase (`lib/supabase.ts`).
  - Mantém `user`, `session`, `role`, `estabelecimentoId`, `loading`.
  - Busca perfil na tabela `usuarios (estabelecimento_id, role)` e valida status em `estabelecimentos` para usuários não `super_admin`.
  - Mudanças de sessão via `supabase.auth.onAuthStateChange` atualizam o contexto.
- Primeira execução (boas-vindas): usa AsyncStorage com a chave `@hasSeenWelcome`.
  - Guardiã no `app/_layout.tsx` redireciona para `/(auth)/boas-vindas` quando `@hasSeenWelcome` não existe.
  - Após o usuário clicar em “Começar Agora”, a tela grava `@hasSeenWelcome = 'true'` e navega para `/(auth)/login`.

## Regras de navegação importantes (evite loops)
- Sempre use caminhos absolutos com grupo ao navegar entre grupos: `router.replace('/(auth)/login')`, `router.replace('/(admin)/dashboard')`, etc.
- O `MainLayout` em `app/_layout.tsx` usa `useSegments()` para detectar o grupo atual e decidir redirecionamentos.
  - Se `isFirstTime` for true e não estiver em `boas-vindas`, força `/(auth)/boas-vindas`.
  - Se sem `user` e fora de `(auth)`, força `/(auth)/login`.
  - Se logado como `super_admin` e fora de `(admin)`, força `/(admin)/dashboard`.
  - Se logado (não `super_admin`) e fora de `(app)`, força `/(app)`.
- Após setar `@hasSeenWelcome`, o layout revalida o flag quando os segmentos mudam para não voltar à tela de boas-vindas.

## Convenções e padrões do projeto
- Agrupe telas usando pastas com parênteses: `(auth)`, `(app)`, `(admin)`. Layouts específicos ficam em `app/(grupo)/_layout.tsx`.
- Componentes reutilizáveis: `components/` e `app/components/` (há duas árvores; mantenha consistência onde já houver componentes sendo usados pelo trecho em questão).
- Temas e UI: `components/Themed*.tsx` e `app/components/ui/*` fornecem wrappers para texto, view e ícones.
- Serviços: `app/services/notifications.ts` usa `expo-notifications`. Em Expo Go (SDK 54), push remoto não é suportado — prefira build de desenvolvimento.
- Supabase: configure chaves públicas via `.env`/`app.config.js` e `lib/supabase.ts`. Não exponha chaves privadas.

## Rotina de desenvolvimento
- Scripts (package.json):
  - `npm run start` (Metro/Expo dev server)
  - `npm run android` / `npm run ios` (run:android/ios – para recursos nativos como push, use Development Build)
  - `npm run web` (web)
  - `npm run test` (jest-expo)
  - `npm run lint` (ESLint via `eslint.config.js`)
- ESLint: arquivo `eslint.config.js` já presente. Se o lint reclamar de diretório inexistente, ajuste a glob no comando ou crie os diretórios esperados.

## Exemplos práticos
- Boas-vindas para Login:
  - Em `app/(auth)/boas-vindas.tsx`, após `AsyncStorage.setItem('@hasSeenWelcome','true')`, faça `router.replace('/(auth)/login')`.
- Redirecionamento central:
  - Edite regras no `useEffect` de `app/_layout.tsx` para manter a experiência consistente entre `(auth)`, `(app)` e `(admin)`.
- Check de conta:
  - `AuthContext` bloqueia acesso se `estabelecimentos.status` diferente de `ativa` e faz signOut com alerta.

## Armadilhas e decisões já tomadas
- Expo Go não suporta push remoto com `expo-notifications` no SDK 53/54 — não trate como bug de navegação.
- Evite paths relativos nos `router.push/replace` quando houver guardiões de layout.
- Não manipule diretamente `user/role` fora do `AuthContext`; consuma via `useAuth()`.

Se algo não estiver claro (por exemplo, padrões duplicados em `components/` vs `app/components/`), pergunte antes de padronizar em larga escala.
