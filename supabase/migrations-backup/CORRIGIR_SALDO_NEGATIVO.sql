-- ============================================
-- CORRIGIR SALDO NEGATIVO DE THÂMARA
-- ============================================

-- 1. VER SITUAÇÃO ATUAL
SELECT 
  u.nome_completo,
  cr.valor,
  cr.descricao,
  cr.data,
  cr.created_at
FROM comissoes_registros cr
JOIN usuarios u ON u.id = cr.usuario_id
WHERE cr.estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e'
  AND u.nome_completo = 'Thâmara'
ORDER BY cr.created_at;

-- 2. OPÇÃO A: DELETAR O REGISTRO NEGATIVO (ZERAR TUDO)
-- Execute este SQL se quiser começar do zero para Thâmara
DELETE FROM comissoes_registros 
WHERE estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e'
  AND usuario_id = (
    SELECT id FROM usuarios 
    WHERE nome_completo = 'Thâmara' 
    AND estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e'
  );

-- 3. OPÇÃO B: ADICIONAR COMISSÕES PARA COMPENSAR O NEGATIVO
-- Se você quer manter o histórico, adicione comissões para zerar
-- Exemplo: Se tem -R$ 2.750,00, adicione R$ 2.750,00
INSERT INTO comissoes_registros (
  usuario_id,
  estabelecimento_id,
  valor,
  descricao,
  data
)
SELECT 
  id as usuario_id,
  '86592b4b-9872-4d52-a6bb-6458d8f53f5e' as estabelecimento_id,
  2750.00 as valor,
  'Ajuste de saldo' as descricao,
  CURRENT_DATE as data
FROM usuarios
WHERE nome_completo = 'Thâmara'
  AND estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e';

-- 4. VERIFICAR RESULTADO
SELECT 
  u.nome_completo,
  SUM(cr.valor) as total_a_pagar,
  COUNT(cr.id) as num_registros
FROM usuarios u
LEFT JOIN comissoes_registros cr ON cr.usuario_id = u.id
WHERE u.estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e'
GROUP BY u.id, u.nome_completo
ORDER BY u.nome_completo;
