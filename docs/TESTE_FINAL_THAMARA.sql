-- ============================================
-- TESTE FINAL - AGENDAMENTO DA THAMARA
-- Execute ANTES de testar no app
-- ============================================

-- 1. Confirmar que Thamara tem cliente_id e telefone
SELECT 
  a.id as agendamento_id,
  a.cliente as nome_agendamento,
  a.cliente_id,
  c.id as cliente_id_real,
  c.nome as cliente_nome_real,
  c.telefone,
  c.estabelecimento_id,
  a.data_hora,
  a.status
FROM agendamentos a
LEFT JOIN clientes c ON c.id = a.cliente_id
WHERE a.cliente ILIKE '%Thamara%'
ORDER BY a.data_hora DESC
LIMIT 5;

-- Resultado Esperado:
-- ✅ cliente_id: deve ter UUID
-- ✅ cliente_id_real: deve ser igual ao cliente_id
-- ✅ telefone: deve mostrar (27) 99267-1104
-- ✅ estabelecimento_id: deve estar preenchido

-- 2. Verificar se o telefone está formatado corretamente
SELECT 
  id,
  nome,
  telefone,
  LENGTH(telefone) as tamanho_telefone,
  REGEXP_REPLACE(telefone, '[^0-9]', '', 'g') as telefone_apenas_numeros,
  LENGTH(REGEXP_REPLACE(telefone, '[^0-9]', '', 'g')) as qtd_digitos
FROM clientes
WHERE nome ILIKE '%Thamara%';

-- Resultado Esperado:
-- ✅ telefone: (27) 99267-1104
-- ✅ telefone_apenas_numeros: 27992671104
-- ✅ qtd_digitos: 11 (DDD + 9 dígitos)

-- 3. Simular o que o app vai fazer
SELECT 
  a.id,
  a.cliente,
  a.cliente_id,
  c.nome,
  c.telefone,
  c.foto_url,
  -- Simular a limpeza que o código faz
  REGEXP_REPLACE(c.telefone, '[^0-9]', '', 'g') as telefone_limpo,
  -- URL que será gerada
  'whatsapp://send?phone=55' || REGEXP_REPLACE(c.telefone, '[^0-9]', '', 'g') as url_whatsapp
FROM agendamentos a
INNER JOIN clientes c ON c.id = a.cliente_id
WHERE a.cliente ILIKE '%Thamara%'
ORDER BY a.data_hora DESC
LIMIT 1;

-- Resultado Esperado:
-- ✅ telefone_limpo: 27992671104
-- ✅ url_whatsapp: whatsapp://send?phone=5527992671104

-- 4. Contar quantos agendamentos foram vinculados
SELECT 
  COUNT(*) FILTER (WHERE cliente_id IS NOT NULL) as vinculados,
  COUNT(*) FILTER (WHERE cliente_id IS NULL) as nao_vinculados,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cliente_id IS NOT NULL) / COUNT(*), 2) as percentual
FROM agendamentos;

-- 5. Mostrar todos os clientes com telefone
SELECT 
  id,
  nome,
  telefone,
  CASE 
    WHEN telefone IS NULL THEN '❌ Sem telefone'
    WHEN LENGTH(REGEXP_REPLACE(telefone, '[^0-9]', '', 'g')) < 10 THEN '⚠️ Telefone inválido'
    ELSE '✅ Telefone OK'
  END as status_telefone
FROM clientes
ORDER BY nome
LIMIT 20;
