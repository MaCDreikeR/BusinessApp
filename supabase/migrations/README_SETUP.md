# 🚀 Guia de Execução - Setup Completo SEO

Este guia explica como executar a migration e configurar o bucket de logos no Supabase.

---

## 📋 Ordem de Execução

### **1️⃣ Executar Migration Principal**

**Arquivo:** `complete_seo_setup.sql`

**Como executar:**
1. Acesse Supabase Dashboard
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Cole o conteúdo de `complete_seo_setup.sql`
5. Clique em **Run**

**O que faz:**
- ✅ Adiciona 14 novas colunas à tabela `estabelecimentos`
- ✅ Cria constraints (ex: faixa_preco)
- ✅ Adiciona comentários de documentação
- ✅ Cria políticas RLS para tabela estabelecimentos
- ✅ Cria políticas RLS para bucket logos
- ✅ Cria índices para performance
- ✅ Exibe relatório de sucesso

---

### **2️⃣ Criar Bucket 'logos'**

**Opção A: Via Dashboard (RECOMENDADO)**

1. Acesse: `https://supabase.com/dashboard/project/[seu-projeto]/storage/buckets`
2. Clique em **"New bucket"**
3. Preencha:
   - **Name:** `logos`
   - **Public bucket:** ✅ Sim
   - **File size limit:** 5 MB
   - **Allowed MIME types:** `image/png, image/jpeg, image/jpg, image/webp`
4. Clique em **"Create bucket"**

**Opção B: Via SQL (se opção A falhar)**

Execute o arquivo `create_logos_bucket.sql` no SQL Editor

---

### **3️⃣ Verificar Instalação**

Execute este SQL para validar:

```sql
-- Verificar colunas adicionadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'estabelecimentos'
AND column_name IN (
    'logo_url', 'telefone', 'whatsapp', 'endereco', 'cep',
    'cidade', 'estado', 'bairro', 'complemento', 'descricao',
    'faixa_preco', 'instagram', 'facebook', 'site'
)
ORDER BY column_name;

-- Verificar bucket criado
SELECT * FROM storage.buckets WHERE id = 'logos';

-- Verificar políticas RLS do bucket
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%logos%';

-- Verificar políticas RLS da tabela
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'estabelecimentos';
```

---

## 🧪 Testar Funcionalidades

### **Teste 1: Upload de Logo**

1. Abra o app BusinessApp (mobile)
2. Faça login como **usuário principal**
3. Vá em **Perfil**
4. Role até "Dados do Estabelecimento"
5. Clique em **"Fazer Upload da Logo"**
6. Selecione uma imagem
7. Verifique se aparece o preview

### **Teste 2: Busca de CEP**

1. No formulário de perfil
2. Digite um CEP válido (ex: `01310-100`)
3. Aguarde carregar (ícone de loading)
4. Verifique se preencheu automaticamente:
   - Endereço
   - Bairro
   - Cidade
   - Estado

### **Teste 3: Salvar Dados**

1. Preencha todos os campos:
   - Nome do estabelecimento
   - Telefone
   - WhatsApp
   - Endereço completo
   - Descrição
   - Faixa de preço
   - Redes sociais
2. Clique em **"Salvar Alterações"**
3. Verifique mensagem de sucesso
4. Feche e reabra o perfil
5. Confirme que os dados foram salvos

---

## 🔍 Troubleshooting

### ❌ Erro: "permission denied for table estabelecimentos"
**Solução:** Execute novamente as políticas RLS do script `complete_seo_setup.sql`

### ❌ Erro: "bucket logos does not exist"
**Solução:** Crie o bucket via Dashboard (passo 2️⃣)

### ❌ Erro: "Failed to upload image"
**Solução:** 
1. Verifique se o bucket 'logos' existe
2. Verifique se é público
3. Verifique as políticas RLS do storage

### ❌ CEP não preenche automaticamente
**Solução:**
1. Verifique conexão com internet
2. Teste com outro CEP
3. API ViaCEP pode estar lenta (tente novamente)

---

## 📊 Estrutura Final

Após executar tudo, a tabela `estabelecimentos` terá:

```
estabelecimentos
├── id (UUID)
├── nome (TEXT) ✅ já existia
├── segmento (TEXT) ✅ já existia
├── tipo_documento (TEXT) ✅ já existia
├── numero_documento (TEXT) ✅ já existia
├── slug (TEXT) ✅ já existia
├── status (TEXT) ✅ já existia
├── created_at (TIMESTAMP) ✅ já existia
├── updated_at (TIMESTAMP) ✅ já existia
│
├── logo_url (TEXT) 🆕 URL da logo no storage
├── telefone (TEXT) 🆕 Telefone principal
├── whatsapp (TEXT) 🆕 WhatsApp Business
│
├── endereco (TEXT) 🆕 Rua/Av/Número
├── cep (TEXT) 🆕 CEP
├── cidade (TEXT) 🆕 Cidade
├── estado (TEXT) 🆕 UF
├── bairro (TEXT) 🆕 Bairro
├── complemento (TEXT) 🆕 Sala/Andar
│
├── descricao (TEXT) 🆕 Para SEO/Google
├── faixa_preco (TEXT) 🆕 $, $$, $$$, $$$$
│
├── instagram (TEXT) 🆕 @perfil
├── facebook (TEXT) 🆕 URL/nome
└── site (TEXT) 🆕 URL oficial
```

---

## ✅ Checklist de Validação

- [ ] Migration executada sem erros
- [ ] Bucket 'logos' criado e público
- [ ] Políticas RLS configuradas
- [ ] Upload de logo funcionando
- [ ] Busca de CEP funcionando
- [ ] Dados salvando corretamente
- [ ] Dados persistindo após recarregar
- [ ] Todas as colunas visíveis no banco

---

## 🎯 Próxima Fase: Implementar SEO

Após validar tudo acima:

1. **businessapp-web:** Buscar dados do estabelecimento
2. **businessapp-web:** Gerar Schema.org LocalBusiness
3. **businessapp-web:** Criar metadata dinâmica por slug
4. **businessapp-web:** Gerar sitemap.xml dinâmico

---

**Dúvidas?** Revise o script `complete_seo_setup.sql` - ele tem comentários detalhados em cada seção.
