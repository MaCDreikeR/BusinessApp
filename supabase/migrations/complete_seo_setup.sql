-- ============================================================================
-- Migration: Setup completo para SEO e informações do estabelecimento
-- Data: 2026-02-09
-- Descrição: Adiciona campos, cria bucket de logos e configura RLS
-- ============================================================================

-- PARTE 1: ADICIONAR COLUNAS À TABELA EXISTENTE
-- ============================================================================

-- Verifica se a tabela existe antes de alterar
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'estabelecimentos') THEN
        
        -- Adicionar campos de imagem e contato
        ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS logo_url TEXT;
        ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS telefone TEXT;
        ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS whatsapp TEXT;

        -- Adicionar campos de endereço completo
        ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS endereco TEXT;
        ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS cep TEXT;
        ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS cidade TEXT;
        ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS estado TEXT;
        ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS bairro TEXT;
        ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS complemento TEXT;

        -- Adicionar campos para SEO e categorização
        ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS descricao TEXT;
        ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS faixa_preco TEXT;

        -- Adicionar campos de redes sociais
        ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS instagram TEXT;
        ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS facebook TEXT;
        ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS site TEXT;

        RAISE NOTICE 'Colunas adicionadas com sucesso à tabela estabelecimentos';
    ELSE
        RAISE EXCEPTION 'Tabela estabelecimentos não existe. Verifique a estrutura do banco.';
    END IF;
END $$;

-- Adicionar constraint para faixa_preco
ALTER TABLE estabelecimentos DROP CONSTRAINT IF EXISTS check_faixa_preco;
ALTER TABLE estabelecimentos ADD CONSTRAINT check_faixa_preco 
    CHECK (faixa_preco IS NULL OR faixa_preco IN ('$', '$$', '$$$', '$$$$'));

-- Comentários para documentação
COMMENT ON COLUMN estabelecimentos.logo_url IS 'URL pública da logo do estabelecimento (Supabase Storage)';
COMMENT ON COLUMN estabelecimentos.telefone IS 'Telefone principal de contato (somente números)';
COMMENT ON COLUMN estabelecimentos.whatsapp IS 'Número do WhatsApp Business (somente números)';
COMMENT ON COLUMN estabelecimentos.endereco IS 'Endereço completo (Rua, Av, número)';
COMMENT ON COLUMN estabelecimentos.cep IS 'CEP do estabelecimento (somente números)';
COMMENT ON COLUMN estabelecimentos.cidade IS 'Cidade onde está localizado';
COMMENT ON COLUMN estabelecimentos.estado IS 'Sigla do estado (UF)';
COMMENT ON COLUMN estabelecimentos.bairro IS 'Bairro do estabelecimento';
COMMENT ON COLUMN estabelecimentos.complemento IS 'Complemento do endereço (sala, andar, etc)';
COMMENT ON COLUMN estabelecimentos.descricao IS 'Descrição do estabelecimento para SEO (Google Search Results)';
COMMENT ON COLUMN estabelecimentos.faixa_preco IS 'Faixa de preço para Google: $ (econômico), $$ (moderado), $$$ (alto), $$$$ (premium)';
COMMENT ON COLUMN estabelecimentos.instagram IS 'Perfil do Instagram (com ou sem @)';
COMMENT ON COLUMN estabelecimentos.facebook IS 'URL ou nome da página do Facebook';
COMMENT ON COLUMN estabelecimentos.site IS 'URL do site oficial do estabelecimento';

-- ============================================================================
-- PARTE 2: CRIAR BUCKET DE STORAGE PARA LOGOS
-- ============================================================================

-- Criar bucket 'logos' se não existir (via SQL não é possível diretamente)
-- Esta parte precisa ser feita via Supabase Dashboard OU via API
-- Comando equivalente (executar via Dashboard ou supabase-js):
-- 
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('logos', 'logos', true)
-- ON CONFLICT (id) DO NOTHING;

-- Nota: Execute este comando SQL diretamente ou use o Dashboard:
-- Storage → New Bucket → Name: "logos" → Public: true

-- ============================================================================
-- PARTE 3: POLÍTICAS RLS PARA BUCKET 'LOGOS'
-- ============================================================================

