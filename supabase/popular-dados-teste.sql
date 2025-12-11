-- Script para popular dados de teste
-- ATENÇÃO: Execute apenas em ambiente de DESENVOLVIMENTO/TESTE!

-- Variáveis (ajuste conforme necessário)
DO $$
DECLARE
  estabelecimento_teste_id UUID;
  usuario_teste_id UUID;
BEGIN
  -- 1. Pegar o primeiro estabelecimento ativo (ou criar um de teste)
  SELECT id INTO estabelecimento_teste_id 
  FROM estabelecimentos 
  WHERE status = 'ativa' 
  LIMIT 1;

  -- Se não houver estabelecimento, criar um de teste
  IF estabelecimento_teste_id IS NULL THEN
    INSERT INTO estabelecimentos (nome, segmento, tipo_documento, numero_documento, status)
    VALUES ('Salão de Beleza Teste', 'beleza', 'CNPJ', '12.345.678/0001-90', 'ativa')
    RETURNING id INTO estabelecimento_teste_id;
    
    RAISE NOTICE 'Estabelecimento de teste criado: %', estabelecimento_teste_id;
  ELSE
    RAISE NOTICE 'Usando estabelecimento existente: %', estabelecimento_teste_id;
  END IF;

  -- 2. Inserir clientes de teste
  INSERT INTO clientes (nome, telefone, email, cpf, data_nascimento, cidade, estado, estabelecimento_id, saldo_crediario)
  VALUES 
    ('Maria Silva', '(11) 98765-4321', 'maria.silva@email.com', '123.456.789-00', '1985-03-15', 'São Paulo', 'SP', estabelecimento_teste_id, 0),
    ('João Santos', '(11) 98765-4322', 'joao.santos@email.com', '234.567.890-11', '1990-07-22', 'São Paulo', 'SP', estabelecimento_teste_id, 50.00),
    ('Ana Costa', '(11) 98765-4323', 'ana.costa@email.com', '345.678.901-22', '1988-11-08', 'Campinas', 'SP', estabelecimento_teste_id, 0),
    ('Pedro Oliveira', '(11) 98765-4324', 'pedro.oliveira@email.com', '456.789.012-33', '1992-05-30', 'São Paulo', 'SP', estabelecimento_teste_id, 100.00),
    ('Carla Mendes', '(11) 98765-4325', 'carla.mendes@email.com', '567.890.123-44', '1987-09-12', 'Santos', 'SP', estabelecimento_teste_id, 0),
    ('Ricardo Lima', '(11) 98765-4326', 'ricardo.lima@email.com', '678.901.234-55', '1995-01-25', 'São Paulo', 'SP', estabelecimento_teste_id, 25.50),
    ('Fernanda Rocha', '(11) 98765-4327', 'fernanda.rocha@email.com', '789.012.345-66', '1991-12-03', 'São Paulo', 'SP', estabelecimento_teste_id, 0),
    ('Lucas Alves', '(11) 98765-4328', 'lucas.alves@email.com', '890.123.456-77', '1989-06-18', 'Guarulhos', 'SP', estabelecimento_teste_id, 75.00),
    ('Juliana Martins', '(11) 98765-4329', 'juliana.martins@email.com', '901.234.567-88', '1993-04-07', 'São Paulo', 'SP', estabelecimento_teste_id, 0),
    ('Bruno Ferreira', '(11) 98765-4330', 'bruno.ferreira@email.com', '012.345.678-99', '1986-08-14', 'São Bernardo', 'SP', estabelecimento_teste_id, 150.00)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '10 clientes de teste inseridos';

  -- 3. Inserir categorias de produtos (se não existirem)
  INSERT INTO categorias_produtos (nome, estabelecimento_id)
  VALUES 
    ('Cosméticos', estabelecimento_teste_id),
    ('Acessórios', estabelecimento_teste_id),
    ('Equipamentos', estabelecimento_teste_id)
  ON CONFLICT DO NOTHING;

  -- 4. Inserir produtos de teste
  INSERT INTO produtos (nome, descricao, quantidade_estoque, preco, categoria_id, estabelecimento_id, quantidade_minima)
  SELECT 
    nome, descricao, quantidade_estoque, preco, 
    (SELECT id FROM categorias_produtos WHERE estabelecimento_id = estabelecimento_teste_id LIMIT 1),
    estabelecimento_teste_id,
    quantidade_minima
  FROM (VALUES
    ('Shampoo Hidratante 500ml', 'Shampoo profissional para cabelos secos', 25, 35.90, 5),
    ('Condicionador Reparador 500ml', 'Condicionador para cabelos danificados', 20, 38.50, 5),
    ('Máscara Capilar Premium', 'Tratamento intensivo 1kg', 15, 89.90, 3),
    ('Esmalte Vermelho', 'Esmalte de longa duração', 50, 12.90, 10),
    ('Removedor de Esmalte', 'Sem acetona 100ml', 30, 8.50, 10),
    ('Cera Modeladora', 'Fixação forte 100g', 18, 25.00, 5),
    ('Spray Fixador', 'Fixação extra forte 400ml', 22, 32.00, 5),
    ('Óleo Capilar Argan', 'Óleo nutritivo 60ml', 28, 45.00, 5),
    ('Tintura Castanho Escuro', 'Coloração permanente', 12, 28.90, 3),
    ('Descolorante Pó Azul', 'Pó descolorante 500g', 10, 42.00, 3)
  ) AS p(nome, descricao, quantidade_estoque, preco, quantidade_minima)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '10 produtos de teste inseridos';

  -- 5. Inserir categorias de serviços (se não existirem)
  INSERT INTO categorias_servicos (nome, estabelecimento_id, ordem)
  VALUES 
    ('Cabelo', estabelecimento_teste_id, 1),
    ('Unhas', estabelecimento_teste_id, 2),
    ('Estética', estabelecimento_teste_id, 3)
  ON CONFLICT (nome) DO NOTHING;

  -- 6. Inserir serviços de teste
  INSERT INTO servicos (nome, descricao, preco, categoria_id, estabelecimento_id)
  SELECT 
    nome, descricao, preco,
    (SELECT id FROM categorias_servicos WHERE nome = categoria AND estabelecimento_id = estabelecimento_teste_id LIMIT 1),
    estabelecimento_teste_id
  FROM (VALUES
    ('Corte Feminino', 'Corte de cabelo feminino', 60.00, 'Cabelo'),
    ('Corte Masculino', 'Corte de cabelo masculino', 40.00, 'Cabelo'),
    ('Escova', 'Escova modeladora', 50.00, 'Cabelo'),
    ('Hidratação', 'Hidratação profunda', 80.00, 'Cabelo'),
    ('Coloração', 'Coloração completa', 150.00, 'Cabelo'),
    ('Manicure', 'Esmaltação simples', 25.00, 'Unhas'),
    ('Pedicure', 'Pedicure completa', 30.00, 'Unhas'),
    ('Unhas em Gel', 'Aplicação de unhas em gel', 80.00, 'Unhas'),
    ('Limpeza de Pele', 'Limpeza facial profunda', 100.00, 'Estética'),
    ('Depilação Completa', 'Depilação corpo completo', 120.00, 'Estética')
  ) AS s(nome, descricao, preco, categoria)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '10 serviços de teste inseridos';

  -- 7. Inserir alguns agendamentos de teste
  INSERT INTO agendamentos (cliente, telefone, data_hora, servicos, valor_total, status, estabelecimento_id, horario_termino)
  SELECT 
    nome, telefone, 
    NOW() + (INTERVAL '1 day' * n) + (INTERVAL '1 hour' * (n % 8 + 9)),
    jsonb_build_array(
      jsonb_build_object('nome', 'Corte Feminino', 'preco', 60.00)
    ),
    60.00,
    CASE WHEN n % 3 = 0 THEN 'concluido' ELSE 'agendado' END,
    estabelecimento_teste_id,
    (NOW() + (INTERVAL '1 day' * n) + (INTERVAL '1 hour' * (n % 8 + 10)))::time
  FROM clientes c, generate_series(1, 5) n
  WHERE c.estabelecimento_id = estabelecimento_teste_id
  LIMIT 15;

  RAISE NOTICE '15 agendamentos de teste inseridos';

  -- 8. Resumo final
  RAISE NOTICE '===== RESUMO =====';
  RAISE NOTICE 'Estabelecimento: %', estabelecimento_teste_id;
  RAISE NOTICE 'Clientes: % registros', (SELECT COUNT(*) FROM clientes WHERE estabelecimento_id = estabelecimento_teste_id);
  RAISE NOTICE 'Produtos: % registros', (SELECT COUNT(*) FROM produtos WHERE estabelecimento_id = estabelecimento_teste_id);
  RAISE NOTICE 'Serviços: % registros', (SELECT COUNT(*) FROM servicos WHERE estabelecimento_id = estabelecimento_teste_id);
  RAISE NOTICE 'Agendamentos: % registros', (SELECT COUNT(*) FROM agendamentos WHERE estabelecimento_id = estabelecimento_teste_id);

END $$;

-- Verificar resultados
SELECT 'Dados inseridos com sucesso!' as status;
