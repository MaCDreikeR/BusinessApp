-- Migration: Adicionar campos para SEO e informações completas do estabelecimento
-- Data: 2026-02-09
-- Descrição: Campos necessários para Schema.org LocalBusiness e SEO

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
ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS faixa_preco TEXT CHECK (faixa_preco IN ('$', '$$', '$$$', '$$$$'));

-- Adicionar campos de redes sociais
ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS site TEXT;

-- Comentários para documentação
COMMENT ON COLUMN estabelecimentos.logo_url IS 'URL pública da logo do estabelecimento';
COMMENT ON COLUMN estabelecimentos.telefone IS 'Telefone principal de contato';
COMMENT ON COLUMN estabelecimentos.whatsapp IS 'Número do WhatsApp Business';
COMMENT ON COLUMN estabelecimentos.descricao IS 'Descrição do estabelecimento para SEO (Google)';
COMMENT ON COLUMN estabelecimentos.faixa_preco IS 'Faixa de preço: $ (econômico), $$ (moderado), $$$ (alto), $$$$ (premium)';
COMMENT ON COLUMN estabelecimentos.instagram IS 'Perfil do Instagram (com ou sem @)';
COMMENT ON COLUMN estabelecimentos.facebook IS 'URL ou nome da página do Facebook';
COMMENT ON COLUMN estabelecimentos.site IS 'URL do site oficial';

-- Nota: Horários de funcionamento já existem na tabela 'configuracoes':
-- - horario_inicio
-- - horario_fim
-- - dias_semana_bloqueados (dias que NÃO funciona)
-- - horario_intervalo_inicio (almoço)
-- - horario_intervalo_fim (almoço)
