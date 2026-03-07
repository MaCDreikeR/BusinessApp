-- Drop da função antiga
DROP FUNCTION IF EXISTS public.get_produtos_baixo_estoque(uuid);

-- Recriar função com assinatura correta
CREATE OR REPLACE FUNCTION public.get_produtos_baixo_estoque(p_estabelecimento_id uuid)
RETURNS TABLE (
    id uuid,
    nome text,
    quantidade integer,
    quantidade_minima integer,
    categoria text,
    codigo text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.nome,
        p.quantidade_estoque AS quantidade,
        p.quantidade_minima,
        c.nome AS categoria,
        p.codigo
    FROM 
        public.produtos AS p
    LEFT JOIN 
        public.categorias AS c ON p.categoria_id = c.id
    WHERE 
        p.estabelecimento_id = p_estabelecimento_id
        AND p.quantidade_estoque <= p.quantidade_minima
    ORDER BY 
        p.quantidade_estoque ASC, p.nome ASC
    LIMIT 10;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.get_produtos_baixo_estoque(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_produtos_baixo_estoque(uuid) TO service_role;

-- Comentário
COMMENT ON FUNCTION public.get_produtos_baixo_estoque(uuid) IS 
'Retorna produtos com estoque baixo (quantidade <= quantidade_minima) para um estabelecimento específico';
