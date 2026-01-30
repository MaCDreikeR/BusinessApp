-- 🧹 LIMPEZA DE DADOS INVÁLIDOS - Agendamentos

-- ============================================
-- PARTE 1: IDENTIFICAÇÃO
-- ============================================

-- 1️⃣ Verificar agendamentos com data_hora NULL
SELECT 
  id,
  cliente,
  data_hora,
  created_at,
  estabelecimento_id
FROM agendamentos
WHERE data_hora IS NULL;

-- 2️⃣ Verificar agendamentos com horario_termino inválido
SELECT 
  id,
  cliente,
  data_hora,
  horario_termino,
  estabelecimento_id
FROM agendamentos
WHERE horario_termino IS NULL 
  AND data_hora IS NOT NULL;

-- 3️⃣ Verificar agendamentos com data_hora em formato estranho
-- (PostgreSQL aceita, mas pode causar problemas)
SELECT 
  id,
  cliente,
  data_hora,
  TO_CHAR(data_hora, 'YYYY-MM-DD HH24:MI:SS') as data_formatada,
  estabelecimento_id
FROM agendamentos
WHERE data_hora < '2020-01-01'  -- Datas muito antigas
   OR data_hora > '2030-01-01'; -- Datas muito futuras

-- ============================================
-- PARTE 2: ESTATÍSTICAS
-- ============================================

-- Total de agendamentos
SELECT COUNT(*) as total FROM agendamentos;

-- Agendamentos com data_hora NULL
SELECT COUNT(*) as total_null FROM agendamentos WHERE data_hora IS NULL;

-- Agendamentos sem horario_termino
SELECT COUNT(*) as sem_termino FROM agendamentos WHERE horario_termino IS NULL;

-- Agendamentos por status
SELECT 
  status,
  COUNT(*) as total
FROM agendamentos
GROUP BY status
ORDER BY total DESC;

-- ============================================
-- PARTE 3: CORREÇÃO (CUIDADO!)
-- ============================================

-- ⚠️ BACKUP PRIMEIRO!
-- CREATE TABLE agendamentos_backup AS SELECT * FROM agendamentos;

-- Opção 1: DELETAR agendamentos com data_hora NULL
-- DELETE FROM agendamentos WHERE data_hora IS NULL;

-- Opção 2: CORRIGIR data_hora NULL com data de criação
-- UPDATE agendamentos 
-- SET data_hora = created_at 
-- WHERE data_hora IS NULL AND created_at IS NOT NULL;

-- Opção 3: DELETAR agendamentos muito antigos (teste/desenvolvimento)
-- DELETE FROM agendamentos 
-- WHERE data_hora < '2025-01-01' 
--   AND status IN ('cancelado', 'falta');

-- ============================================
-- PARTE 4: PREVENÇÃO FUTURA
-- ============================================

-- Adicionar constraint para evitar NULL no futuro
-- ALTER TABLE agendamentos 
-- ALTER COLUMN data_hora SET NOT NULL;

-- Adicionar default para horario_termino (opcional)
-- ALTER TABLE agendamentos 
-- ALTER COLUMN horario_termino SET DEFAULT '23:59:00';

-- ============================================
-- PARTE 5: VERIFICAÇÃO PÓS-CORREÇÃO
-- ============================================

-- Verificar se ainda há problemas
SELECT 
  COUNT(*) FILTER (WHERE data_hora IS NULL) as null_data_hora,
  COUNT(*) FILTER (WHERE horario_termino IS NULL) as null_termino,
  COUNT(*) FILTER (WHERE data_hora < '2020-01-01') as data_muito_antiga,
  COUNT(*) FILTER (WHERE data_hora > '2030-01-01') as data_muito_futura,
  COUNT(*) as total
FROM agendamentos;

-- ============================================
-- PARTE 6: AGENDAMENTOS DO DIA (TESTE)
-- ============================================

-- Verificar agendamentos de hoje
SELECT 
  id,
  cliente,
  TO_CHAR(data_hora, 'YYYY-MM-DD HH24:MI:SS') as data_hora_formatada,
  horario_termino::text as termino,
  status
FROM agendamentos
WHERE data_hora::date = CURRENT_DATE
ORDER BY data_hora;

-- ============================================
-- INSTRUÇÕES DE USO
-- ============================================

/*
1. IDENTIFICAÇÃO (sempre executar primeiro):
   - Execute as queries da PARTE 1 para ver os problemas
   - Execute as queries da PARTE 2 para estatísticas

2. BACKUP (OBRIGATÓRIO antes de qualquer DELETE/UPDATE):
   CREATE TABLE agendamentos_backup AS SELECT * FROM agendamentos;

3. CORREÇÃO (escolher uma opção da PARTE 3):
   - Opção 1: Deletar registros inválidos
   - Opção 2: Corrigir com created_at
   - Opção 3: Limpar dados de teste

4. PREVENÇÃO (executar após correção):
   - Adicionar constraints para evitar problema no futuro

5. VERIFICAÇÃO (confirmar sucesso):
   - Execute queries da PARTE 5 para confirmar

6. TESTE (validar app):
   - Execute query da PARTE 6
   - Abrir app e verificar agenda
*/

-- ============================================
-- EXEMPLO DE EXECUÇÃO SEGURA
-- ============================================

/*
-- Passo 1: Backup
CREATE TABLE agendamentos_backup_20260129 AS 
SELECT * FROM agendamentos;

-- Passo 2: Identificar
SELECT id, cliente, data_hora 
FROM agendamentos 
WHERE data_hora IS NULL;

-- Passo 3: Decisão
-- Se houver poucos registros (< 10), deletar:
DELETE FROM agendamentos WHERE data_hora IS NULL;

-- Se houver muitos, tentar corrigir:
UPDATE agendamentos 
SET data_hora = created_at 
WHERE data_hora IS NULL 
  AND created_at IS NOT NULL;

-- Passo 4: Verificar
SELECT COUNT(*) 
FROM agendamentos 
WHERE data_hora IS NULL;
-- Deve retornar 0

-- Passo 5: Prevenção
ALTER TABLE agendamentos 
ALTER COLUMN data_hora SET NOT NULL;

-- Passo 6: Teste no app
-- npm run android
-- Verificar se agenda funciona sem erros
*/
