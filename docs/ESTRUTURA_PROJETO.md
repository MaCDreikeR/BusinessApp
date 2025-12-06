# 📁 Estrutura do Projeto - BusinessApp

## 📋 Visão Geral

Este documento descreve a organização completa do projeto BusinessApp, um sistema de gestão empresarial desenvolvido com Expo + React Native + Supabase.

---

## 🗂️ Estrutura de Diretórios

```
BusinessApp/
├── app/                          # Rotas e Telas (Expo Router)
│   ├── _layout.tsx               # Layout raiz com guardião de autenticação
│   ├── index.tsx                 # Página inicial (redirecionamento)
│   │
│   ├── (auth)/                   # Grupo: Autenticação
│   │   ├── _layout.tsx           # Layout do grupo de autenticação
│   │   ├── boas-vindas.tsx       # Tela de boas-vindas (primeira execução)
│   │   ├── login.tsx             # Tela de login
│   │   └── cadastro.tsx          # Tela de cadastro
│   │
│   ├── (app)/                    # Grupo: App Principal (usuários autenticados)
│   │   ├── _layout.tsx           # Layout com drawer/tabs
│   │   ├── index.tsx             # Dashboard principal
│   │   ├── agenda.tsx            # Agenda/Calendário
│   │   ├── servicos.tsx          # Gerenciamento de serviços
│   │   ├── vendas.tsx            # Vendas e PDV
│   │   ├── comandas.tsx          # Sistema de comandas
│   │   ├── pacotes.tsx           # Pacotes de serviços
│   │   ├── comissoes.tsx         # Comissões de vendas
│   │   ├── relatorios.tsx        # Relatórios e análises
│   │   ├── notificacoes.tsx      # Central de notificações
│   │   ├── configuracoes.tsx     # Configurações do app
│   │   ├── suporte.tsx           # Suporte e ajuda
│   │   │
│   │   ├── agenda/               # Subpasta: Agendamentos
│   │   │   └── novo.tsx          # Novo agendamento
│   │   │
│   │   ├── clientes/             # Subpasta: Clientes
│   │   │   ├── index.tsx         # Lista de clientes
│   │   │   ├── [id].tsx          # Detalhes do cliente
│   │   │   ├── novo.tsx          # Novo cliente
│   │   │   └── selecionar-contato.tsx
│   │   │
│   │   ├── usuarios/             # Subpasta: Usuários
│   │   │   ├── index.tsx         # Lista de usuários
│   │   │   ├── [id].tsx          # Editar usuário
│   │   │   ├── novo.tsx          # Novo usuário
│   │   │   └── perfil.tsx        # Perfil do usuário logado
│   │   │
│   │   ├── estoque/              # Subpasta: Estoque
│   │   │   ├── index.tsx         # Lista de produtos
│   │   │   ├── [id].tsx          # Detalhes do produto
│   │   │   └── novo.tsx          # Novo produto
│   │   │
│   │   ├── fornecedores/         # Subpasta: Fornecedores
│   │   │   ├── index.tsx
│   │   │   ├── [id].tsx
│   │   │   └── novo.tsx
│   │   │
│   │   └── orcamentos/           # Subpasta: Orçamentos
│   │       ├── index.tsx
│   │       ├── [id].tsx
│   │       ├── novo.tsx
│   │       └── utils.ts          # Funções auxiliares (DEPRECADO - migrar para utils/)
│   │
│   └── (admin)/                  # Grupo: Administração (super_admin)
│       ├── _layout.tsx           # Layout administrativo
│       ├── dashboard.tsx         # Dashboard administrativo
│       ├── users.tsx             # Gerenciamento de usuários
│       ├── settings.tsx          # Configurações globais
│       └── conta-detalhes/       # Detalhes de conta
│
├── components/                   # ✅ Componentes Reutilizáveis (CONSOLIDADO)
│   ├── Themed.tsx                # HOC para temas
│   ├── ThemedText.tsx            # Texto com tema
│   ├── ThemedView.tsx            # View com tema
│   ├── ThemedTextInput.tsx       # Input com tema
│   ├── Card.tsx                  # Componente de cartão
│   ├── Button.tsx                # Botão customizado
│   ├── DashboardCard.tsx         # Card específico do dashboard
│   ├── AgendamentoNotificacao.tsx# Notificações de agendamento
│   ├── AccountStatusGuard.tsx    # Guardião de status de conta
│   ├── ErrorBoundary.tsx         # ✅ NOVO - Captura de erros React
│   ├── ErrorScreen.tsx           # ✅ NOVO - Tela de erro amigável
│   ├── FullScreenWrapper.tsx     # Wrapper de tela cheia
│   ├── Collapsible.tsx           # Componente recolhível
│   ├── ExternalLink.tsx          # Link externo
│   ├── HapticTab.tsx             # Tab com feedback háptico
│   ├── HelloWave.tsx             # Animação de onda
│   ├── ParallaxScrollView.tsx    # ScrollView com parallax
│   │
│   └── ui/                       # Subcomponentes de UI
│       ├── IconSymbol.tsx        # Ícones
│       └── TabBarBackground.tsx  # Background da tab bar
│
├── contexts/                     # ✅ Contextos React (Estado Global)
│   └── AuthContext.tsx           # Contexto de autenticação
│
├── hooks/                        # ✅ Hooks Customizados
│   ├── useAuth.ts                # Hook de autenticação (re-export)
│   ├── useAuthNavigation.ts      # Hook de navegação por role
│   ├── usePermissions.ts         # Hook de permissões de usuário
│   ├── useFirstTime.ts           # Hook de primeira execução
│   ├── useAgendamentoNotificacao.ts  # Hook de notificações de agendamento
│   ├── useColorScheme.ts         # Hook de tema claro/escuro
│   ├── useThemeColor.ts          # Hook de cores do tema
│   ├── useScreenDensity.ts       # Hook de densidade de tela
│   └── useUsuarioDrawer.ts       # Hook do drawer de usuário
│
├── lib/                          # ✅ Bibliotecas e Configurações Externas
│   ├── supabase.ts               # ✅ Cliente Supabase (CONSOLIDADO)
│   ├── README_SUPABASE.md        # Documentação do Supabase
│   ├── database.ts               # (VAZIO - REMOVIDO)
│   └── data-service.ts           # (VAZIO - REMOVIDO)
│
├── services/                     # ✅ Serviços de Negócio (CONSOLIDADO)
│   ├── notifications.ts          # Serviço de notificações push
│   └── whatsapp.ts               # Serviço de WhatsApp
│
├── types/                        # ✅ Tipagem TypeScript Centralizada (NOVO)
│   └── index.ts                  # Todas as interfaces do projeto
│                                 # Cliente, Produto, Servico, Agendamento,
│                                 # Venda, Usuario, Comanda, Orcamento, etc.
│
├── utils/                        # ✅ Utilitários (NOVO)
│   ├── logger.ts                 # Sistema de logging condicional
│   ├── validators.ts             # ✅ Validações e formatações (NOVO)
│   └── theme.ts                  # ✅ Sistema de design (NOVO)
│
├── constants/                    # Constantes do App
│   └── Colors.ts                 # Definições de cores (usar utils/theme.ts)
│
├── assets/                       # Arquivos Estáticos
│   ├── fonts/                    # Fontes customizadas
│   ├── images/                   # Imagens
│   ├── videos/                   # Vídeos
│   └── animations/               # Animações Lottie
│
├── scripts/                      # Scripts Utilitários
│   ├── check-console-log.js      # ✅ Verificação de console.log
│   ├── setup-env.js              # Setup de .env
│   ├── setup-supabase-local.js   # Setup do Supabase local
│   ├── migrate-database.js       # Migração de banco
│   ├── db-migrate.js             # Migração de DB
│   ├── reset-project.js          # Reset do projeto
│   └── expo-run-android-wsl.sh   # Script Android WSL
│
├── docs/                         # ✅ Documentação
│   ├── GUIA_IMPORTS.md           # Guia de imports e aliases
│   ├── GUIA_LOGGING.md           # ✅ Guia do sistema de logging
│   ├── RELATORIO_MIGRACAO_LOGGER.md  # ✅ Relatório de migração
│   ├── ESTRUTURA_PROJETO.md      # ✅ Este arquivo
│   ├── desenvolvimento-workflow.md   # Workflow de desenvolvimento
│   ├── novo-usuario.md           # Documentação de novo usuário
│   └── solucao-dpi.md            # Solução para problemas de DPI
│
├── supabase/                     # Configuração do Supabase Local
│   ├── config.toml               # Configuração do Supabase CLI
│   ├── schema-export.sql         # Schema exportado
│   ├── migrations/               # Migrações do banco
│   └── functions/                # Edge Functions
│
├── android/                      # Projeto Android Nativo
├── ios/                          # Projeto iOS Nativo
│
├── .env.example                  # ✅ Exemplo de variáveis de ambiente
├── .gitignore                    # Arquivos ignorados pelo Git
├── app.config.js                 # Configuração do Expo
├── babel.config.js               # ✅ Configuração do Babel (aliases)
├── metro.config.js               # ✅ Configuração do Metro (aliases)
├── tsconfig.json                 # ✅ Configuração do TypeScript (aliases)
├── eslint.config.js              # Configuração do ESLint
├── package.json                  # Dependências e scripts
├── eas.json                      # Configuração do EAS Build
├── CHANGELOG_REFATORACAO.md      # ✅ Changelog de refatorações
└── README.md                     # Documentação principal
```

