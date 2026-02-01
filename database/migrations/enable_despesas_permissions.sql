-- ============================================
-- CONFIGURAÇÃO DE PERMISSÕES: DESPESAS
-- ============================================
-- Garante que todos os usuários tenham acesso
-- ao módulo de Despesas
-- ============================================

-- 1. Adicionar coluna se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usuarios' AND column_name = 'pode_ver_despesas'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN pode_ver_despesas BOOLEAN DEFAULT true;
    RAISE NOTICE 'Coluna pode_ver_despesas criada com sucesso!';
  ELSE
    RAISE NOTICE 'Coluna pode_ver_despesas já existe.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usuarios' AND column_name = 'pode_editar_despesas'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN pode_editar_despesas BOOLEAN DEFAULT true;
    RAISE NOTICE 'Coluna pode_editar_despesas criada com sucesso!';
  ELSE
    RAISE NOTICE 'Coluna pode_editar_despesas já existe.';
  END IF;
END $$;

-- 2. Atualizar usuários existentes
UPDATE usuarios 
SET 
  pode_ver_despesas = true,
  pode_editar_despesas = CASE 
    WHEN role IN ('admin', 'super_admin') THEN true 
    ELSE false 
  END
WHERE pode_ver_despesas IS NULL;

-- 3. Verificar resultado
SELECT 
  role,
  COUNT(*) as total,
  SUM(CASE WHEN pode_ver_despesas THEN 1 ELSE 0 END) as com_acesso_ver,
  SUM(CASE WHEN pode_editar_despesas THEN 1 ELSE 0 END) as com_acesso_editar
FROM usuarios 
GROUP BY role
ORDER BY role;

-- ============================================
-- RESULTADO ESPERADO:
-- Todos os usuários devem ter pode_ver_despesas = true
-- Admins devem ter pode_editar_despesas = true
-- ============================================
