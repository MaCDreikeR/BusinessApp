-- ============================================
-- SCRIPT PARA CORRIGIR VALORES DOS PACOTES
-- ============================================
-- Este script corrige o campo "valor" na tabela "pacotes"
-- O campo estava gravando a SOMA dos serviços/produtos
-- Mas deveria gravar o VALOR FINAL (soma - desconto)
-- ============================================

-- PASSO 1: Verificar os pacotes com problema
-- (onde valor não está correto em relação ao desconto)
SELECT 
    p.id,
    p.nome,
    p.valor AS valor_atual_no_banco,
    p.desconto,
    
    -- Calcular soma real dos serviços
    COALESCE((
        SELECT SUM(s.preco * ps.quantidade)
        FROM pacotes_servicos ps
        JOIN servicos s ON s.id = ps.servico_id
        WHERE ps.pacote_id = p.id
    ), 0) AS soma_servicos,
    
    -- Calcular soma real dos produtos
    COALESCE((
        SELECT SUM(pr.preco * pp.quantidade)
        FROM pacotes_produtos pp
        JOIN produtos pr ON pr.id = pp.produto_id
        WHERE pp.pacote_id = p.id
    ), 0) AS soma_produtos,
    
    -- Calcular valor correto (soma total - desconto)
    (
        COALESCE((
            SELECT SUM(s.preco * ps.quantidade)
            FROM pacotes_servicos ps
            JOIN servicos s ON s.id = ps.servico_id
            WHERE ps.pacote_id = p.id
        ), 0) +
        COALESCE((
            SELECT SUM(pr.preco * pp.quantidade)
            FROM pacotes_produtos pp
            JOIN produtos pr ON pr.id = pp.produto_id
            WHERE pp.pacote_id = p.id
        ), 0)
    ) - p.desconto AS valor_correto,
    
    -- Diferença
    p.valor - (
        (
            COALESCE((
                SELECT SUM(s.preco * ps.quantidade)
                FROM pacotes_servicos ps
                JOIN servicos s ON s.id = ps.servico_id
                WHERE ps.pacote_id = p.id
            ), 0) +
            COALESCE((
                SELECT SUM(pr.preco * pp.quantidade)
                FROM pacotes_produtos pp
                JOIN produtos pr ON pr.id = pp.produto_id
                WHERE pp.pacote_id = p.id
            ), 0)
        ) - p.desconto
    ) AS diferenca
FROM pacotes p
ORDER BY p.nome;

-- ============================================
-- PASSO 2: BACKUP ANTES DE CORRIGIR (IMPORTANTE!)
-- ============================================
-- Criar tabela de backup com os valores atuais
CREATE TABLE IF NOT EXISTS pacotes_backup_antes_correcao AS
SELECT * FROM pacotes;

-- ============================================
-- PASSO 3: CORRIGIR OS VALORES
-- ============================================
-- Atualizar o campo "valor" para o valor correto (soma - desconto)
UPDATE pacotes p
SET valor = (
    -- Soma dos serviços
    COALESCE((
        SELECT SUM(s.preco * ps.quantidade)
        FROM pacotes_servicos ps
        JOIN servicos s ON s.id = ps.servico_id
        WHERE ps.pacote_id = p.id
    ), 0) +
    -- Soma dos produtos
    COALESCE((
        SELECT SUM(pr.preco * pp.quantidade)
        FROM pacotes_produtos pp
        JOIN produtos pr ON pr.id = pp.produto_id
        WHERE pp.pacote_id = p.id
    ), 0)
    -- Menos o desconto
) - p.desconto
WHERE p.id IN (
    -- Apenas pacotes onde o valor está incorreto
    SELECT id FROM pacotes
);

-- ============================================
-- PASSO 4: VERIFICAR RESULTADO
-- ============================================
SELECT 
    p.id,
    p.nome,
    p.valor AS valor_final_corrigido,
    p.desconto,
    
    -- Soma dos itens
    (
        COALESCE((
            SELECT SUM(s.preco * ps.quantidade)
            FROM pacotes_servicos ps
            JOIN servicos s ON s.id = ps.servico_id
            WHERE ps.pacote_id = p.id
        ), 0) +
        COALESCE((
            SELECT SUM(pr.preco * pp.quantidade)
            FROM pacotes_produtos pp
            JOIN produtos pr ON pr.id = pp.produto_id
            WHERE pp.pacote_id = p.id
        ), 0)
    ) AS soma_total_itens,
    
    -- Verificação
    CASE 
        WHEN p.valor = (
            (
                COALESCE((
                    SELECT SUM(s.preco * ps.quantidade)
                    FROM pacotes_servicos ps
                    JOIN servicos s ON s.id = ps.servico_id
                    WHERE ps.pacote_id = p.id
                ), 0) +
                COALESCE((
                    SELECT SUM(pr.preco * pp.quantidade)
                    FROM pacotes_produtos pp
                    JOIN produtos pr ON pr.id = pp.produto_id
                    WHERE pp.pacote_id = p.id
                ), 0)
            ) - p.desconto
        ) THEN '✅ CORRETO'
        ELSE '❌ AINDA INCORRETO'
    END AS status
FROM pacotes p
ORDER BY p.nome;

-- ============================================
-- PASSO 5: SE PRECISAR REVERTER
-- ============================================
-- APENAS EM CASO DE ERRO! Use este comando para reverter:
-- UPDATE pacotes p
-- SET valor = b.valor
-- FROM pacotes_backup_antes_correcao b
-- WHERE p.id = b.id;