---

## 🎯 Convenções de Nomenclatura

### Arquivos e Pastas

- **Rotas (app/)**: Usar kebab-case com parênteses para grupos: `(auth)`, `(app)`, `(admin)`
- **Componentes**: PascalCase: `ThemedText.tsx`, `DashboardCard.tsx`
- **Utilitários**: camelCase: `validators.ts`, `logger.ts`
- **Tipos**: camelCase: `index.ts` (mas interfaces em PascalCase)
- **Constantes**: PascalCase: `Colors.ts`

### Código TypeScript

- **Interfaces**: PascalCase: `Cliente`, `Produto`, `Servico`
- **Tipos**: PascalCase: `FormaPagamento`, `StatusComanda`
- **Variáveis**: camelCase: `estabelecimentoId`, `clienteNome`
- **Constantes**: UPPER_SNAKE_CASE: `MAX_ITEMS`, `DEFAULT_TIMEOUT`
- **Funções**: camelCase: `validarEmail`, `formatarTelefone`

---

## 📦 Aliases de Import

Configure nos arquivos `tsconfig.json`, `babel.config.js` e `metro.config.js`:

```typescript
import { Cliente, Produto } from '@types';
import { logger } from '@utils/logger';
import { validarEmail } from '@utils/validators';
import { theme } from '@utils/theme';
import { ThemedText } from '@components/ThemedText';
import { supabase } from '@lib/supabase';
import { useAuth } from '@contexts/AuthContext';
import { notifications } from '@services/notifications';
```

