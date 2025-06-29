-- Adicionar as colunas faltantes na tabela estabelecimentos
ALTER TABLE estabelecimentos
ADD COLUMN segmento text,
ADD COLUMN usuario_id uuid REFERENCES usuarios(id);

-- Atualizar a coluna usuario_id para os estabelecimentos existentes
UPDATE estabelecimentos e
SET usuario_id = u.id
FROM usuarios u
WHERE u.is_principal = true
  AND e.usuario_id IS NULL; 