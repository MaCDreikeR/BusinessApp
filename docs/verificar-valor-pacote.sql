-- Script para verificar valores dos pacotes
-- Execute no Supabase SQL Editor

-- Verificar pacote "Perna+axila"
SELECT 
  p.id,
  p.nome,
  p.descricao,
  p.valor AS valor_final_pacote,
  p.desconto AS percentual_desconto,
  p.duracao_total,
  p.estabelecimento_id,
  
  -- Soma dos serviços do pacote
  (
    SELECT SUM(s.preco * ps.quantidade)
    FROM pacotes_servicos ps
    JOIN servicos s ON s.id = ps.servico_id
    WHERE ps.pacote_id = p.id
  ) AS soma_servicos,
  
  -- Detalhes dos serviços
  (
    SELECT json_agg(
      json_build_object(
        'nome', s.nome,
        'preco', s.preco,
        'quantidade', ps.quantidade,
        'duracao', s.duracao,
        'subtotal', s.preco * ps.quantidade
      )
    )
    FROM pacotes_servicos ps
    JOIN servicos s ON s.id = ps.servico_id
    WHERE ps.pacote_id = p.id
  ) AS servicos_detalhados

FROM pacotes p
WHERE p.nome LIKE '%Perna%axila%'
ORDER BY p.created_at DESC;

-- Se o campo 'valor' estiver NULL ou incorreto, você precisa atualizá-lo:
-- UPDATE pacotes 
-- SET valor = 130.00  -- Valor com desconto aplicado
-- WHERE nome = 'Perna+axila';

-- Para calcular automaticamente o valor com desconto:
-- UPDATE pacotes p
-- SET valor = (
--   SELECT SUM(s.preco * ps.quantidade) * (1 - p.desconto / 100.0)
--   FROM pacotes_servicos ps
--   JOIN servicos s ON s.id = ps.servico_id
--   WHERE ps.pacote_id = p.id
-- )
-- WHERE id = 'ID_DO_PACOTE';
