-- ============================================
-- VERIFICAR E CORRIGIR POLÍTICAS RLS
-- ============================================

-- 1. VER TODAS AS POLÍTICAS DA TABELA comissoes_registros
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'comissoes_registros';

-- 2. VER TODOS OS REGISTROS DE COMISSÕES (IGNORE RLS)
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

-- 3. LIMPAR REGISTROS NEGATIVOS (SE NECESSÁRIO)
-- Descomente a linha abaixo se quiser zerar tudo e começar do zero
-- DELETE FROM comissoes_registros WHERE estabelecimento_id = '86592b4b-9872-4d52-a6bb-6458d8f53f5e';

-- 4. RECRIAR POLÍTICAS (EXECUTE SE AS POLÍTICAS ESTIVEREM ERRADAS)
DROP POLICY IF EXISTS "Usuários podem ver comissões do seu estabelecimento" ON comissoes_registros;
DROP POLICY IF EXISTS "Usuários podem inserir comissões do seu estabelecimento" ON comissoes_registros;
DROP POLICY IF EXISTS "Usuários podem atualizar comissões do seu estabelecimento" ON comissoes_registros;
DROP POLICY IF EXISTS "Usuários podem deletar comissões do seu estabelecimento" ON comissoes_registros;

CREATE POLICY "Usuários podem ver comissões do seu estabelecimento"
  ON comissoes_registros FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.estabelecimento_id = comissoes_registros.estabelecimento_id
    )
  );

CREATE POLICY "Usuários podem inserir comissões do seu estabelecimento"
  ON comissoes_registros FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.estabelecimento_id = comissoes_registros.estabelecimento_id
    )
  );

CREATE POLICY "Usuários podem atualizar comissões do seu estabelecimento"
  ON comissoes_registros FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.estabelecimento_id = comissoes_registros.estabelecimento_id
    )
  );

CREATE POLICY "Usuários podem deletar comissões do seu estabelecimento"
  ON comissoes_registros FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.estabelecimento_id = comissoes_registros.estabelecimento_id
    )
  );

-- 5. VERIFICAR SE RLS ESTÁ ATIVO
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'comissoes_registros';

-- 6. TESTAR ACESSO (Como usuário autenticado)
-- Substitua 'SEU_USER_ID' pelo ID do usuário logado
SELECT 
  cr.*,
  u.nome_completo
FROM comissoes_registros cr
JOIN usuarios u ON u.id = cr.usuario_id
WHERE cr.estabelecimento_id = (
  SELECT estabelecimento_id 
  FROM usuarios 
  WHERE id = auth.uid()
);
