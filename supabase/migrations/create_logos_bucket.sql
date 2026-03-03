-- ============================================================================
-- SCRIPT ALTERNATIVO: Criar bucket via SQL (Supabase Dashboard)
-- ============================================================================
-- Este script cria o bucket 'logos' diretamente no banco de dados
-- Execute SOMENTE se não conseguir criar via Dashboard
-- ============================================================================

-- OPÇÃO 1: Via SQL (execute no SQL Editor do Supabase Dashboard)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'logos',
    'logos',
    true, -- Permite acesso público de leitura
    5242880, -- 5MB de limite por arquivo
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

-- Verificar se o bucket foi criado
SELECT * FROM storage.buckets WHERE id = 'logos';

-- ============================================================================
-- OPÇÃO 2: Via Supabase Dashboard (RECOMENDADO)
-- ============================================================================
-- 
-- 1. Acesse: https://supabase.com/dashboard/project/[seu-projeto-id]/storage/buckets
-- 2. Clique em "New bucket"
-- 3. Preencha:
--    - Name: logos
--    - Public bucket: ✅ Sim
--    - File size limit: 5 MB
--    - Allowed MIME types: image/png, image/jpeg, image/jpg, image/webp
-- 4. Clique em "Create bucket"
-- 
-- ============================================================================

-- ============================================================================
-- OPÇÃO 3: Via JavaScript (supabase-js no app mobile)
-- ============================================================================
-- 
-- import { supabase } from './lib/supabase';
-- 
-- const { data, error } = await supabase.storage.createBucket('logos', {
--   public: true,
--   fileSizeLimit: 5242880, // 5MB
--   allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
-- });
-- 
-- ============================================================================
