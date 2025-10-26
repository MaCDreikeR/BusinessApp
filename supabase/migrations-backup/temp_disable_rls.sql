-- SCRIPT TEMPORÁRIO PARA DEBUG
-- Execute no SQL Editor do Supabase Studio

-- Desabilitar temporariamente o RLS na tabela usuarios
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- Depois de testar, lembre-se de reativar:
-- ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;