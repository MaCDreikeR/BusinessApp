-- Execute este SQL no Supabase Studio para criar as políticas RLS

-- Políticas para a tabela comandas
CREATE POLICY "usuarios_podem_ver_comandas_estabelecimento" ON comandas
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE usuarios.id = auth.uid() 
    AND usuarios.estabelecimento_id = comandas.estabelecimento_id
  )
);

CREATE POLICY "usuarios_podem_inserir_comandas_estabelecimento" ON comandas
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE usuarios.id = auth.uid() 
    AND usuarios.estabelecimento_id = comandas.estabelecimento_id
  )
);

CREATE POLICY "usuarios_podem_atualizar_comandas_estabelecimento" ON comandas
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE usuarios.id = auth.uid() 
    AND usuarios.estabelecimento_id = comandas.estabelecimento_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE usuarios.id = auth.uid() 
    AND usuarios.estabelecimento_id = comandas.estabelecimento_id
  )
);

CREATE POLICY "usuarios_podem_excluir_comandas_estabelecimento" ON comandas
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE usuarios.id = auth.uid() 
    AND usuarios.estabelecimento_id = comandas.estabelecimento_id
  )
);

-- Políticas para a tabela comandas_itens
CREATE POLICY "usuarios_podem_ver_itens_comandas_estabelecimento" ON comandas_itens
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE usuarios.id = auth.uid() 
    AND usuarios.estabelecimento_id = comandas_itens.estabelecimento_id
  )
);

CREATE POLICY "usuarios_podem_inserir_itens_comandas_estabelecimento" ON comandas_itens
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE usuarios.id = auth.uid() 
    AND usuarios.estabelecimento_id = comandas_itens.estabelecimento_id
  )
);

CREATE POLICY "usuarios_podem_atualizar_itens_comandas_estabelecimento" ON comandas_itens
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE usuarios.id = auth.uid() 
    AND usuarios.estabelecimento_id = comandas_itens.estabelecimento_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE usuarios.id = auth.uid() 
    AND usuarios.estabelecimento_id = comandas_itens.estabelecimento_id
  )
);

CREATE POLICY "usuarios_podem_excluir_itens_comandas_estabelecimento" ON comandas_itens
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE usuarios.id = auth.uid() 
    AND usuarios.estabelecimento_id = comandas_itens.estabelecimento_id
  )
);