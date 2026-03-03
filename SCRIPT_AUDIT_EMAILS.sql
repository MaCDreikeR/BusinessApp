-- ============================================================================
-- SCRIPT DE AUDITORIA DE EMAILS NO BANCO DE DADOS
-- ============================================================================
-- Este script localiza um email específico em todas as tabelas do sistema
-- e mostra possíveis duplicações entre auth.users, usuarios e clientes

-- ============================================================================
-- PARTE 1: Procurar um email específico em todas as tabelas
-- ============================================================================
-- Substitua 'seu_email@example.com' pelo email que está sendo bloqueado

WITH email_buscado AS (
  SELECT 'seu_email@example.com'::text AS email_normalizado
  -- NOTA: O email será normalizado (LOWER + TRIM) para comparação consistente
),
resultados AS (
  SELECT 
    'auth.users' AS tabela,
    id::text AS registro_id,
    email,
    'Usuário de autenticação' AS descricao,
    created_at
  FROM auth.users
  WHERE LOWER(TRIM(email)) = (SELECT LOWER(TRIM(email_normalizado)) FROM email_buscado)

  UNION ALL

  SELECT 
    'public.usuarios' AS tabela,
    id::text AS registro_id,
    email,
    'Usuário profissional/admin' AS descricao,
    created_at
  FROM public.usuarios
  WHERE LOWER(TRIM(email)) = (SELECT LOWER(TRIM(email_normalizado)) FROM email_buscado)

  UNION ALL

  SELECT 
    'public.clientes' AS tabela,
    id::text AS registro_id,
    email,
    'Cliente (não afeta cadastro de usuário)' AS descricao,
    created_at
  FROM public.clientes
  WHERE email IS NOT NULL 
    AND LOWER(TRIM(email)) = (SELECT LOWER(TRIM(email_normalizado)) FROM email_buscado)
)
SELECT tabela, registro_id, email, descricao, created_at::text AS criado_em
FROM resultados
ORDER BY tabela, created_at DESC;

-- ============================================================================
-- PARTE 2: Mostrar quais emails estão DUPLICADOS entre as principais tabelas
-- ============================================================================
-- Isso ajuda a identificar se há contaminação de dados

WITH emails_auth AS (
  SELECT LOWER(TRIM(email)) AS email FROM auth.users WHERE email IS NOT NULL
),
emails_usuarios AS (
  SELECT LOWER(TRIM(email)) AS email, id FROM public.usuarios WHERE email IS NOT NULL
),
emails_clientes AS (
  SELECT LOWER(TRIM(email)) AS email, id FROM public.clientes WHERE email IS NOT NULL
),
todos_emails AS (
  SELECT DISTINCT COALESCE(ea.email, eu.email, ec.email) AS email
  FROM emails_auth ea
  FULL OUTER JOIN emails_usuarios eu ON ea.email = eu.email
  FULL OUTER JOIN emails_clientes ec ON ea.email = ec.email
)
SELECT 
  te.email AS email_normalizado,
  CASE WHEN EXISTS(SELECT 1 FROM emails_auth WHERE email = te.email) THEN 1 ELSE 0 END AS em_auth_users,
  CASE WHEN EXISTS(SELECT 1 FROM emails_usuarios WHERE email = te.email) THEN 1 ELSE 0 END AS em_usuarios,
  CASE WHEN EXISTS(SELECT 1 FROM emails_clientes WHERE email = te.email) THEN 1 ELSE 0 END AS em_clientes
FROM todos_emails te
ORDER BY email_normalizado;

-- ============================================================================
-- PARTE 3: Listar TODOS os emails em auth.users (para verificação rápida)
-- ============================================================================
-- Estes são os emails que BLOQUEARÃO um novo cadastro

SELECT 
  LOWER(TRIM(email)) AS email_normalizado,
  email AS email_original,
  id,
  created_at,
  '⚠️ BLOQUEARÁ novo cadastro com este email' AS aviso
FROM auth.users
ORDER BY email;

-- ============================================================================
-- OBSERVAÇÃO IMPORTANTE
-- ============================================================================
-- ✅ A tabela "clientes" NÃO bloqueia novo cadastro de usuário/estabelecimento
--    A função email_ja_cadastrado() só verifica:
--    - auth.users (obrigatório para Supabase Auth)
--    - public.usuarios (usuários profissionais/admin)
--
-- ❌ Se um email está em "clientes" mas o cadastro está sendo bloqueado,
--    significa que o email TAMBÉM está em auth.users ou usuarios
--
-- 🔍 Use a PARTE 1 acima substituindo 'seu_email@example.com' para investigar
