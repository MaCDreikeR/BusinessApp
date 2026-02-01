# 📋 Guia de Implementação: Sistema de Slug

## 🎯 Objetivo
Implementar slug único para cada estabelecimento, usado como identificador público no agendamento online.

---

## 📦 Estrutura de Arquivos Criados

```
BusinessApp/
├── supabase/
│   └── migrations/
│       ├── 20260131_add_slug_to_estabelecimentos.sql     # 1️⃣ Adiciona coluna
│       ├── 20260131_populate_slugs.sql                   # 2️⃣ Preenche registros
│       └── 20260131_make_slug_required.sql               # 3️⃣ Torna obrigatório
│
├── utils/
│   ├── slug.ts                                           # Funções TypeScript
│   └── __tests__/
│       └── slug.test.ts                                  # Testes unitários
│
└── docs/
    └── IMPLEMENTACAO_SLUG.md                             # Este arquivo
```

---

## 🚀 Passo a Passo de Execução

### **Etapa 1: Adicionar Coluna (SEGURO)**
```sql
-- Execute no SQL Editor do Supabase
\i supabase/migrations/20260131_add_slug_to_estabelecimentos.sql
```

**O que faz:**
- ✅ Adiciona coluna `slug TEXT`
- ✅ Permite NULL (não quebra registros existentes)
- ✅ Cria índice único parcial
- ✅ Pronto para uso em produção

---

### **Etapa 2: Preencher Slugs Existentes**
```sql
-- Execute no SQL Editor do Supabase
\i supabase/migrations/20260131_populate_slugs.sql
```

**O que faz:**
- ✅ Cria função `gerar_slug_base()` (remove acentos, normaliza)
- ✅ Cria função `gerar_slug_unico()` (resolve conflitos)
- ✅ Processa TODOS os estabelecimentos sem slug
- ✅ Gera slugs únicos automaticamente
- ✅ Mostra progresso e estatísticas

**Exemplo de saída:**
```
NOTICE: Iniciando preenchimento de slugs...
NOTICE: Processados 10 estabelecimentos...
NOTICE: Processados 20 estabelecimentos...
NOTICE: Concluído! Total de slugs gerados: 27
```

**Verificação:**
```sql
-- Ver alguns exemplos
SELECT id, nome, slug FROM estabelecimentos LIMIT 10;

-- Verificar se todos têm slug
SELECT COUNT(*) FROM estabelecimentos WHERE slug IS NULL;
-- Deve retornar: 0
```

---

### **Etapa 3: Tornar Campo Obrigatório**
```sql
-- Execute no SQL Editor do Supabase
\i supabase/migrations/20260131_make_slug_required.sql
```

**O que faz:**
- ✅ Verifica se TODOS têm slug (bloqueia se não tiver)
- ✅ Torna coluna NOT NULL
- ✅ Cria constraint de validação
- ✅ Adiciona trigger de validação
- ✅ Mostra estatísticas finais

**Se algo der errado:**
- Script tem verificação de segurança
- Bloqueia execução se houver registros sem slug
- Mostra mensagem clara do problema

---

## 💻 Uso no App

### **1. Cadastro de Estabelecimento**

```typescript
import { gerarSlugUnico } from '@/utils/slug';
import { supabase } from '@/lib/supabase';

// No formulário de cadastro
async function cadastrarEstabelecimento(dados: {
  nome: string;
  // ... outros campos
}) {
  try {
    // 1️⃣ Gerar slug único
    const slug = await gerarSlugUnico(dados.nome);
    
    // 2️⃣ Inserir estabelecimento com slug
    const { data, error } = await supabase
      .from('estabelecimentos')
      .insert({
        nome: dados.nome,
        slug: slug,
        // ... outros campos
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Estabelecimento cadastrado com slug:', slug);
    return data;
  } catch (error) {
    console.error('❌ Erro ao cadastrar:', error);
    throw error;
  }
}
```

---

### **2. Atualização de Nome**

