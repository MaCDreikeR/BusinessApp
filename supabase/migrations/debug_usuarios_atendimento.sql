-- SCRIPT DE DEBUG: Verificar usuários com faz_atendimento = true
-- Execute no SQL Editor do Supabase Studio para diagnosticar o problema

-- 1. Verificar todos os usuários e seus dados de atendimento
SELECT 
  id,
  nome_completo,
  email,
  estabelecimento_id,
  faz_atendimento,
  role,
  created_at
FROM usuarios 
ORDER BY estabelecimento_id, nome_completo;

-- 2. Verificar especificamente usuários que fazem atendimento
SELECT 
  id,
  nome_completo,
  email,
  estabelecimento_id,
  faz_atendimento,
  role
FROM usuarios 
WHERE faz_atendimento = true
ORDER BY estabelecimento_id, nome_completo;

-- 3. Contar usuários por estabelecimento que fazem atendimento
SELECT 
  estabelecimento_id,
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN faz_atendimento = true THEN 1 END) as usuarios_atendimento
FROM usuarios 
GROUP BY estabelecimento_id
ORDER BY estabelecimento_id;

-- 4. Verificar um estabelecimento específico (substitua pelo UUID do seu estabelecimento)
-- SELECT 
--   id,
--   nome_completo,
--   email,
--   faz_atendimento,
--   role
-- FROM usuarios 
-- WHERE estabelecimento_id = 'SEU_ESTABELECIMENTO_UUID_AQUI'
--   AND faz_atendimento = true;

-- 5. Testar a função RPC
-- SELECT * FROM get_usuarios_estabelecimento('SEU_ESTABELECIMENTO_UUID_AQUI');