### Aliases Disponíveis

| Alias | Caminho | Uso |
|-------|---------|-----|
| `@types` | `./types` | Interfaces TypeScript |
| `@utils/*` | `./utils/*` | Utilitários (logger, validators, theme) |
| `@components/*` | `./components/*` | Componentes reutilizáveis |
| `@contexts/*` | `./contexts/*` | Contextos React |
| `@lib/*` | `./lib/*` | Bibliotecas externas (supabase) |
| `@services/*` | `./services/*` | Serviços de negócio |

---

## 🔐 Autenticação e Navegação

### Fluxo de Autenticação

1. **Primeira execução**: `boas-vindas.tsx` → grava flag no AsyncStorage
2. **Não autenticado**: Redireciona para `/(auth)/login`
3. **Autenticado (super_admin)**: Redireciona para `/(admin)/dashboard`
4. **Autenticado (admin/funcionario)**: Redireciona para `/(app)/index`

### Grupos de Rotas

- **(auth)**: Telas de autenticação (login, cadastro, boas-vindas)
- **(app)**: App principal (dashboard, agenda, vendas, etc.)
- **(admin)**: Área administrativa (apenas super_admin)

### Guardião de Autenticação

O `app/_layout.tsx` contém a lógica de redirecionamento baseada em:
- `isFirstTime` (primeira execução)
- `user` (usuário logado)
- `role` (papel do usuário)
- `estabelecimentoId` (conta ativa)

---

## 🎨 Sistema de Design

### Cores

Usar o sistema de design centralizado:

```typescript
import { theme } from '@utils/theme';

<View style={{ backgroundColor: theme.colors.primary }} />
<Text style={{ color: theme.colors.text }}>Título</Text>
```

### Espaçamentos

```typescript
<View style={{ 
  padding: theme.spacing.md,
  marginBottom: theme.spacing.lg 
}} />
```

### Tipografia

```typescript
<Text style={{ 
  fontSize: theme.typography.fontSize.lg,
  fontWeight: theme.typography.fontWeight.bold 
}}>
  Título
</Text>
```

