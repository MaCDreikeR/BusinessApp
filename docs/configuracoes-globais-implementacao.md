# Implementação de Configurações Globais - Resumo

## ✅ Arquivos Criados/Modificados

### 1. Migration de Database
**Arquivo:** `supabase/migrations/20251210_configuracoes_globais.sql`

**Criado:**
- ✅ Tabela `configuracoes_globais`
- ✅ 19 configurações padrão em 3 categorias
- ✅ Políticas RLS (super_admin full access, outros podem ler)
- ✅ Função helper `get_config(chave)`
- ✅ Trigger para updated_at

**Categorias:**
1. **geral** (7 configs): Nome, logo, cor, contato, termos, privacidade
2. **cadastro** (5 configs): Plano padrão, trial, aprovação, boas-vindas, limite
3. **notificacoes** (5 configs): E-mail admin, alertas, relatórios

### 2. Tela de Configurações
**Arquivo:** `app/(admin)/settings.tsx`

**Funcionalidades:**
- ✅ Carregamento de todas as configurações
- ✅ Formulário com 3 seções organizadas
- ✅ Tipos de input: text, number, email, url, boolean (switch), select (picker)
- ✅ Pull-to-refresh
- ✅ Salvamento com feedback
- ✅ Loading states

**Inputs especiais:**
- Plano padrão: Dropdown com planos ativos
- Frequência relatório: Dropdown (nunca, diário, semanal, mensal)
- Booleanos: Switches nativos
- E-mails: Teclado email
- URLs: Teclado URL
- Números: Teclado numérico

## 📋 Próximos Passos

### 1. Executar Migration no Supabase
```bash
# Abra Supabase Dashboard > SQL Editor
# Execute: supabase/migrations/20251210_configuracoes_globais.sql
```

### 2. Executar Migration de Planos (se ainda não executou)
```bash
# Execute: supabase/migrations/20251210_planos_assinaturas.sql
```

### 3. Testar a Tela
1. Acesse o painel admin
2. Clique na aba "Ajustes" (settings)
3. Configure os valores
4. Clique em "Salvar Configurações"

## 🎯 Configurações Disponíveis

### Geral da Plataforma
- Nome da plataforma
- Logo (URL)
- Cor primária (hex)
- E-mail de contato
- Telefone de suporte
- URL Termos de uso
- URL Política de privacidade

### Novos Cadastros
- Plano padrão (dropdown de planos)
- Trial (dias gratuitos)
- Aprovação manual (toggle)
- E-mail de boas-vindas (toggle)
- Limite de estabelecimentos (0 = ilimitado)

### Notificações
- E-mail do admin para alertas
- Notificar nova conta (toggle)
- Notificar cancelamento (toggle)
- Notificar limite de quota (toggle)
- Frequência de relatórios (dropdown)

## 🔧 Uso das Configurações

### No código (TypeScript/JavaScript)
```typescript
// Buscar configuração específica
const { data } = await supabase
  .from('configuracoes_globais')
  .select('valor')
  .eq('chave', 'plataforma_nome')
  .single();

console.log(data.valor); // "BusinessApp"

// Ou usar a função SQL helper
const { data } = await supabase.rpc('get_config', { 
  config_key: 'cadastro_trial_dias' 
});
console.log(data); // "14"
```

### No SQL
```sql
-- Obter valor de configuração
SELECT get_config('plataforma_email_contato');

-- Listar todas as configurações de uma categoria
SELECT chave, valor, descricao 
FROM configuracoes_globais 
WHERE categoria = 'geral'
ORDER BY ordem;
```

## 📊 Schema da Tabela

```sql
configuracoes_globais (
  id UUID PRIMARY KEY,
  chave TEXT UNIQUE NOT NULL,
  valor TEXT,
  tipo TEXT ('text'|'number'|'boolean'|'json'|'url'|'email'),
  categoria TEXT,
  descricao TEXT,
  ordem INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## 🚀 Melhorias Futuras

### Fase 2 (Próximas implementações)
- [ ] Validação de valores (regex para email, URL, etc.)
- [ ] Preview de cores (color picker)
- [ ] Upload de logo direto na interface
- [ ] Histórico de alterações (audit log)
- [ ] Importar/Exportar configurações (JSON)
- [ ] Restaurar valores padrão
- [ ] Cache de configurações no app

### Fase 3 (Integrações)
- [ ] Usar cor primária no tema do app
- [ ] Aplicar logo na tela de login
- [ ] Enviar e-mails usando SMTP configurado
- [ ] Webhook para notificar mudanças

## ⚠️ Observações Importantes

1. **RLS habilitado**: Apenas super_admin pode editar, outros podem ler
2. **Valores como TEXT**: Mesmo números/booleans são armazenados como texto
3. **Conversão de tipos**: A tela faz parse automático (number → parseFloat, boolean → true/false)
4. **Plano padrão**: Precisa ser um UUID válido de um plano existente
5. **Atualizações em lote**: Save atualiza todas as configs de uma vez

## 🐛 Troubleshooting

**Erro: "Table configuracoes_globais does not exist"**
→ Execute a migration no Supabase SQL Editor

**Erro: "Table planos does not exist" no dropdown**
→ Execute a migration de planos primeiro

**Switch não aparece**
→ Verifique se o valor no banco é 'true' ou 'false' (string)

**Picker não funciona no Android**
→ Já está instalado (@react-native-picker/picker v2.11.1)