```typescript
import { atualizarSlug } from '@/utils/slug';

// Quando o nome do estabelecimento mudar
async function atualizarNomeEstabelecimento(
  estabelecimentoId: string,
  novoNome: string
) {
  try {
    // 1️⃣ Atualizar slug baseado no novo nome
    const novoSlug = await atualizarSlug(estabelecimentoId, novoNome);
    
    if (!novoSlug) {
      throw new Error('Falha ao atualizar slug');
    }
    
    // 2️⃣ Atualizar nome no banco
    const { error } = await supabase
      .from('estabelecimentos')
      .update({ 
        nome: novoNome,
        slug: novoSlug 
      })
      .eq('id', estabelecimentoId);
    
    if (error) throw error;
    
    console.log('✅ Nome e slug atualizados:', novoSlug);
  } catch (error) {
    console.error('❌ Erro ao atualizar:', error);
    throw error;
  }
}
```

---

### **3. Validação de Slug Manual (Opcional)**

```typescript
import { validarSlug, slugJaExiste } from '@/utils/slug';

// Se permitir edição manual de slug (não recomendado)
async function validarSlugCustomizado(slug: string, estabelecimentoId?: string) {
  // Verificar formato
  if (!validarSlug(slug)) {
    return {
      valido: false,
      mensagem: 'Slug inválido. Use apenas letras minúsculas, números e hífen.'
    };
  }
  
  // Verificar se já existe
  const existe = await slugJaExiste(slug, estabelecimentoId);
  if (existe) {
    return {
      valido: false,
      mensagem: 'Este slug já está em uso.'
    };
  }
  
  return {
    valido: true,
    mensagem: 'Slug disponível!'
  };
}
```

---

### **4. Buscar por Slug (Agendamento Online)**

```typescript
import { buscarEstabelecimentoPorSlug } from '@/utils/slug';

// Rota pública de agendamento: /agendar/:slug
async function carregarEstabelecimento(slug: string) {
  const estabelecimento = await buscarEstabelecimentoPorSlug(slug);
  
  if (!estabelecimento) {
    // Mostrar página 404
    return null;
  }
  
  // Carregar serviços, profissionais, etc.
  return estabelecimento;
}
```

---

### **5. Atualizar Link de Agendamento**

```typescript
// Na tela de agendamento online
import { useAuth } from '@/contexts/AuthContext';

function AgendamentoOnlineScreen() {
  const { estabelecimentoId } = useAuth();
  const [slug, setSlug] = useState<string>('');
  
  useEffect(() => {
    carregarSlug();
  }, [estabelecimentoId]);
  
  async function carregarSlug() {
    const { data } = await supabase
      .from('estabelecimentos')
      .select('slug')
      .eq('id', estabelecimentoId)
      .single();
    
    if (data) {
      setSlug(data.slug);
    }
  }
  
  // Gerar link público
  const linkAgendamento = `https://business.app/agendar/${slug}`;
  
  // ... resto da tela
}
```

---

## 🔍 Exemplos de Transformação

| Nome Original | Slug Gerado |
|--------------|-------------|
| Salão Emily Borges | `salao-emily-borges` |
| Barbearia São José | `barbearia-sao-jose` |
| Clínica Médica Dr. Silva | `clinica-medica-dr-silva` |
| Studio Hair & Beauty | `studio-hair-beauty` |
| Espaço Zen @ Yoga | `espaco-zen-yoga` |
| SALÃO BELEZA | `salao-beleza` |
| Beleza (conflito 1) | `beleza` |
| Beleza (conflito 2) | `beleza-2` |
| Beleza (conflito 3) | `beleza-3` |

---

## ⚠️ Regras e Restrições

### **Formato Válido:**
- ✅ Apenas letras minúsculas (a-z)
- ✅ Números (0-9)
- ✅ Hífen (-) como separador
- ❌ SEM espaços
- ❌ SEM acentos (á, é, í, ó, ú, ã, ç, etc.)
- ❌ SEM caracteres especiais (@, #, $, %, etc.)
- ❌ NÃO pode começar ou terminar com hífen
- ✅ Mínimo: 3 caracteres
- ✅ Máximo: 100 caracteres

### **Unicidade:**
- Cada slug é único no sistema
- Conflitos são resolvidos automaticamente
- Sistema adiciona `-2`, `-3`, etc. se necessário

### **Imutabilidade (Recomendação):**
- Slug NÃO deve ser editável pelo usuário
- Apenas gerado automaticamente
- Mudanças apenas quando o nome muda
- Evita quebrar links públicos compartilhados

---

## 🧪 Testes

```bash
# Rodar testes unitários
npm test slug.test.ts