### Sombras

```typescript
<View style={[styles.card, theme.shadows.base]} />
```

---

## 📝 Tipagem Centralizada

### Usando Tipos

Todas as interfaces estão em `types/index.ts`:

```typescript
import { Cliente, Produto, Servico, Agendamento } from '@types';

const cliente: Cliente = {
  id: '123',
  nome: 'João Silva',
  telefone: '11987654321',
  estabelecimento_id: 'abc'
};
```

### Tipos Disponíveis

- **Autenticação**: `User`, `Session`, `Usuario`, `UsuarioPermissoes`
- **Estabelecimento**: `Estabelecimento`
- **Clientes**: `Cliente`, `ClienteFormData`, `ClienteComSaldo`
- **Produtos**: `Produto`, `ProdutoFormData`, `ProdutoComEstoque`, `CategoriaEstoque`
- **Serviços**: `Servico`, `ServicoFormData`, `CategoriaServico`
- **Agendamentos**: `Agendamento`, `AgendamentoFormData`, `AgendamentoNotificacao`
- **Vendas**: `Venda`, `ItemVenda`, `VendaFormData`, `VendaComItens`
- **Comandas**: `Comanda`, `ItemComanda`, `ComandaComItens`
- **Orçamentos**: `Orcamento`, `OrcamentoItem`, `OrcamentoComItens`
- **Pacotes**: `Pacote`, `ProdutoPacote`, `ServicoPacote`, `PacoteCompleto`
- **Outros**: `Fornecedor`, `Comissao`, `Despesa`, `Notificacao`, `Meta`

---

## 🔧 Validações e Formatações

### Validações

```typescript
import { validarEmail, validarTelefone, validarCPF } from '@utils/validators';

if (!validarEmail(email)) {
  Alert.alert('Erro', 'Email inválido');
  return;
}
```

### Formatações

```typescript
import { formatarTelefone, formatarCPF, formatarMoeda } from '@utils/validators';

const telefoneFormatado = formatarTelefone('11987654321');
// Retorna: (11) 98765-4321

const preco = formatarMoeda(1500.50);
// Retorna: R$ 1.500,50
```

### Funções Disponíveis

#### Validações
- `validarEmail(email)`
- `validarTelefone(telefone)`
- `validarCPF(cpf)`
- `validarCNPJ(cnpj)`
- `validarCEP(cep)`
- `validarNome(nome)`
- `validarSenha(senha)`
- `validarValorPositivo(valor)`
- `validarQuantidade(quantidade)`

#### Formatações
- `formatarTelefone(telefone)`
- `formatarCPF(cpf)`
- `formatarCNPJ(cnpj)`
- `formatarCEP(cep)`
- `formatarMoeda(valor)`
- `formatarData(data)`
- `formatarDataHora(data)`

#### Sanitização
- `somenteNumeros(texto)`
- `limparTexto(texto)`
- `normalizarTexto(texto)`
- `truncarTexto(texto, maxLength)`
- `capitalizarPalavras(texto)`

---

## 📋 Sistema de Logging

### Uso do Logger

```typescript
import { logger } from '@utils/logger';

// Desenvolvimento (não aparece em produção)
logger.debug('Estado atual:', state);
logger.info('Dados carregados');
logger.success('Operação concluída!');

// Produção (sempre aparece)
logger.warn('API lenta');
logger.error('Erro ao salvar:', error);

// Especializado
logger.navigation('home', 'profile');
logger.api('GET', '/api/clientes', 200);
logger.auth('Login realizado');
logger.database('INSERT', 'agendamentos');
```

### Verificação

```bash
npm run check:console
# ✅ Nenhum console.log encontrado no código de produção!
```

**Regra de Ouro**: NUNCA use `console.log` diretamente!

---

## 🗄️ Banco de Dados (Supabase)

### Cliente Supabase

```typescript
import { supabase } from '@lib/supabase';

// SELECT
const { data, error } = await supabase
  .from('clientes')
  .select('*')
  .eq('estabelecimento_id', estabelecimentoId);

// INSERT
const { data, error } = await supabase
  .from('agendamentos')
  .insert({ cliente_id, servico_id, horario });

// UPDATE
const { error } = await supabase
  .from('produtos')
  .update({ quantidade: novaQuantidade })
  .eq('id', produtoId);

// DELETE
const { error } = await supabase
  .from('vendas')
  .delete()
  .eq('id', vendaId);
```

