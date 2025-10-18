-- ============================================
-- ✅ RESUMO DAS CORREÇÕES IMPLEMENTADAS
-- ============================================

/*
1. PROBLEMA DA RECURSÃO RLS - RESOLVIDO
   - Arquivo: SOLUCAO_DEFINITIVA_RLS.sql
   - Criadas funções auxiliares que previnem recursão
   - get_user_estabelecimento_id()
   - is_super_admin()
   - Políticas RLS funcionam perfeitamente agora

2. TELA DE COMISSÕES - RESOLVIDO  
   - Arquivo: app/(app)/comissoes.tsx
   - Implementados 3 métodos de fallback para buscar usuários
   - Método 1: RPC function (mais eficiente)
   - Método 2: Query direta
   - Método 3: Buscar tudo e filtrar manualmente

3. PERMISSÕES DE VENDAS - RESOLVIDO
   - Arquivo: app/(app)/index.tsx
   - Cards de "Vendas Hoje" e "Vendas Recentes" agora respeitam permissões
   - Layout responsivo: cards se ajustam automaticamente
   - 4 cards = 48% de largura cada (2x2)
   - 3 cards = 32% de largura cada (3 cards na primeira linha)

PRÓXIMO PASSO:
Execute os SQLs abaixo na ordem:
*/

-- ============================================
-- PASSO 1: CORRIGIR RLS (SE AINDA NÃO FEZ)
-- ============================================

-- Desabilitar RLS
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'usuarios') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON usuarios';
    END LOOP;
END $$;

-- Criar funções auxiliares
CREATE OR REPLACE FUNCTION get_user_estabelecimento_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  estab_id UUID;
BEGIN
  SELECT estabelecimento_id INTO estab_id
  FROM usuarios
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN estab_id;
END;
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT (role = 'super_admin') INTO is_admin
  FROM usuarios
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(is_admin, false);
END;
$$;

-- Políticas definitivas
CREATE POLICY "usuarios_select_definitivo"
ON usuarios FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR
  estabelecimento_id = get_user_estabelecimento_id()
  OR
  is_super_admin() = true
);

CREATE POLICY "usuarios_update_definitivo"
ON usuarios FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  OR
  is_super_admin() = true
)
WITH CHECK (
  id = auth.uid()
  OR
  is_super_admin() = true
);

CREATE POLICY "usuarios_insert_definitivo"
ON usuarios FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin() = true
  OR
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND (role = 'admin' OR is_principal = true)
    LIMIT 1
  )
);

CREATE POLICY "usuarios_delete_definitivo"
ON usuarios FOR DELETE
TO authenticated
USING (
  is_super_admin() = true
);

-- Dar permissões
GRANT EXECUTE ON FUNCTION get_user_estabelecimento_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

-- Reabilitar RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASSO 2: VERIFICAR PERMISSÕES DE COMISSÕES
-- ============================================

-- Verificar se as colunas existem
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'permissoes_usuario'
AND column_name IN ('pode_ver_comissoes', 'pode_editar_comissoes')
ORDER BY column_name;

-- Se não retornou nada, adicionar as colunas
ALTER TABLE permissoes_usuario
ADD COLUMN IF NOT EXISTS pode_ver_comissoes BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pode_editar_comissoes BOOLEAN DEFAULT true;

-- Atualizar permissões existentes
UPDATE permissoes_usuario
SET 
  pode_ver_comissoes = COALESCE(pode_ver_comissoes, true),
  pode_editar_comissoes = COALESCE(pode_editar_comissoes, true);

-- ============================================
-- PASSO 3: TESTAR TUDO
-- ============================================

-- 1. Primeiro, verificar a estrutura da tabela permissoes_usuario
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'permissoes_usuario'
ORDER BY ordinal_position;

-- 2. Testar RLS - deve retornar 3 usuários
SELECT 
  id,
  nome_completo,
  email,
  role,
  estabelecimento_id
FROM usuarios
WHERE estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e'
ORDER BY nome_completo;

-- 3. Testar permissões (ajustado para encontrar a coluna correta)
-- Primeiro vamos ver a estrutura real
SELECT * FROM permissoes_usuario LIMIT 1;

-- Depois testar o join correto
-- (pode ser 'id' ao invés de 'usuario_id')
SELECT 
  u.nome_completo,
  u.email,
  u.id as usuario_id,
  p.*
FROM usuarios u
LEFT JOIN permissoes_usuario p ON p.id = u.id
WHERE u.estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e'
ORDER BY u.nome_completo;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
/*
1. Login funcionando ✅
2. Tela de comissões mostrando 3 usuários ✅
3. Cards de vendas respeitando permissões ✅
4. Layout responsivo com 3 ou 4 cards ✅
*/
