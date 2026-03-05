-- ============================================================================
-- SCRIPT PARA LIMPAR USUÁRIOS ÓRFÃOS EM AUTH.USERS
-- ============================================================================
-- Este script identifica usuários em auth.users que NÃO têm correspondente em public.usuarios

-- ============================================================================
-- PASSO 1: IDENTIFICAR USUÁRIOS ÓRFÃOS (apenas leitura - seguro visualizar)
-- ============================================================================
-- Mostra todos os usuários em auth.users que NÃO existem em public.usuarios

CREATE TEMP TABLE usuarios_orfaos AS
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE WHEN u.id IS NULL THEN '❌ ÓRFÃO' ELSE '✅ Vinculado' END AS status,
  u.id AS usuario_id
FROM auth.users au
LEFT JOIN public.usuarios u ON au.id = u.id
WHERE u.id IS NULL;

-- Mostrar os órfãos encontrados
SELECT * FROM usuarios_orfaos;

-- ============================================================================
-- PASSO 2: CONTAR ÓRFÃOS
-- ============================================================================
SELECT COUNT(*) AS total_orfaos FROM usuarios_orfaos;

-- ============================================================================
-- PASSO 3: DELETAR USUÁRIOS ÓRFÃOS (DESCOMENTE PARA EXECUTAR)
-- ============================================================================
-- ⚠️ ATENÇÃO: Descomente a linha abaixo APENAS se tiver certeza de que quer deletar!
-- ⚠️ Este comando é IRREVERSÍVEL!

-- DELETE FROM auth.users WHERE id IN (SELECT id FROM usuarios_orfaos);

-- ============================================================================
-- SE QUISER DELETAR, FAÇA POR EMAIL (mais seguro)
-- ============================================================================
-- Descomente a linha correspondente do email que quer deletar:

-- DELETE FROM auth.users WHERE email = 'thamaranborges@gmail.com';
-- DELETE FROM auth.users WHERE email = 'seu_email@example.com';

-- ============================================================================
-- PASSO 4: VERIFICAR APÓS DELETAR (execute depois de deletar)
-- ============================================================================
-- Execute isto para confirmar que o registro foi removido:

SELECT 
  au.email,
  CASE WHEN au.id IS NULL THEN '✅ DELETADO' ELSE '❌ Ainda existe' END AS resultado
FROM usuarios_orfaos uo
LEFT JOIN auth.users au ON uo.id = au.id;

-- ============================================================================
-- SCRIPT ALTERNATIVO: DELETAR MÚLTIPLOS ÓRFÃOS DE UMA VEZ
-- ============================================================================
-- Se tiver vários órfãos, execute isto (DESCOMENTE PRIMEIRO):

/*
DELETE FROM auth.users 
WHERE id IN (
  SELECT au.id
  FROM auth.users au
  LEFT JOIN public.usuarios u ON au.id = u.id
  WHERE u.id IS NULL
);
*/

-- ============================================================================
-- OBSERVAÇÕES IMPORTANTES
-- ============================================================================
-- ✅ É SEGURO deletar de auth.users se não houver dependências
-- ✅ Verificar antes: Execute PASSO 1 para ver quem são os órfãos
-- ❌ Não existem foreign keys fazendo referência a auth.users
-- ❌ Se deletar, não há volta - faça backup primeiro se necessário
--
-- FLUXO RECOMENDADO:
-- 1. Execute a PARTE 1 (SELECT) para ver os órfãos
-- 2. Confirme visualmente que são realmente órfãos
-- 3. Descomente uma das linhas DELETE (por email é mais seguro)
-- 4. Execute o DELETE
-- 5. Execute PASSO 4 para confirmar a remoção