### Autenticação

```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

// Logout
await supabase.auth.signOut();

// Usuário atual
const { data: { user } } = await supabase.auth.getUser();
```

---

## 🚀 Scripts Disponíveis

### Desenvolvimento

```bash
npm start                    # Inicia Metro bundler
npm run android              # Run no Android
npm run ios                  # Run no iOS
npm run web                  # Run na web
```

### Qualidade

```bash
npm run lint                 # Executar ESLint
npm run test                 # Executar testes
npm run check:console        # Verificar console.log
```

### Supabase Local

```bash
npm run supabase:start       # Iniciar Supabase local
npm run supabase:stop        # Parar Supabase local
npm run supabase:status      # Ver status
npm run supabase:studio      # Abrir Supabase Studio
npm run supabase:reset       # Resetar banco de dados
```

### Build

```bash
npm run build                # Build de produção
npm run prebuild             # Executado antes do build (verifica console.log)
```

---

## 📱 Configuração do Ambiente

### 1. Clonar o Projeto

```bash
git clone https://github.com/MaCDreikeR/BusinessApp.git
cd BusinessApp
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
# Editar .env com suas credenciais Supabase
```

### 4. Iniciar Supabase Local (Opcional)

```bash
npm run supabase:start
```

### 5. Executar App

```bash
npm start
# Pressione 'a' para Android ou 'i' para iOS
```

---

## 🔒 Segurança

### Boas Práticas

- ✅ **NUNCA** commitar `.env` no Git
- ✅ Usar `EXPO_PUBLIC_` para variáveis públicas
- ✅ Usar Expo Secrets para produção
- ✅ Validar dados do usuário com `@utils/validators`
- ✅ Usar logger ao invés de `console.log`
- ✅ Implementar permissões de usuário via `usePermissions`
- ✅ Envolver componentes críticos com ErrorBoundary quando necessário

### Error Boundary - Prevenção de Crashes

O app possui um ErrorBoundary global que captura todos os erros React e previne crashes:

```typescript
// Já configurado em app/_layout.tsx
<ErrorBoundary>
  <AuthProvider>
    <App />
  </AuthProvider>
</ErrorBoundary>
```

**Uso customizado em componentes específicos:**

```typescript
import ErrorBoundary from '@components/ErrorBoundary';

// Com tela de erro padrão
<ErrorBoundary>
  <ComponenteQuePoderiaFalhar />
</ErrorBoundary>

// Com tela de erro customizada
<ErrorBoundary fallback={(error, reset) => (
  <CustomErrorScreen error={error} onReset={reset} />
)}>
  <ComponenteQuePoderiaFalhar />
</ErrorBoundary>
```

**Recursos:**
- 🛡️ Captura erros em toda a árvore de componentes
- 📝 Log automático via logger.error
- 🔄 Botão "Tentar Novamente" para resetar
- 🛠️ Stack trace preservado em dev mode
- 🎨 UI amigável com sugestões de resolução

### Dados Sensíveis

```typescript
// ❌ NUNCA faça isso
logger.debug('Senha:', password);
logger.debug('Token:', token);

// ✅ Correto
logger.debug('Autenticação realizada para:', user.email);
```

---

## 📚 Documentação Adicional

- **Imports e Aliases**: `docs/GUIA_IMPORTS.md`
- **Sistema de Logging**: `docs/GUIA_LOGGING.md`
- **Migração Logger**: `docs/RELATORIO_MIGRACAO_LOGGER.md`
- **Supabase**: `lib/README_SUPABASE.md`
- **Changelog**: `CHANGELOG_REFATORACAO.md`

---

## 🤝 Contribuindo

1. Siga as convenções de nomenclatura
2. Use os tipos centralizados de `@types`
3. Use `@utils/validators` para validações
4. Use `@utils/logger` para logs
5. Use `@utils/theme` para estilos
6. Execute `npm run check:console` antes de commit
7. Execute `npm run lint` para verificar erros
8. Considere usar ErrorBoundary em componentes críticos

---

## 📞 Suporte

- **Documentação**: `/docs`
- **Issues**: GitHub Issues
- **Supabase Studio**: http://127.0.0.1:54323 (local)

---

**Última Atualização**: 30 de Novembro de 2025
**Versão**: 2.0.0
