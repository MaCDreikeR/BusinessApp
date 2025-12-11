-- ============================================================================
-- DIAGNÓSTICO COMPLETO: Políticas RLS e Autenticação
-- ============================================================================

-- 1. Verificar o usuário atual autenticado
SELECT 
  auth.uid() as meu_user_id,
  current_user as postgres_role;

-- 2. Verificar meu perfil na tabela usuarios
SELECT 
  id,
  email,
  role,
  estabelecimento_id
FROM usuarios
WHERE id = auth.uid();

-- 3. Verificar se sou realmente super_admin
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.role = 'super_admin'
    ) THEN 'SIM - Você é super_admin ✓'
    ELSE 'NÃO - Você NÃO é super_admin ✗'
  END as sou_super_admin;

-- 4. Testar a condição EXATA da política
SELECT 
  'Teste da condição USING' as tipo,
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'super_admin'
  ) as resultado;

-- 5. Contar agendamentos SEM filtro RLS (usando postgres role direto)
-- ATENÇÃO: Isso só funciona se você estiver usando postgres role com bypass RLS
-- ou se desabilitar RLS temporariamente

-- 6. Listar TODAS as políticas de agendamentos
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING definido'
    ELSE 'SEM USING'
  END as tem_using,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK definido'
    ELSE 'SEM WITH CHECK'
  END as tem_check
FROM pg_policies
WHERE tablename = 'agendamentos'
ORDER BY policyname;

-- 7. Verificar RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename = 'agendamentos';

-- 8. Tentar SELECT direto (vai respeitar RLS)
SELECT COUNT(*) as agendamentos_com_rls FROM agendamentos;

-- 9. Ver amostra de agendamentos (se conseguir)
SELECT 
  id,
  cliente,
  data_hora,
  estabelecimento_id
FROM agendamentos
LIMIT 3;

-- ============================================================================
-- SOLUÇÃO ALTERNATIVA: Se nada funcionar, desabilite RLS temporariamente
-- ============================================================================
-- CUIDADO: Só use em desenvolvimento/teste!
-- ALTER TABLE agendamentos DISABLE ROW LEVEL SECURITY;
-- 
-- Depois de testar, reabilite:
-- ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
