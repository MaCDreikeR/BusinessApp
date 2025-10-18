-- ============================================
-- DEBUG: Verificar usuários e comissões
-- ============================================

-- 1. Ver todos os usuários do estabelecimento
SELECT 
  id,
  nome_completo,
  email,
  role,
  faz_atendimento,
  estabelecimento_id
FROM usuarios
WHERE estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e'
ORDER BY nome_completo;

-- 2. Ver usuários que NÃO são super_admin (os que devem aparecer)
SELECT 
  id,
  nome_completo,
  email,
  role,
  faz_atendimento
FROM usuarios
WHERE estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e'
  AND role != 'super_admin'
ORDER BY nome_completo;

-- 3. Ver registros de comissões
SELECT 
  cr.id,
  u.nome_completo,
  cr.valor,
  cr.descricao,
  cr.data,
  cr.created_at
FROM comissoes_registros cr
JOIN usuarios u ON u.id = cr.usuario_id
WHERE cr.estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e'
ORDER BY cr.created_at DESC;

-- 4. Ver total de comissões por usuário (soma)
SELECT 
  u.nome_completo,
  SUM(cr.valor) as total_a_pagar,
  COUNT(cr.id) as num_registros
FROM usuarios u
LEFT JOIN comissoes_registros cr ON cr.usuario_id = u.id
WHERE u.estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e'
  AND u.role != 'super_admin'
GROUP BY u.id, u.nome_completo
ORDER BY u.nome_completo;