# Testes cobrem:
# - Geração de slug base
# - Remoção de acentos
# - Validação de formato
# - Casos extremos (vazio, muito grande, caracteres especiais)
```

---

## 🛡️ Segurança

### **O que ESTÁ protegido:**
- ✅ Validação de formato no banco (constraint)
- ✅ Trigger que garante lowercase
- ✅ Índice único previne duplicatas
- ✅ Funções TypeScript validam antes de salvar
- ✅ Testes cobrem casos extremos

### **O que NÃO fazer:**
- ❌ NÃO expor ID do estabelecimento em URLs públicas
- ❌ NÃO usar slug para autenticação (apenas identificação)
- ❌ NÃO confiar apenas em validação client-side
- ❌ NÃO permitir edição livre do slug pelo usuário

---

## 🚨 Troubleshooting

### **Problema: "Erro ao gerar slug"**
```typescript
// Verificar logs
logger.error('Erro ao gerar slug:', error);

// Possíveis causas:
// 1. Nome vazio ou inválido
// 2. Muitos conflitos (> 1000)
// 3. Problema de conexão com banco
```

### **Problema: "Slug já existe"**
```typescript
// Sistema resolve automaticamente
// Se persistir, verificar:
const existe = await slugJaExiste('salao-beleza');
console.log('Slug existe?', existe);
```

### **Problema: "Migration falhou"**
```sql
-- Verificar se extensão unaccent está instalada
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Se não tiver acesso, pedir ao suporte do Supabase
```

---

## 📊 Monitoramento

```sql
-- Ver estatísticas de slugs
SELECT 
  COUNT(*) as total,
  COUNT(DISTINCT slug) as unicos,
  AVG(LENGTH(slug))::INTEGER as tamanho_medio,
  MAX(LENGTH(slug)) as maior,
  MIN(LENGTH(slug)) as menor
FROM estabelecimentos;

-- Ver slugs mais longos
SELECT nome, slug, LENGTH(slug) as tamanho
FROM estabelecimentos
ORDER BY LENGTH(slug) DESC
LIMIT 10;

-- Ver padrão de conflitos
SELECT 
  REGEXP_REPLACE(slug, '-\d+$', '') as slug_base,
  COUNT(*) as total
FROM estabelecimentos
WHERE slug ~ '-\d+$'
GROUP BY slug_base
ORDER BY total DESC;
```

---

## ✅ Checklist de Implementação

- [ ] Executar migration 1 (adicionar coluna)
- [ ] Executar migration 2 (preencher slugs)
- [ ] Verificar que todos os registros têm slug
- [ ] Executar migration 3 (tornar obrigatório)
- [ ] Adicionar `utils/slug.ts` ao projeto
- [ ] Rodar testes unitários
- [ ] Integrar no cadastro de estabelecimentos
- [ ] Integrar na atualização de nome
- [ ] Atualizar tela de agendamento online para usar slug
- [ ] Testar fluxo completo em desenvolvimento
- [ ] Documentar para equipe
- [ ] Deploy em produção
- [ ] Monitorar logs após deploy

---

## 📚 Próximos Passos

1. **Criar página pública de agendamento**
   - Rota: `/agendar/:slug`
   - Carregar estabelecimento por slug
   - Listar serviços disponíveis
   - Formulário de agendamento

2. **SEO e Compartilhamento**
   - Meta tags personalizadas por estabelecimento
   - Open Graph tags (Facebook, WhatsApp)
   - Schema.org markup (JSON-LD)

3. **Analytics**
   - Rastrear acessos por slug
   - Conversão de visualizações em agendamentos
   - Links mais compartilhados

4. **Futuras Melhorias**
   - Permitir slug customizado (com validação)
   - Histórico de slugs antigos (redirects 301)
   - Slug multilíngue (se expandir internacionalmente)

---

## 🎉 Conclusão

Sistema de slug implementado com segurança e escalabilidade:
- ✅ Banco de dados protegido
- ✅ Registros existentes preservados
- ✅ Lógica de geração automática
- ✅ Resolução de conflitos
- ✅ Testes unitários
- ✅ Integração no app
- ✅ Documentação completa

**Pronto para produção! 🚀**