-- Política: Permitir leitura pública de logos
DROP POLICY IF EXISTS "Public read access for logos" ON storage.objects;
CREATE POLICY "Public read access for logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- Política: Permitir upload de logos para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

-- Política: Permitir atualização de logos para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos')
WITH CHECK (bucket_id = 'logos');

-- Política: Permitir deleção de logos para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can delete logos" ON storage.objects;
CREATE POLICY "Authenticated users can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos');

-- ============================================================================
-- PARTE 4: POLÍTICAS RLS PARA TABELA ESTABELECIMENTOS
-- ============================================================================

-- Habilitar RLS na tabela estabelecimentos (se ainda não estiver habilitado)
ALTER TABLE estabelecimentos ENABLE ROW LEVEL SECURITY;

-- Política: Permitir leitura pública de estabelecimentos ativos
DROP POLICY IF EXISTS "Public read access for active estabelecimentos" ON estabelecimentos;
CREATE POLICY "Public read access for active estabelecimentos"
ON estabelecimentos FOR SELECT
TO public
USING (status = 'ativa');

-- Política: Usuários autenticados podem ver seus estabelecimentos
DROP POLICY IF EXISTS "Users can view their own estabelecimento" ON estabelecimentos;
CREATE POLICY "Users can view their own estabelecimento"
ON estabelecimentos FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT estabelecimento_id 
        FROM usuarios 
        WHERE id = auth.uid()
    )
);

-- Política: Usuários principais podem atualizar seu estabelecimento
DROP POLICY IF EXISTS "Principal users can update their estabelecimento" ON estabelecimentos;
CREATE POLICY "Principal users can update their estabelecimento"
ON estabelecimentos FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT estabelecimento_id 
        FROM usuarios 
        WHERE id = auth.uid() 
        AND is_principal = true
    )
)
WITH CHECK (
    id IN (
        SELECT estabelecimento_id 
        FROM usuarios 
        WHERE id = auth.uid() 
        AND is_principal = true
    )
);

-- Política: Super admins podem ver e editar tudo
DROP POLICY IF EXISTS "Super admins have full access" ON estabelecimentos;
CREATE POLICY "Super admins have full access"
ON estabelecimentos FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM usuarios 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    )
);

-- ============================================================================
-- PARTE 5: ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índice para busca por slug (usado no businessapp-web)
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_slug ON estabelecimentos(slug);

-- Índice para busca por cidade (futuro: busca por localização)
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_cidade ON estabelecimentos(cidade) WHERE cidade IS NOT NULL;

-- Índice para busca por estado
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_estado ON estabelecimentos(estado) WHERE estado IS NOT NULL;

-- Índice para busca por status
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_status ON estabelecimentos(status);

-- ============================================================================
-- PARTE 6: VERIFICAÇÃO E RELATÓRIO
-- ============================================================================

DO $$
DECLARE
    total_estabelecimentos INTEGER;
    estabelecimentos_com_logo INTEGER;
    estabelecimentos_com_endereco INTEGER;
BEGIN
    -- Contar totais
    SELECT COUNT(*) INTO total_estabelecimentos FROM estabelecimentos;
    SELECT COUNT(*) INTO estabelecimentos_com_logo FROM estabelecimentos WHERE logo_url IS NOT NULL;
    SELECT COUNT(*) INTO estabelecimentos_com_endereco FROM estabelecimentos WHERE endereco IS NOT NULL;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA COM SUCESSO';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Total de estabelecimentos: %', total_estabelecimentos;
    RAISE NOTICE 'Com logo cadastrada: %', estabelecimentos_com_logo;
    RAISE NOTICE 'Com endereço cadastrado: %', estabelecimentos_com_endereco;
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Próximos passos:';
    RAISE NOTICE '1. Criar bucket "logos" no Supabase Dashboard (se ainda não existir)';
    RAISE NOTICE '2. Testar upload de logo no app mobile';
    RAISE NOTICE '3. Preencher dados SEO no perfil do usuário principal';
    RAISE NOTICE '==========================================';
END $$;
