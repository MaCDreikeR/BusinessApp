-- FUNÇÃO RPC PARA BUSCAR AGENDAMENTOS COM INFORMAÇÕES DO USUÁRIO
-- Execute no SQL Editor do Supabase Studio

CREATE OR REPLACE FUNCTION get_proximos_agendamentos(p_estabelecimento_id uuid, p_limit integer DEFAULT 5)
RETURNS TABLE (
  id uuid,
  cliente text,
  telefone text,
  data_hora timestamp with time zone,
  servicos jsonb,
  valor_total numeric,
  observacoes text,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  estabelecimento_id uuid,
  usuario_id uuid,
  usuario_nome text
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se o usuário logado pertence ao estabelecimento ou é super_admin
  IF NOT EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.id = auth.uid() 
    AND (
      u.estabelecimento_id = p_estabelecimento_id
      OR u.role = 'super_admin'
    )
  ) THEN
    RAISE EXCEPTION 'Acesso negado ao estabelecimento';
  END IF;

  -- Retornar agendamentos com informações do usuário
  RETURN QUERY
  SELECT 
    a.id,
    a.cliente,
    a.telefone,
    a.data_hora,
    a.servicos,
    a.valor_total,
    a.observacoes,
    a.status,
    a.created_at,
    a.updated_at,
    a.estabelecimento_id,
    a.usuario_id,
    COALESCE(u.nome_completo, 'Usuário não definido') as usuario_nome
  FROM agendamentos a
  LEFT JOIN usuarios u ON a.usuario_id = u.id
  WHERE a.estabelecimento_id = p_estabelecimento_id
    AND a.data_hora >= NOW()
  ORDER BY a.data_hora ASC
  LIMIT p_limit;
END;
$$;