

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "auth_private";


ALTER SCHEMA "auth_private" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."user_access_level" AS ENUM (
    'admin',
    'administrator',
    'employee',
    'professional'
);


ALTER TYPE "public"."user_access_level" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "auth_private"."check_user_access"("user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = user_id
  );
$$;


ALTER FUNCTION "auth_private"."check_user_access"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_data_fechamento"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status IN ('fechada', 'cancelada') AND OLD.status = 'aberta' THEN
    NEW.data_fechamento = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."atualizar_data_fechamento"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_foto_usuario"("usuario_id" "uuid", "nova_foto_url" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update usuarios
  set foto_url = nova_foto_url,
      atualizado_em = now()
  where id = usuario_id
  and (
    -- Permite que o próprio usuário atualize
    auth.uid() = id
    or
    -- Ou que um administrador atualize
    exists (
      select 1 from usuarios
      where id = auth.uid()
      and nivel_acesso_id = '1'
    )
  );
end;
$$;


ALTER FUNCTION "public"."atualizar_foto_usuario"("usuario_id" "uuid", "nova_foto_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_usuario"("p_usuario_id" "uuid", "p_nome_completo" "text", "p_email" "text", "p_cargo" "text", "p_nivel_acesso_id" "text", "p_foto_url" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update usuarios
  set 
    nome_completo = coalesce(p_nome_completo, nome_completo),
    email = coalesce(p_email, email),
    cargo = coalesce(p_cargo, cargo),
    nivel_acesso_id = coalesce(p_nivel_acesso_id, nivel_acesso_id),
    foto_url = coalesce(p_foto_url, foto_url),
    atualizado_em = now()
  where id = p_usuario_id;
end;
$$;


ALTER FUNCTION "public"."atualizar_usuario"("p_usuario_id" "uuid", "p_nome_completo" "text", "p_email" "text", "p_cargo" "text", "p_nivel_acesso_id" "text", "p_foto_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."banir_conta"("p_estabelecimento_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  
  UPDATE estabelecimentos
  SET status = 'banida',
      updated_at = now()
  WHERE id = p_estabelecimento_id;
  
  -- Registrar log
  INSERT INTO logs_atividades (user_id, estabelecimento_id, acao)
  VALUES (auth.uid(), p_estabelecimento_id, 'banir_conta');
END;
$$;


ALTER FUNCTION "public"."banir_conta"("p_estabelecimento_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."buscar_agendamentos_completos"("data_inicio" timestamp with time zone, "data_fim" timestamp with time zone) RETURNS TABLE("id" "uuid", "cliente" "text", "telefone" "text", "data_hora" timestamp with time zone, "servicos" "jsonb", "valor_total" numeric, "status" "text", "observacoes" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.cliente,
    a.telefone,
    a.data_hora,
    a.servicos,
    a.valor_total,
    a.status,
    a.observacoes,
    a.created_at,
    a.updated_at
  FROM agendamentos a
  WHERE 
    a.user_id = auth.uid()
    AND a.data_hora BETWEEN data_inicio AND data_fim
  ORDER BY a.data_hora;
END;
$$;


ALTER FUNCTION "public"."buscar_agendamentos_completos"("data_inicio" timestamp with time zone, "data_fim" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."buscar_agendamentos_completos"("p_data_inicio" timestamp with time zone, "p_data_fim" timestamp with time zone, "p_profissional_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "cliente_id" "uuid", "cliente_nome" "text", "profissional_id" "uuid", "profissional_nome" "text", "data_hora" timestamp with time zone, "duracao" integer, "status" "text", "observacoes" "text", "servicos" "jsonb", "valor_total" numeric, "confirmado" boolean, "presente" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "historico_confirmacoes" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.cliente_id,
    c.nome as cliente_nome,
    a.profissional_id,
    p.nome as profissional_nome,
    a.data_hora,
    a.duracao,
    a.status,
    a.observacoes,
    a.servicos,
    a.valor_total,
    a.confirmado,
    a.presente,
    a.created_at,
    a.updated_at,
    a.historico_confirmacoes
  FROM agendamentos a
  JOIN clientes c ON a.cliente_id = c.id
  JOIN profissionais p ON a.profissional_id = p.id
  WHERE 
    a.user_id = auth.uid()
    AND a.data_hora BETWEEN p_data_inicio AND p_data_fim
    AND (p_profissional_id IS NULL OR a.profissional_id = p_profissional_id)
  ORDER BY a.data_hora;
END;
$$;


ALTER FUNCTION "public"."buscar_agendamentos_completos"("p_data_inicio" timestamp with time zone, "p_data_fim" timestamp with time zone, "p_profissional_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."buscar_clientes_completos"("filtro" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "nome" "text", "email" "text", "telefone" "text", "cpf" "text", "data_nascimento" "date", "genero" "text", "imagem_perfil" "text", "endereco" "jsonb", "preferencia_contato" "text", "ativo" boolean, "observacoes" "text", "historico_saude" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "total_compras" numeric, "total_agendamentos" integer, "ultima_visita" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.nome,
    c.email,
    c.telefone,
    c.cpf,
    c.data_nascimento,
    c.genero,
    c.imagem_perfil,
    c.endereco,
    c.preferencia_contato,
    c.ativo,
    c.observacoes,
    c.historico_saude,
    c.created_at,
    c.updated_at,
    COALESCE(SUM(co.valor_total), 0) as total_compras,
    COUNT(DISTINCT a.id) as total_agendamentos,
    MAX(GREATEST(co.data_abertura, a.data_hora)) as ultima_visita
  FROM clientes c
  LEFT JOIN comandas co ON c.id = co.cliente_id AND co.user_id = auth.uid()
  LEFT JOIN agendamentos a ON c.id = a.cliente_id AND a.user_id = auth.uid()
  WHERE 
    c.user_id = auth.uid()
    AND (
      filtro IS NULL 
      OR c.nome ILIKE '%' || filtro || '%'
      OR c.email ILIKE '%' || filtro || '%'
      OR c.telefone ILIKE '%' || filtro || '%'
      OR c.cpf ILIKE '%' || filtro || '%'
    )
  GROUP BY c.id
  ORDER BY c.nome;
END;
$$;


ALTER FUNCTION "public"."buscar_clientes_completos"("filtro" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."buscar_comandas_completas"("data_inicio" "date", "data_fim" "date") RETURNS TABLE("id" "uuid", "cliente_id" "uuid", "cliente_nome" "text", "cliente_telefone" "text", "data_abertura" timestamp with time zone, "status" "text", "valor_total" numeric, "forma_pagamento" "text", "parcelas" integer, "observacoes" "text", "itens" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.cliente_id,
    cl.nome as cliente_nome,
    cl.telefone as cliente_telefone,
    c.data_abertura,
    c.status,
    c.valor_total,
    c.forma_pagamento,
    c.parcelas,
    c.observacoes,
    c.itens,
    c.created_at,
    c.updated_at
  FROM comandas c
  JOIN clientes cl ON c.cliente_id = cl.id
  WHERE 
    c.user_id = auth.uid()
    AND c.data_abertura::DATE BETWEEN data_inicio AND data_fim
  ORDER BY c.data_abertura DESC;
END;
$$;


ALTER FUNCTION "public"."buscar_comandas_completas"("data_inicio" "date", "data_fim" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."buscar_comandas_completas"("p_data_inicio" timestamp with time zone, "p_data_fim" timestamp with time zone, "p_status" "text" DEFAULT NULL::"text", "p_cliente_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "cliente_id" "uuid", "cliente_nome" "text", "data_abertura" timestamp with time zone, "data_fechamento" timestamp with time zone, "status" "text", "valor_total" numeric, "valor_pago" numeric, "forma_pagamento" "text", "parcelas" integer, "observacoes" "text", "itens" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "profissional_id" "uuid", "profissional_nome" "text", "total_itens" integer, "total_produtos" integer, "total_servicos" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.cliente_id,
    cl.nome as cliente_nome,
    c.data_abertura,
    c.data_fechamento,
    c.status,
    c.valor_total,
    c.valor_pago,
    c.forma_pagamento,
    c.parcelas,
    c.observacoes,
    c.itens,
    c.created_at,
    c.updated_at,
    c.profissional_id,
    p.nome as profissional_nome,
    (SELECT COUNT(*) FROM jsonb_array_elements(c.itens)) as total_itens,
    (SELECT COUNT(*) FROM jsonb_array_elements(c.itens) WHERE (value->>'tipo')::text = 'produto') as total_produtos,
    (SELECT COUNT(*) FROM jsonb_array_elements(c.itens) WHERE (value->>'tipo')::text = 'servico') as total_servicos
  FROM comandas c
  JOIN clientes cl ON c.cliente_id = cl.id
  LEFT JOIN profissionais p ON c.profissional_id = p.id
  WHERE 
    c.user_id = auth.uid()
    AND c.data_abertura BETWEEN p_data_inicio AND p_data_fim
    AND (p_status IS NULL OR c.status = p_status)
    AND (p_cliente_id IS NULL OR c.cliente_id = p_cliente_id)
  ORDER BY c.data_abertura DESC;
END;
$$;


ALTER FUNCTION "public"."buscar_comandas_completas"("p_data_inicio" timestamp with time zone, "p_data_fim" timestamp with time zone, "p_status" "text", "p_cliente_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."buscar_orcamentos_completos"("data_inicio" "date", "data_fim" "date") RETURNS TABLE("id" "uuid", "cliente_id" "uuid", "cliente_nome" "text", "cliente_telefone" "text", "data_orcamento" timestamp with time zone, "status" "text", "valor_total" numeric, "validade" "date", "observacoes" "text", "itens" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.cliente_id,
    cl.nome as cliente_nome,
    cl.telefone as cliente_telefone,
    o.data_orcamento,
    o.status,
    o.valor_total,
    o.validade,
    o.observacoes,
    o.itens,
    o.created_at,
    o.updated_at
  FROM orcamentos o
  JOIN clientes cl ON o.cliente_id = cl.id
  WHERE 
    o.user_id = auth.uid()
    AND o.data_orcamento::DATE BETWEEN data_inicio AND data_fim
  ORDER BY o.data_orcamento DESC;
END;
$$;


ALTER FUNCTION "public"."buscar_orcamentos_completos"("data_inicio" "date", "data_fim" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_ownership"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN auth.uid() = user_id;
END;
$$;


ALTER FUNCTION "public"."check_user_ownership"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_user_data"("user_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_id uuid;
  user_cadastro_id uuid;
BEGIN
  -- Encontrar o ID do usuário pelo email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;

  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado', user_email;
  END IF;

  -- Desabilitar temporariamente as restrições de chave estrangeira
  SET CONSTRAINTS ALL DEFERRED;

  -- Encontrar o cadastro_id do usuário
  SELECT usuarios.cadastro_id INTO user_cadastro_id
  FROM public.usuarios
  WHERE usuarios.id = user_id;

  -- Excluir registros relacionados nas tabelas públicas
  -- Primeiro, excluir estabelecimentos
  DELETE FROM public.estabelecimentos WHERE usuario_id = user_id;
  
  -- Depois, excluir usuários
  DELETE FROM public.usuarios WHERE id = user_id;
  
  -- Por fim, excluir o cadastro se existir
  IF user_cadastro_id IS NOT NULL THEN
    DELETE FROM public.cadastros WHERE id = user_cadastro_id;
  END IF;

  -- Reabilitar as restrições
  SET CONSTRAINTS ALL IMMEDIATE;

  RAISE NOTICE 'Dados do usuário % foram limpos com sucesso', user_email;
END;
$$;


ALTER FUNCTION "public"."cleanup_user_data"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."contar_todos_usuarios"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM usuarios);
END;
$$;


ALTER FUNCTION "public"."contar_todos_usuarios"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_new_organization"("user_id" "uuid", "org_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_org_id uuid;
BEGIN
    -- Cria a nova organização
    INSERT INTO public.organizations (name)
    VALUES (org_name)
    RETURNING id INTO new_org_id;

    -- Vincula o usuário que acabou de se cadastrar a essa nova organização com o papel de 'admin'
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (new_org_id, user_id, 'admin');
END;
$$;


ALTER FUNCTION "public"."create_new_organization"("user_id" "uuid", "org_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_usuarios_table"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Cria a tabela se não existir
  CREATE TABLE IF NOT EXISTS usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_completo TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefone TEXT,
    is_principal BOOLEAN DEFAULT false,
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- Cria a política de segurança para leitura
  CREATE POLICY "Usuários podem ver todos os usuários"
  ON usuarios
  FOR SELECT
  USING (true);

  -- Cria a política de segurança para inserção
  CREATE POLICY "Usuários podem criar novos usuários"
  ON usuarios
  FOR INSERT
  WITH CHECK (true);

  -- Cria a política de segurança para atualização
  CREATE POLICY "Usuários podem atualizar seus próprios dados"
  ON usuarios
  FOR UPDATE
  USING (auth.uid() = id);

  -- Cria a política de segurança para deleção
  CREATE POLICY "Apenas usuário principal pode deletar usuários"
  ON usuarios
  FOR DELETE
  USING (auth.uid() IN (SELECT id FROM usuarios WHERE is_principal = true));

  -- Habilita RLS
  ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
END;
$$;


ALTER FUNCTION "public"."create_usuarios_table"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."criar_nova_conta"("p_nome_estabelecimento" "text", "p_tipo_documento" "text", "p_numero_documento" "text", "p_telefone" "text", "p_segmento" "text", "p_nome_usuario" "text", "p_email" "text", "p_usuario_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  novo_estabelecimento_id uuid;
BEGIN
  -- Passo 1: Insere o novo estabelecimento (sem o campo 'telefone')
  INSERT INTO public.estabelecimentos (nome, tipo_documento, numero_documento, segmento)
  VALUES (p_nome_estabelecimento, p_tipo_documento, p_numero_documento, p_segmento)
  RETURNING id INTO novo_estabelecimento_id;

  -- Passo 2: Insere o perfil do usuário (com o campo 'telefone' aqui, que é o correto)
  INSERT INTO public.usuarios (id, nome_completo, email, telefone, is_principal, estabelecimento_id, role)
  VALUES (
    p_usuario_id,
    p_nome_usuario,
    p_email,
    p_telefone, -- Telefone é salvo aqui, na tabela de usuários
    true, 
    novo_estabelecimento_id,
    'admin'
  );
END;
$$;


ALTER FUNCTION "public"."criar_nova_conta"("p_nome_estabelecimento" "text", "p_tipo_documento" "text", "p_numero_documento" "text", "p_telefone" "text", "p_segmento" "text", "p_nome_usuario" "text", "p_email" "text", "p_usuario_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_old_avatar"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  status int;
  content text;
  old_file_path text;
begin
  if old.foto_url is not null then
    -- Pegar apenas o nome do arquivo, sem o caminho do bucket
    old_file_path := old.foto_url;
    
    -- Deletar arquivo antigo do storage
    select
      into status, content
      result.status, result.content
    from public.delete_storage_object('fotos_perfil', old_file_path) as result;
  end if;
  
  return new;
end;
$$;


ALTER FUNCTION "public"."delete_old_avatar"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_and_data"("user_id_to_delete" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Excluir todas as configurações relacionadas
    DELETE FROM public.configuracoes WHERE user_id = user_id_to_delete;
    
    -- Excluir cadastros relacionados
    DELETE FROM public.cadastros WHERE user_id = user_id_to_delete;
    
    -- Excluir estabelecimentos relacionados
    DELETE FROM public.estabelecimentos WHERE usuario_id = user_id_to_delete;
    
    -- Excluir clientes relacionados
    DELETE FROM public.clientes WHERE user_id = user_id_to_delete;
    
    -- Excluir usuário da tabela public.usuarios
    DELETE FROM public.usuarios WHERE id = user_id_to_delete;
    
    -- Excluir usuário do sistema de autenticação
    DELETE FROM auth.users WHERE id = user_id_to_delete;
END;
$$;


ALTER FUNCTION "public"."delete_user_and_data"("user_id_to_delete" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_by_email"("user_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Encontrar o ID do usuário pelo email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;

  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado', user_email;
  END IF;

  -- Excluir o usuário do sistema de autenticação
  PERFORM auth.admin.delete_user(user_id);

  -- Excluir registros relacionados nas tabelas públicas
  DELETE FROM public.usuarios WHERE id = user_id;
  DELETE FROM public.cadastros WHERE id IN (
    SELECT cadastro_id FROM public.usuarios WHERE id = user_id
  );
  DELETE FROM public.estabelecimentos WHERE usuario_id = user_id;

  RAISE NOTICE 'Usuário % excluído com sucesso', user_email;
END;
$$;


ALTER FUNCTION "public"."delete_user_by_email"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_complete"("email_to_delete" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID; -- Renomeado para evitar ambiguidade
    v_estabelecimento_id UUID;
BEGIN
    -- Primeiro, encontrar o ID do usuário pelo email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = email_to_delete;

    IF v_user_id IS NULL THEN
        RETURN 'Usuário não encontrado';
    END IF;

    -- Encontrar o estabelecimento_id do usuário
    SELECT id INTO v_estabelecimento_id
    FROM public.estabelecimentos
    WHERE user_id = v_user_id;

    -- Deletar na ordem correta para evitar violações de chave estrangeira
    
    -- 1. Deletar permissões
    DELETE FROM public.permissoes
    WHERE user_id = v_user_id;

    -- 2. Deletar usuário da tabela usuarios
    DELETE FROM public.usuarios
    WHERE user_id = v_user_id;

    -- 3. Deletar estabelecimento
    DELETE FROM public.estabelecimentos
    WHERE user_id = v_user_id;

    -- 4. Deletar da tabela auth.users
    DELETE FROM auth.users
    WHERE id = v_user_id;

    RETURN 'Usuário deletado com sucesso';
END;
$$;


ALTER FUNCTION "public"."delete_user_complete"("email_to_delete" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_completely"("user_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_id uuid;
    user_cadastro_id uuid;
BEGIN
    -- Encontrar o ID do usuário pelo email
    SELECT id INTO user_id
    FROM auth.users
    WHERE email = user_email;

    IF user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário com email % não encontrado', user_email;
    END IF;

    -- Encontrar o cadastro_id do usuário
    SELECT cadastro_id INTO user_cadastro_id
    FROM public.usuarios
    WHERE id = user_id;

    -- Excluir registros relacionados nas tabelas públicas
    -- Primeiro, excluir configurações
    DELETE FROM public.configuracoes WHERE user_id = user_id;
    
    -- Depois, excluir estabelecimentos
    DELETE FROM public.estabelecimentos WHERE usuario_id = user_id;
    
    -- Depois, excluir usuários
    DELETE FROM public.usuarios WHERE id = user_id;
    
    -- Por fim, excluir o cadastro se existir
    IF user_cadastro_id IS NOT NULL THEN
        DELETE FROM public.cadastros WHERE id = user_cadastro_id;
    END IF;

    -- Tentar excluir o usuário da autenticação
    DELETE FROM auth.users WHERE id = user_id;

    RAISE NOTICE 'Usuário % e todos os seus dados foram excluídos com sucesso', user_email;
END;
$$;


ALTER FUNCTION "public"."delete_user_completely"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."excluir_usuario"("usuario_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
    -- Remove todas as referências em outras tabelas
    delete from auth.sessions where user_id::uuid = usuario_id;
    delete from auth.refresh_tokens where user_id::uuid = usuario_id;
    
    -- Remove o registro da tabela usuarios
    delete from public.usuarios where id::uuid = usuario_id;
    
    -- Por fim, remove o usuário da tabela auth.users
    delete from auth.users where id::uuid = usuario_id;

    -- Retorna sucesso
    return;
exception
    when others then
        -- Log do erro para debug
        raise notice 'Erro ao excluir usuário: %', SQLERRM;
        -- Re-lança o erro
        raise;
end;
$$;


ALTER FUNCTION "public"."excluir_usuario"("usuario_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_migration"("migration_name" "text", "migration_script" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Verifica se a migração já foi aplicada
  IF NOT EXISTS (SELECT 1 FROM applied_migrations WHERE name = migration_name) THEN
    -- Executa o script
    EXECUTE migration_script;
    
    -- Registra a migração como aplicada
    INSERT INTO applied_migrations (name, applied_at) VALUES (migration_name, NOW());
  END IF;
END;
$$;


ALTER FUNCTION "public"."execute_migration"("migration_name" "text", "migration_script" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalizar_comanda"("p_comanda_id" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    item RECORD;
    produto_rec RECORD;
BEGIN
    -- Loop através de cada item da comanda especificada
    FOR item IN
        SELECT produto_id, quantidade FROM comanda_itens WHERE comanda_id = p_comanda_id
    LOOP
        -- Pega o registro do produto para verificação e bloqueia a linha para evitar concorrência
        SELECT * INTO produto_rec FROM produtos WHERE id = item.produto_id FOR UPDATE;

        -- Verifica se há estoque suficiente
        IF produto_rec.estoque < item.quantidade THEN
            -- Se não houver estoque, lança uma exceção e desfaz a transação
            RAISE EXCEPTION 'Estoque insuficiente para o produto % (ID: %)', produto_rec.nome, item.produto_id;
        END IF;

        -- Se houver estoque, atualiza a quantidade
        UPDATE produtos
        SET estoque = estoque - item.quantidade
        WHERE id = item.produto_id;
    END LOOP;

    -- Se todos os itens foram processados com sucesso, atualiza o status da comanda
    UPDATE comandas
    SET status = 'fechada'
    WHERE id = p_comanda_id;

EXCEPTION
    -- Em caso de qualquer erro (incluindo a exceção de estoque), a transação é revertida
    WHEN OTHERS THEN
        RAISE;
END;
$$;


ALTER FUNCTION "public"."finalizar_comanda"("p_comanda_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_agenda_profissional"("profissional_id" "uuid", "data_inicio" "date", "data_fim" "date") RETURNS TABLE("id" "uuid", "data_hora" timestamp without time zone, "cliente" "jsonb", "servico" "jsonb", "status" "text", "observacoes" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.data_hora,
        jsonb_build_object(
            'id', c.id,
            'nome', c.nome,
            'telefone', c.telefone
        ) as cliente,
        jsonb_build_object(
            'id', s.id,
            'nome', s.nome,
            'duracao', s.duracao,
            'valor', s.valor
        ) as servico,
        a.status,
        a.observacoes
    FROM agendamentos a
    JOIN clientes c ON a.cliente_id = c.id
    JOIN servicos s ON a.servico_id = s.id
    WHERE a.profissional_id = profissional_id
    AND a.data_hora BETWEEN data_inicio AND data_fim
    ORDER BY a.data_hora;
END;
$$;


ALTER FUNCTION "public"."get_agenda_profissional"("profissional_id" "uuid", "data_inicio" "date", "data_fim" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_agendamentos_com_usuarios"("p_estabelecimento_id" "uuid") RETURNS TABLE("id" "uuid", "cliente" "text", "telefone" "text", "data_hora" timestamp with time zone, "servicos" "jsonb", "valor_total" numeric, "observacoes" "text", "status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "estabelecimento_id" "uuid", "usuario_id" "uuid", "usuario_nome" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
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

  -- Retornar agendamentos próximos com nomes dos usuários
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
  LIMIT 5;
END;
$$;


ALTER FUNCTION "public"."get_agendamentos_com_usuarios"("p_estabelecimento_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cliente_completo"("cliente_id" "uuid") RETURNS TABLE("id" "uuid", "nome" "text", "email" "text", "telefone" "text", "endereco" "jsonb", "ultimos_agendamentos" "jsonb", "total_gasto" numeric, "preferencias" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH cliente_data AS (
        SELECT 
            c.*,
            (
                SELECT jsonb_agg(jsonb_build_object(
                    'id', a.id,
                    'data', a.data,
                    'servico', a.servico,
                    'profissional', a.profissional
                ))
                FROM agendamentos a
                WHERE a.cliente_id = c.id
                ORDER BY a.data DESC
                LIMIT 5
            ) as ultimos_agendamentos,
            (
                SELECT COALESCE(SUM(v.valor_total), 0)
                FROM vendas v
                WHERE v.cliente_id = c.id
            ) as total_gasto
        FROM clientes c
        WHERE c.id = cliente_id
    )
    SELECT 
        cd.id,
        cd.nome,
        cd.email,
        cd.telefone,
        cd.endereco,
        cd.ultimos_agendamentos,
        cd.total_gasto,
        cd.preferencias
    FROM cliente_data cd;
END;
$$;


ALTER FUNCTION "public"."get_cliente_completo"("cliente_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_produtos_baixo_estoque"("p_org_id" "uuid") RETURNS TABLE("id" "uuid", "nome" "text", "quantidade" integer, "quantidade_minima" integer)
    LANGUAGE "plpgsql"
    AS $$BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.nome,
        p.quantidade_estoque AS quantidade,
        p.quantidade_minima
    FROM 
        public.produtos AS p
    WHERE 
        p.estabelecimento_id = p_est_id -- Filtro de segurança essencial
        AND p.quantidade_estoque <= p.quantidade_minima
    ORDER BY 
        p.quantidade_estoque, p.nome;
END;$$;


ALTER FUNCTION "public"."get_produtos_baixo_estoque"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_proximos_agendamentos"("p_estabelecimento_id" "uuid", "p_limit" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "cliente" "text", "telefone" "text", "data_hora" timestamp with time zone, "servicos" "jsonb", "valor_total" numeric, "observacoes" "text", "status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "estabelecimento_id" "uuid", "usuario_id" "uuid", "usuario_nome" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."get_proximos_agendamentos"("p_estabelecimento_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_relatorio_vendas"("data_inicio" "date", "data_fim" "date") RETURNS TABLE("data" "date", "total_vendas" numeric, "total_clientes" bigint, "servicos_mais_vendidos" "jsonb", "formas_pagamento" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH vendas_por_dia AS (
        SELECT 
            DATE(v.data) as data,
            SUM(v.valor_total) as total_vendas,
            COUNT(DISTINCT v.cliente_id) as total_clientes
        FROM vendas v
        WHERE DATE(v.data) BETWEEN data_inicio AND data_fim
        GROUP BY DATE(v.data)
    ),
    servicos_populares AS (
        SELECT 
            DATE(v.data) as data,
            jsonb_agg(jsonb_build_object(
                'servico', s.nome,
                'quantidade', COUNT(*),
                'total', SUM(v.valor_total)
            )) as servicos_mais_vendidos
        FROM vendas v
        JOIN servicos s ON v.servico_id = s.id
        WHERE DATE(v.data) BETWEEN data_inicio AND data_fim
        GROUP BY DATE(v.data)
    ),
    pagamentos AS (
        SELECT 
            DATE(v.data) as data,
            jsonb_agg(jsonb_build_object(
                'forma', v.forma_pagamento,
                'total', SUM(v.valor_total)
            )) as formas_pagamento
        FROM vendas v
        WHERE DATE(v.data) BETWEEN data_inicio AND data_fim
        GROUP BY DATE(v.data)
    )
    SELECT 
        vd.data,
        vd.total_vendas,
        vd.total_clientes,
        sp.servicos_mais_vendidos,
        p.formas_pagamento
    FROM vendas_por_dia vd
    LEFT JOIN servicos_populares sp ON vd.data = sp.data
    LEFT JOIN pagamentos p ON vd.data = p.data
    ORDER BY vd.data;
END;
$$;


ALTER FUNCTION "public"."get_relatorio_vendas"("data_inicio" "date", "data_fim" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_estabelecimento_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  estab_id UUID;
BEGIN
  SELECT estabelecimento_id INTO estab_id
  FROM usuarios
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN estab_id;
END;
$$;


ALTER FUNCTION "public"."get_user_estabelecimento_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organization_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  org_id uuid;
BEGIN
  -- Esta função busca o ID da organização do usuário atualmente logado.
  -- Por simplicidade, retorna a primeira que encontrar.
  SELECT organization_id INTO org_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN org_id;
END;
$$;


ALTER FUNCTION "public"."get_user_organization_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_usuarios_estabelecimento"("estabelecimento_uuid" "uuid") RETURNS TABLE("id" "uuid", "nome_completo" "text", "email" "text", "telefone" "text", "is_principal" boolean, "avatar_url" "text", "created_at" timestamp with time zone, "role" "text", "faz_atendimento" boolean, "estabelecimento_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Verificar se o usuário logado tem permissão
  IF NOT EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.id = auth.uid() 
    AND (
      u.role = 'super_admin' 
      OR u.is_principal = true 
      OR u.role = 'admin'
      OR u.role = 'funcionario'
    )
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Retornar usuários do estabelecimento
  RETURN QUERY
  SELECT 
    u.id,
    u.nome_completo,
    u.email,
    u.telefone,
    u.is_principal,
    u.avatar_url,
    u.created_at,
    u.role,
    u.faz_atendimento,
    u.estabelecimento_id
  FROM usuarios u
  WHERE u.estabelecimento_id = estabelecimento_uuid
  ORDER BY u.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_usuarios_estabelecimento"("estabelecimento_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Esta função simplesmente chama a sua lógica principal
    -- passando os dados do novo usuário que foram incluídos nos metadados durante o signUp
    PERFORM public.criar_nova_conta(
        NEW.id,
        (NEW.raw_user_meta_data->>'nome_estabelecimento')::text,
        (NEW.raw_user_meta_data->>'tipo_documento')::text,
        (NEW.raw_user_meta_data->>'numero_documento')::text,
        (NEW.raw_user_meta_data->>'telefone')::text,
        (NEW.raw_user_meta_data->>'segmento')::text
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid() 
        AND nivel_acesso_id = '1'
    );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = user_id 
        AND nivel_acesso_id = '1'
    );
END;
$$;


ALTER FUNCTION "public"."is_admin"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT (role = 'super_admin') INTO is_admin
  FROM usuarios
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(is_admin, false);
END;
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_triggers"() RETURNS TABLE("trigger_name" "text", "event_manipulation" "text", "event_object_table" "text", "action_statement" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tgname::text as trigger_name,
        t.tgtype::text as event_manipulation,
        c.relname::text as event_object_table,
        pg_get_triggerdef(t.oid)::text as action_statement
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE NOT t.tgisinternal;
END;
$$;


ALTER FUNCTION "public"."list_triggers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."obter_dados_usuario"("usuario_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    resultado json;
BEGIN
    SELECT json_build_object(
        'nome', u.nome_completo,  -- Alterado de 'nome' para 'nome_completo'
        'email', auth.email,
        'cargo', u.cargo,
        'nome_estabelecimento', u.nome_estabelecimento,
        'foto_url', u.foto_url
    ) INTO resultado
    FROM usuarios u
    JOIN auth.users auth ON auth.id = u.id
    WHERE u.id = usuario_id;
    
    IF resultado IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado';
    END IF;
    
    RETURN resultado;
END;
$$;


ALTER FUNCTION "public"."obter_dados_usuario"("usuario_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."produtos_baixo_estoque"() RETURNS TABLE("id" "uuid", "nome" "text", "quantidade" integer, "quantidade_minima" integer, "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.nome,
        p.quantidade,
        p.quantidade_minima,
        CASE 
            WHEN p.quantidade = 0 THEN 'ZERADO'
            ELSE 'ABAIXO DO MÍNIMO'
        END as status
    FROM produtos p
    WHERE p.quantidade = 0 
    OR (p.quantidade_minima IS NOT NULL AND p.quantidade <= p.quantidade_minima)
    ORDER BY 
        CASE 
            WHEN p.quantidade = 0 THEN 1
            ELSE 2
        END,
        p.nome;
END;
$$;


ALTER FUNCTION "public"."produtos_baixo_estoque"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reativar_conta"("p_estabelecimento_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  
  UPDATE estabelecimentos
  SET status = 'ativa',
      suspensa_ate = NULL,
      updated_at = now()
  WHERE id = p_estabelecimento_id;
  
  -- Registrar log
  INSERT INTO logs_atividades (user_id, estabelecimento_id, acao)
  VALUES (auth.uid(), p_estabelecimento_id, 'reativar_conta');
END;
$$;


ALTER FUNCTION "public"."reativar_conta"("p_estabelecimento_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_id_on_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.user_id := auth.uid();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_user_id_on_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."suspender_conta"("p_estabelecimento_id" "uuid", "p_suspensa_ate" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  
  UPDATE estabelecimentos
  SET status = 'suspensa',
      suspensa_ate = p_suspensa_ate,
      updated_at = now()
  WHERE id = p_estabelecimento_id;
  
  -- Registrar log
  INSERT INTO logs_atividades (user_id, estabelecimento_id, acao, detalhes)
  VALUES (auth.uid(), p_estabelecimento_id, 'suspender_conta', 
          jsonb_build_object('suspensa_ate', p_suspensa_ate));
END;
$$;


ALTER FUNCTION "public"."suspender_conta"("p_estabelecimento_id" "uuid", "p_suspensa_ate" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_uuid"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.id = gen_random_uuid();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_uuid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_cadastro_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_cadastro_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_categorias_produtos_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_categorias_produtos_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_categorias_servicos_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_categorias_servicos_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_comanda_valor_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE comandas
  SET valor_total = (
    SELECT COALESCE(SUM(quantidade * valor_unitario), 0)
    FROM comanda_itens
    WHERE comanda_id = NEW.comanda_id
  )
  WHERE id = NEW.comanda_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_comanda_valor_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_estabelecimento_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_estabelecimento_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_fornecedores_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_fornecedores_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_marcas_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_marcas_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_permissoes_usuario_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_permissoes_usuario_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_produtos_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_produtos_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_usuario_estabelecimento"("usuario_id" "uuid", "p_nome_completo" "text" DEFAULT NULL::"text", "p_email" "text" DEFAULT NULL::"text", "p_telefone" "text" DEFAULT NULL::"text", "p_avatar_url" "text" DEFAULT NULL::"text", "p_role" "text" DEFAULT NULL::"text", "p_faz_atendimento" boolean DEFAULT NULL::boolean, "p_estabelecimento_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_user_data usuarios%ROWTYPE;
  target_user_data usuarios%ROWTYPE;
BEGIN
  -- Buscar dados do usuário logado
  SELECT * INTO current_user_data 
  FROM usuarios 
  WHERE id = auth.uid();
  
  -- Buscar dados do usuário a ser editado
  SELECT * INTO target_user_data 
  FROM usuarios 
  WHERE id = usuario_id;
  
  -- Verificar se os usuários existem
  IF current_user_data.id IS NULL THEN
    RAISE EXCEPTION 'Usuário logado não encontrado';
  END IF;
  
  IF target_user_data.id IS NULL THEN
    RAISE EXCEPTION 'Usuário a ser editado não encontrado';
  END IF;
  
  -- Verificar permissões
  IF NOT (
    -- Super admin pode editar qualquer usuário
    current_user_data.role = 'super_admin'
    OR
    -- Usuário pode editar seu próprio perfil
    current_user_data.id = usuario_id
    OR
    -- Admin ou is_principal pode editar usuários do mesmo estabelecimento
    (
      (current_user_data.is_principal = true OR current_user_data.role = 'admin')
      AND current_user_data.estabelecimento_id = target_user_data.estabelecimento_id
    )
  ) THEN
    RAISE EXCEPTION 'Acesso negado para editar este usuário';
  END IF;
  
  -- Atualizar apenas os campos fornecidos
  UPDATE usuarios SET
    nome_completo = COALESCE(p_nome_completo, nome_completo),
    email = COALESCE(p_email, email),
    telefone = COALESCE(p_telefone, telefone),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    role = COALESCE(p_role, role),
    faz_atendimento = COALESCE(p_faz_atendimento, faz_atendimento),
    estabelecimento_id = COALESCE(p_estabelecimento_id, estabelecimento_id),
    updated_at = NOW()
  WHERE id = usuario_id;
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."update_usuario_estabelecimento"("usuario_id" "uuid", "p_nome_completo" "text", "p_email" "text", "p_telefone" "text", "p_avatar_url" "text", "p_role" "text", "p_faz_atendimento" boolean, "p_estabelecimento_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verificar_permissoes_usuario"("usuario_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    resultado json;
BEGIN
    SELECT json_build_object(
        'is_admin', COALESCE(nivel_acesso_id = '1', true)
    ) INTO resultado
    FROM usuarios
    WHERE id = usuario_id;
    
    RETURN COALESCE(resultado, json_build_object('is_admin', false));
END;
$$;


ALTER FUNCTION "public"."verificar_permissoes_usuario"("usuario_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agendamento_servicos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "agendamento_id" "uuid" NOT NULL,
    "servico_id" "uuid" NOT NULL,
    "horario_inicio" timestamp with time zone NOT NULL,
    "horario_fim" timestamp with time zone NOT NULL,
    "valor" numeric(10,2) NOT NULL,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "estabelecimento_id" "uuid"
);


ALTER TABLE "public"."agendamento_servicos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agendamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cliente" "text" NOT NULL,
    "telefone" "text" NOT NULL,
    "data_hora" timestamp with time zone NOT NULL,
    "servicos" "jsonb" NOT NULL,
    "valor_total" numeric(10,2) NOT NULL,
    "observacoes" "text",
    "status" "text" DEFAULT 'agendado'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "estabelecimento_id" "uuid",
    "usuario_id" "uuid",
    "horario_termino" time without time zone,
    "criar_comanda_automatica" boolean DEFAULT true
);


ALTER TABLE "public"."agendamentos" OWNER TO "postgres";


COMMENT ON COLUMN "public"."agendamentos"."status" IS 'Status do agendamento: agendado, confirmado, em_atendimento, concluido, cancelado, falta';



COMMENT ON COLUMN "public"."agendamentos"."horario_termino" IS 'Horário de término do agendamento';



COMMENT ON COLUMN "public"."agendamentos"."criar_comanda_automatica" IS 'Indica se uma comanda deve ser criada automaticamente no dia do agendamento';



CREATE TABLE IF NOT EXISTS "public"."categorias_produtos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "nome" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "estabelecimento_id" "uuid"
);


ALTER TABLE "public"."categorias_produtos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categorias_servicos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "ordem" integer,
    "estabelecimento_id" "uuid"
);


ALTER TABLE "public"."categorias_servicos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "telefone" "text" NOT NULL,
    "email" "text",
    "cpf" "text",
    "data_nascimento" "date",
    "endereco" "text",
    "cidade" "text",
    "estado" "text",
    "cep" "text",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "foto_url" "text",
    "estabelecimento_id" "uuid",
    "saldo_crediario" numeric DEFAULT 0
);


ALTER TABLE "public"."clientes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comandas" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "data_abertura" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" NOT NULL,
    "valor_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cliente_nome" "text" NOT NULL,
    "data_fechamento" timestamp with time zone,
    "fechado_por" character varying,
    "forma_pagamento" character varying(20),
    "valor_desconto" numeric(10,2) DEFAULT 0,
    "comprovante_pix" "text",
    "valor_pago" numeric(10,2),
    "troco" numeric(10,2),
    "parcelas" integer,
    "created_by_user_id" "uuid",
    "created_by_user_nome" "text",
    "finalized_by_user_id" "text",
    "finalized_by_user_nome" "text",
    "finalized_at" timestamp with time zone,
    "itens" "jsonb",
    "estabelecimento_id" "uuid",
    "saldo_aplicado" numeric(10,2),
    "troco_para_credito" numeric(10,2),
    "falta_para_debito" numeric(10,2),
    "formas_pagamento_detalhes" "text",
    CONSTRAINT "comandas_forma_pagamento_check" CHECK ((("forma_pagamento")::"text" = ANY ((ARRAY['dinheiro'::character varying, 'cartao_credito'::character varying, 'cartao_debito'::character varying, 'pix'::character varying, 'crediario'::character varying, 'multiplo'::character varying])::"text"[]))),
    CONSTRAINT "comandas_status_check" CHECK (("status" = ANY (ARRAY['aberta'::"text", 'fechada'::"text", 'cancelada'::"text"])))
);


ALTER TABLE "public"."comandas" OWNER TO "postgres";


COMMENT ON COLUMN "public"."comandas"."forma_pagamento" IS 'Forma de pagamento: dinheiro, cartao_credito, cartao_debito, pix, crediario, ou multiplo (quando há mais de uma forma)';



COMMENT ON COLUMN "public"."comandas"."saldo_aplicado" IS 'Valor de crédito/débito do cliente aplicado ao total da comanda';



COMMENT ON COLUMN "public"."comandas"."troco_para_credito" IS 'Valor do troco que foi convertido em crédito no crediário';



COMMENT ON COLUMN "public"."comandas"."falta_para_debito" IS 'Valor da falta que foi convertido em débito no crediário';



COMMENT ON COLUMN "public"."comandas"."formas_pagamento_detalhes" IS 'JSON contendo array de objetos com forma_pagamento e valor para pagamentos múltiplos';



CREATE TABLE IF NOT EXISTS "public"."comandas_itens" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "comanda_id" "uuid" NOT NULL,
    "tipo" "text" NOT NULL,
    "item_id" "uuid",
    "quantidade" integer DEFAULT 1 NOT NULL,
    "preco" numeric(10,2) NOT NULL,
    "preco_total" numeric(10,2) NOT NULL,
    "nome" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "preco_unitario" numeric(10,2) NOT NULL,
    "estabelecimento_id" "uuid",
    CONSTRAINT "comandas_itens_tipo_check" CHECK (("tipo" = ANY (ARRAY['produto'::"text", 'servico'::"text", 'pacote'::"text", 'pagamento'::"text"])))
);


ALTER TABLE "public"."comandas_itens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comissoes_registros" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "estabelecimento_id" "uuid" NOT NULL,
    "valor" numeric(10,2) NOT NULL,
    "descricao" "text",
    "data" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."comissoes_registros" OWNER TO "postgres";


COMMENT ON TABLE "public"."comissoes_registros" IS 'Registros manuais de comissões pagas aos usuários';



COMMENT ON COLUMN "public"."comissoes_registros"."usuario_id" IS 'ID do usuário que recebeu a comissão';



COMMENT ON COLUMN "public"."comissoes_registros"."estabelecimento_id" IS 'ID do estabelecimento';



COMMENT ON COLUMN "public"."comissoes_registros"."valor" IS 'Valor da comissão (positivo = a pagar, negativo = pago)';



COMMENT ON COLUMN "public"."comissoes_registros"."descricao" IS 'Descrição opcional do pagamento';



COMMENT ON COLUMN "public"."comissoes_registros"."data" IS 'Data do pagamento da comissão';



COMMENT ON COLUMN "public"."comissoes_registros"."created_at" IS 'Data e hora do registro';



CREATE TABLE IF NOT EXISTS "public"."configuracoes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "chave" "text" NOT NULL,
    "valor" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "estabelecimento_id" "uuid"
);


ALTER TABLE "public"."configuracoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crediario_movimentacoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cliente_id" "uuid",
    "valor" numeric NOT NULL,
    "tipo" character varying(10) NOT NULL,
    "descricao" "text",
    "data" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."crediario_movimentacoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."estabelecimentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "segmento" "text",
    "tipo_documento" "text",
    "numero_documento" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'ativa'::"text" NOT NULL,
    "suspensa_ate" timestamp with time zone
);


ALTER TABLE "public"."estabelecimentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fornecedores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "cnpj" "text",
    "telefone" "text",
    "email" "text",
    "endereco" "text",
    "cidade" "text",
    "estado" character(2),
    "cep" "text",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "estabelecimento_id" "uuid"
);


ALTER TABLE "public"."fornecedores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."logs_atividades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "estabelecimento_id" "uuid",
    "acao" "text" NOT NULL,
    "detalhes" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."logs_atividades" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marcas" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "nome" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "estabelecimento_id" "uuid"
);


ALTER TABLE "public"."marcas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notificacoes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "titulo" "text" NOT NULL,
    "mensagem" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "lida" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "estabelecimento_id" "uuid",
    CONSTRAINT "notificacoes_tipo_check" CHECK (("tipo" = ANY (ARRAY['agendamento'::"text", 'pagamento'::"text", 'sistema'::"text", 'promocao'::"text"])))
);


ALTER TABLE "public"."notificacoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notificacoes_historico" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "tipo" "text" NOT NULL,
    "mensagem" "text" NOT NULL,
    "lida" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "estabelecimento_id" "uuid"
);


ALTER TABLE "public"."notificacoes_historico" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orcamento_itens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "orcamento_id" "uuid" NOT NULL,
    "descricao" "text" NOT NULL,
    "quantidade" integer NOT NULL,
    "valor_unitario" numeric(10,2) NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "produto_id" "uuid",
    "servico_id" "uuid",
    "pacote_id" "uuid",
    "tipo" "text" NOT NULL,
    "estabelecimento_id" "uuid",
    CONSTRAINT "orcamento_itens_tipo_check" CHECK (("tipo" = ANY (ARRAY['produto'::"text", 'servico'::"text", 'pacote'::"text"])))
);


ALTER TABLE "public"."orcamento_itens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orcamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cliente" "text" NOT NULL,
    "data" "date" NOT NULL,
    "valor_total" numeric(10,2) NOT NULL,
    "observacoes" "text",
    "status" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "cliente_id" "uuid",
    "forma_pagamento" "text",
    "parcelas" integer DEFAULT 1,
    "desconto" numeric(10,2) DEFAULT 0.00,
    "estabelecimento_id" "uuid",
    CONSTRAINT "orcamentos_status_check" CHECK (("status" = ANY (ARRAY['pendente'::"text", 'aprovado'::"text", 'rejeitado'::"text"])))
);


ALTER TABLE "public"."orcamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pacotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "valor" numeric(10,2) NOT NULL,
    "data_cadastro" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "desconto" numeric(10,2) DEFAULT 0.00,
    "estabelecimento_id" "uuid"
);


ALTER TABLE "public"."pacotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pacotes_produtos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pacote_id" "uuid" NOT NULL,
    "produto_id" "uuid" NOT NULL,
    "quantidade" integer NOT NULL,
    "data_cadastro" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "estabelecimento_id" "uuid",
    CONSTRAINT "pacotes_produtos_quantidade_check" CHECK (("quantidade" > 0))
);


ALTER TABLE "public"."pacotes_produtos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pacotes_servicos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pacote_id" "uuid" NOT NULL,
    "servico_id" "uuid" NOT NULL,
    "quantidade" integer NOT NULL,
    "data_cadastro" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "estabelecimento_id" "uuid",
    CONSTRAINT "pacotes_servicos_quantidade_check" CHECK (("quantidade" > 0))
);


ALTER TABLE "public"."pacotes_servicos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissoes_usuario" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "estabelecimento_id" "uuid" NOT NULL,
    "pode_ver_agenda" boolean DEFAULT false,
    "pode_editar_agenda" boolean DEFAULT false,
    "pode_ver_clientes" boolean DEFAULT false,
    "pode_editar_clientes" boolean DEFAULT false,
    "pode_ver_servicos" boolean DEFAULT false,
    "pode_editar_servicos" boolean DEFAULT false,
    "pode_ver_vendas" boolean DEFAULT false,
    "pode_editar_vendas" boolean DEFAULT false,
    "pode_ver_comandas" boolean DEFAULT false,
    "pode_editar_comandas" boolean DEFAULT false,
    "pode_ver_estoque" boolean DEFAULT false,
    "pode_editar_estoque" boolean DEFAULT false,
    "pode_ver_fornecedores" boolean DEFAULT false,
    "pode_editar_fornecedores" boolean DEFAULT false,
    "pode_ver_relatorios" boolean DEFAULT false,
    "pode_ver_configuracoes" boolean DEFAULT false,
    "pode_editar_configuracoes" boolean DEFAULT false,
    "pode_gerenciar_usuarios" boolean DEFAULT false,
    "pode_ver_orcamentos" boolean DEFAULT false,
    "pode_editar_orcamentos" boolean DEFAULT false,
    "pode_ver_pacotes" boolean DEFAULT false,
    "pode_editar_pacotes" boolean DEFAULT false,
    "pode_ver_aniversariantes" boolean DEFAULT false,
    "pode_editar_aniversariantes" boolean DEFAULT false,
    "pode_ver_metas" boolean DEFAULT false,
    "pode_editar_metas" boolean DEFAULT false,
    "pode_ver_despesas" boolean DEFAULT false,
    "pode_editar_despesas" boolean DEFAULT false,
    "pode_ver_agendamentos_online" boolean DEFAULT false,
    "pode_editar_agendamentos_online" boolean DEFAULT false,
    "pode_ver_automacao" boolean DEFAULT false,
    "pode_editar_automacao" boolean DEFAULT false,
    "pode_ver_notificacoes" boolean DEFAULT false,
    "pode_editar_notificacoes" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "pode_ver_comissoes" boolean DEFAULT true,
    "pode_editar_comissoes" boolean DEFAULT true
);


ALTER TABLE "public"."permissoes_usuario" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."produtos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "quantidade" integer DEFAULT 0 NOT NULL,
    "preco" numeric(10,2) NOT NULL,
    "codigo" "text",
    "categoria_id" "uuid",
    "fornecedor_id" "uuid",
    "marca_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "observacoes" "text",
    "quantidade_minima" integer DEFAULT 0,
    "quantidade_estoque" integer DEFAULT 0 NOT NULL,
    "estabelecimento_id" "uuid",
    CONSTRAINT "quantidade_estoque_nao_negativa" CHECK (("quantidade_estoque" >= 0))
);


ALTER TABLE "public"."produtos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."servicos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "preco" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "categoria_id" "uuid",
    "estabelecimento_id" "uuid"
);


ALTER TABLE "public"."servicos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" "uuid" NOT NULL,
    "nome_completo" "text" NOT NULL,
    "email" "text" NOT NULL,
    "telefone" "text",
    "is_principal" boolean DEFAULT false,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "faz_atendimento" boolean DEFAULT false,
    "estabelecimento_id" "uuid",
    "role" "text" DEFAULT 'funcionario'::"text" NOT NULL
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


COMMENT ON COLUMN "public"."usuarios"."faz_atendimento" IS 'Indica se o usuário está disponível para receber agendamentos';



ALTER TABLE ONLY "public"."agendamento_servicos"
    ADD CONSTRAINT "agendamento_servicos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agendamentos"
    ADD CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categorias_produtos"
    ADD CONSTRAINT "categorias_produtos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categorias_servicos"
    ADD CONSTRAINT "categorias_servicos_nome_key" UNIQUE ("nome");



ALTER TABLE ONLY "public"."categorias_servicos"
    ADD CONSTRAINT "categorias_servicos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comandas_itens"
    ADD CONSTRAINT "comandas_itens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comandas"
    ADD CONSTRAINT "comandas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comissoes_registros"
    ADD CONSTRAINT "comissoes_registros_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."configuracoes"
    ADD CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crediario_movimentacoes"
    ADD CONSTRAINT "crediario_movimentacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."estabelecimentos"
    ADD CONSTRAINT "estabelecimentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fornecedores"
    ADD CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."logs_atividades"
    ADD CONSTRAINT "logs_atividades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marcas"
    ADD CONSTRAINT "marcas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notificacoes_historico"
    ADD CONSTRAINT "notificacoes_historico_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notificacoes"
    ADD CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orcamento_itens"
    ADD CONSTRAINT "orcamento_itens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orcamentos"
    ADD CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pacotes"
    ADD CONSTRAINT "pacotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pacotes_produtos"
    ADD CONSTRAINT "pacotes_produtos_pacote_id_produto_id_key" UNIQUE ("pacote_id", "produto_id");



ALTER TABLE ONLY "public"."pacotes_produtos"
    ADD CONSTRAINT "pacotes_produtos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pacotes_servicos"
    ADD CONSTRAINT "pacotes_servicos_pacote_id_servico_id_key" UNIQUE ("pacote_id", "servico_id");



ALTER TABLE ONLY "public"."pacotes_servicos"
    ADD CONSTRAINT "pacotes_servicos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissoes_usuario"
    ADD CONSTRAINT "permissoes_usuario_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissoes_usuario"
    ADD CONSTRAINT "permissoes_usuario_user_id_estabelecimento_id_key" UNIQUE ("user_id", "estabelecimento_id");



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "produtos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."servicos"
    ADD CONSTRAINT "servicos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



CREATE INDEX "fornecedores_cnpj_idx" ON "public"."fornecedores" USING "btree" ("cnpj");



CREATE INDEX "fornecedores_nome_idx" ON "public"."fornecedores" USING "btree" ("nome");



CREATE INDEX "idx_agendamento_servicos_agendamento_id" ON "public"."agendamento_servicos" USING "btree" ("agendamento_id");



CREATE INDEX "idx_agendamentos_data_hora" ON "public"."agendamentos" USING "btree" ("data_hora");



CREATE INDEX "idx_agendamentos_data_horario" ON "public"."agendamentos" USING "btree" ("data_hora", "horario_termino");



CREATE INDEX "idx_agendamentos_status" ON "public"."agendamentos" USING "btree" ("status");



CREATE INDEX "idx_categorias_servicos_nome" ON "public"."categorias_servicos" USING "btree" ("nome");



CREATE INDEX "idx_clientes_estabelecimento_id" ON "public"."clientes" USING "btree" ("estabelecimento_id");



CREATE INDEX "idx_clientes_nome_gin" ON "public"."clientes" USING "gin" ("nome" "public"."gin_trgm_ops");



CREATE INDEX "idx_clientes_telefone" ON "public"."clientes" USING "btree" ("telefone");



CREATE INDEX "idx_comandas_cliente_id" ON "public"."comandas" USING "btree" ("cliente_id");



CREATE INDEX "idx_comandas_itens_comanda_id" ON "public"."comandas_itens" USING "btree" ("comanda_id");



CREATE INDEX "idx_comandas_status" ON "public"."comandas" USING "btree" ("status");



CREATE INDEX "idx_comissoes_registros_data" ON "public"."comissoes_registros" USING "btree" ("data");



CREATE INDEX "idx_comissoes_registros_estabelecimento" ON "public"."comissoes_registros" USING "btree" ("estabelecimento_id");



CREATE INDEX "idx_comissoes_registros_usuario" ON "public"."comissoes_registros" USING "btree" ("usuario_id");



CREATE INDEX "idx_configuracoes_estabelecimento_id" ON "public"."configuracoes" USING "btree" ("estabelecimento_id");



CREATE INDEX "idx_estabelecimentos_status" ON "public"."estabelecimentos" USING "btree" ("status");



CREATE INDEX "idx_logs_atividades_created_at" ON "public"."logs_atividades" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_logs_atividades_estabelecimento_id" ON "public"."logs_atividades" USING "btree" ("estabelecimento_id");



CREATE INDEX "idx_marcas_nome" ON "public"."marcas" USING "btree" ("nome");



CREATE INDEX "idx_marcas_user_id" ON "public"."marcas" USING "btree" ("user_id");



CREATE INDEX "idx_notificacoes_created_at" ON "public"."notificacoes" USING "btree" ("created_at");



CREATE INDEX "idx_notificacoes_historico_lida" ON "public"."notificacoes_historico" USING "btree" ("lida");



CREATE INDEX "idx_notificacoes_historico_usuario_id" ON "public"."notificacoes_historico" USING "btree" ("usuario_id");



CREATE INDEX "idx_orcamento_itens_orcamento_id" ON "public"."orcamento_itens" USING "btree" ("orcamento_id");



CREATE INDEX "idx_orcamento_itens_pacote_id" ON "public"."orcamento_itens" USING "btree" ("pacote_id");



CREATE INDEX "idx_orcamento_itens_produto_id" ON "public"."orcamento_itens" USING "btree" ("produto_id");



CREATE INDEX "idx_orcamento_itens_servico_id" ON "public"."orcamento_itens" USING "btree" ("servico_id");



CREATE INDEX "idx_orcamento_itens_tipo" ON "public"."orcamento_itens" USING "btree" ("tipo");



CREATE INDEX "idx_orcamentos_data" ON "public"."orcamentos" USING "btree" ("data");



CREATE INDEX "idx_orcamentos_status" ON "public"."orcamentos" USING "btree" ("status");



CREATE INDEX "idx_pacotes_nome" ON "public"."pacotes" USING "btree" ("nome");



CREATE INDEX "idx_pacotes_produtos_pacote_id" ON "public"."pacotes_produtos" USING "btree" ("pacote_id");



CREATE INDEX "idx_pacotes_produtos_produto_id" ON "public"."pacotes_produtos" USING "btree" ("produto_id");



CREATE INDEX "idx_pacotes_servicos_pacote_id" ON "public"."pacotes_servicos" USING "btree" ("pacote_id");



CREATE INDEX "idx_pacotes_servicos_servico_id" ON "public"."pacotes_servicos" USING "btree" ("servico_id");



CREATE INDEX "idx_permissoes_usuario_estabelecimento_id" ON "public"."permissoes_usuario" USING "btree" ("estabelecimento_id");



CREATE INDEX "idx_permissoes_usuario_user_id" ON "public"."permissoes_usuario" USING "btree" ("user_id");



CREATE INDEX "idx_produtos_categoria_id" ON "public"."produtos" USING "btree" ("categoria_id");



CREATE INDEX "idx_produtos_fornecedor_id" ON "public"."produtos" USING "btree" ("fornecedor_id");



CREATE INDEX "idx_produtos_marca_id" ON "public"."produtos" USING "btree" ("marca_id");



CREATE INDEX "idx_servicos_categoria_id" ON "public"."servicos" USING "btree" ("categoria_id");



CREATE INDEX "idx_servicos_nome" ON "public"."servicos" USING "btree" ("nome");



CREATE INDEX "idx_usuarios_estabelecimento_id" ON "public"."usuarios" USING "btree" ("estabelecimento_id");



CREATE INDEX "idx_usuarios_faz_atendimento" ON "public"."usuarios" USING "btree" ("faz_atendimento");



CREATE INDEX "idx_usuarios_role" ON "public"."usuarios" USING "btree" ("role");



CREATE INDEX "marcas_user_id_idx" ON "public"."marcas" USING "btree" ("user_id");



CREATE INDEX "produtos_categoria_id_idx" ON "public"."produtos" USING "btree" ("categoria_id");



CREATE INDEX "produtos_fornecedor_id_idx" ON "public"."produtos" USING "btree" ("fornecedor_id");



CREATE INDEX "produtos_marca_id_idx" ON "public"."produtos" USING "btree" ("marca_id");



CREATE OR REPLACE TRIGGER "comandas_set_uuid" BEFORE INSERT ON "public"."comandas" FOR EACH ROW WHEN (("new"."id" IS NULL)) EXECUTE FUNCTION "public"."trigger_set_uuid"();



CREATE OR REPLACE TRIGGER "trigger_atualizar_data_fechamento" BEFORE UPDATE ON "public"."comandas" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_data_fechamento"();



CREATE OR REPLACE TRIGGER "trigger_update_permissoes_usuario_updated_at" BEFORE UPDATE ON "public"."permissoes_usuario" FOR EACH ROW EXECUTE FUNCTION "public"."update_permissoes_usuario_updated_at"();



CREATE OR REPLACE TRIGGER "update_categorias_produtos_updated_at" BEFORE UPDATE ON "public"."categorias_produtos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_categorias_servicos_updated_at" BEFORE UPDATE ON "public"."categorias_servicos" FOR EACH ROW EXECUTE FUNCTION "public"."update_categorias_servicos_updated_at"();



CREATE OR REPLACE TRIGGER "update_clientes_updated_at" BEFORE UPDATE ON "public"."clientes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_marcas_updated_at" BEFORE UPDATE ON "public"."marcas" FOR EACH ROW EXECUTE FUNCTION "public"."update_marcas_updated_at"();



CREATE OR REPLACE TRIGGER "update_orcamento_itens_updated_at" BEFORE UPDATE ON "public"."orcamento_itens" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orcamentos_updated_at" BEFORE UPDATE ON "public"."orcamentos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_produtos_updated_at" BEFORE UPDATE ON "public"."produtos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_servicos_updated_at" BEFORE UPDATE ON "public"."servicos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."agendamento_servicos"
    ADD CONSTRAINT "agendamento_servicos_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agendamento_servicos"
    ADD CONSTRAINT "agendamento_servicos_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id");



ALTER TABLE ONLY "public"."agendamentos"
    ADD CONSTRAINT "agendamentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comandas"
    ADD CONSTRAINT "comandas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comandas"
    ADD CONSTRAINT "comandas_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comandas_itens"
    ADD CONSTRAINT "comandas_itens_comanda_id_fkey" FOREIGN KEY ("comanda_id") REFERENCES "public"."comandas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comissoes_registros"
    ADD CONSTRAINT "comissoes_registros_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "public"."estabelecimentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comissoes_registros"
    ADD CONSTRAINT "comissoes_registros_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."configuracoes"
    ADD CONSTRAINT "configuracoes_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "public"."estabelecimentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crediario_movimentacoes"
    ADD CONSTRAINT "crediario_movimentacoes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id");



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "fk_categoria" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_produtos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "fk_clientes_estabelecimento" FOREIGN KEY ("estabelecimento_id") REFERENCES "public"."estabelecimentos"("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "fk_estabelecimento" FOREIGN KEY ("estabelecimento_id") REFERENCES "public"."estabelecimentos"("id");



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "fk_fornecedor" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "fk_marca" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."logs_atividades"
    ADD CONSTRAINT "logs_atividades_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "public"."estabelecimentos"("id");



ALTER TABLE ONLY "public"."logs_atividades"
    ADD CONSTRAINT "logs_atividades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."marcas"
    ADD CONSTRAINT "marcas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notificacoes_historico"
    ADD CONSTRAINT "notificacoes_historico_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orcamento_itens"
    ADD CONSTRAINT "orcamento_itens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."orcamento_itens"
    ADD CONSTRAINT "orcamento_itens_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orcamento_itens"
    ADD CONSTRAINT "orcamento_itens_pacote_id_fkey" FOREIGN KEY ("pacote_id") REFERENCES "public"."pacotes"("id");



ALTER TABLE ONLY "public"."orcamento_itens"
    ADD CONSTRAINT "orcamento_itens_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id");



ALTER TABLE ONLY "public"."orcamento_itens"
    ADD CONSTRAINT "orcamento_itens_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id");



ALTER TABLE ONLY "public"."orcamentos"
    ADD CONSTRAINT "orcamentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id");



ALTER TABLE ONLY "public"."orcamentos"
    ADD CONSTRAINT "orcamentos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pacotes_produtos"
    ADD CONSTRAINT "pacotes_produtos_pacote_id_fkey" FOREIGN KEY ("pacote_id") REFERENCES "public"."pacotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pacotes_produtos"
    ADD CONSTRAINT "pacotes_produtos_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pacotes_servicos"
    ADD CONSTRAINT "pacotes_servicos_pacote_id_fkey" FOREIGN KEY ("pacote_id") REFERENCES "public"."pacotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pacotes_servicos"
    ADD CONSTRAINT "pacotes_servicos_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permissoes_usuario"
    ADD CONSTRAINT "permissoes_usuario_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "public"."estabelecimentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permissoes_usuario"
    ADD CONSTRAINT "permissoes_usuario_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."servicos"
    ADD CONSTRAINT "servicos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_servicos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



CREATE POLICY "Acesso restrito para usuários normais" ON "public"."estabelecimentos" USING (("id" = ( SELECT "usuarios"."estabelecimento_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = "auth"."uid"()))));



CREATE POLICY "Acesso total para super_admin" ON "public"."estabelecimentos" USING ("public"."is_super_admin"());



CREATE POLICY "Acesso total para super_admin em produtos" ON "public"."produtos" USING ("public"."is_super_admin"());



CREATE POLICY "Apenas admins podem atualizar permissões" ON "public"."permissoes_usuario" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"text") AND ("u"."estabelecimento_id" = "permissoes_usuario"."estabelecimento_id")))));



CREATE POLICY "Apenas admins podem criar permissões" ON "public"."permissoes_usuario" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"text") AND ("u"."estabelecimento_id" = "permissoes_usuario"."estabelecimento_id")))));



CREATE POLICY "Apenas admins podem deletar permissões" ON "public"."permissoes_usuario" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"text") AND ("u"."estabelecimento_id" = "permissoes_usuario"."estabelecimento_id")))));



CREATE POLICY "Enable insert for authenticated users" ON "public"."categorias_servicos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable select for authenticated users" ON "public"."categorias_servicos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir atualização do próprio estabelecimento" ON "public"."estabelecimentos" FOR UPDATE USING (("id" = ( SELECT "usuarios"."estabelecimento_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = "auth"."uid"())))) WITH CHECK (("id" = ( SELECT "usuarios"."estabelecimento_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = "auth"."uid"()))));



CREATE POLICY "Permitir atualização para membros do estabelecimento" ON "public"."clientes" FOR UPDATE USING (("estabelecimento_id" IN ( SELECT "usuarios"."estabelecimento_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = "auth"."uid"()))));



CREATE POLICY "Permitir deleção para membros do estabelecimento" ON "public"."clientes" FOR DELETE USING (("estabelecimento_id" IN ( SELECT "usuarios"."estabelecimento_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = "auth"."uid"()))));



CREATE POLICY "Permitir inserção para membros do estabelecimento" ON "public"."clientes" FOR INSERT WITH CHECK (("estabelecimento_id" IN ( SELECT "usuarios"."estabelecimento_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = "auth"."uid"()))));



CREATE POLICY "Permitir leitura do próprio estabelecimento" ON "public"."estabelecimentos" FOR SELECT USING (("id" = ( SELECT "usuarios"."estabelecimento_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = "auth"."uid"()))));



CREATE POLICY "Permitir leitura para membros do estabelecimento" ON "public"."clientes" FOR SELECT USING (("estabelecimento_id" IN ( SELECT "usuarios"."estabelecimento_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = "auth"."uid"()))));



CREATE POLICY "Super admin pode deletar estabelecimentos" ON "public"."estabelecimentos" FOR DELETE USING ("public"."is_super_admin"());



CREATE POLICY "Super admin pode ver todos os logs" ON "public"."logs_atividades" FOR SELECT USING ("public"."is_super_admin"());



CREATE POLICY "Users can delete their own marcas" ON "public"."marcas" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own orcamento_itens" ON "public"."orcamento_itens" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."orcamentos"
  WHERE (("orcamentos"."id" = "orcamento_itens"."orcamento_id") AND ("orcamentos"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own orcamentos" ON "public"."orcamentos" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert their own marcas" ON "public"."marcas" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own orcamento_itens" ON "public"."orcamento_itens" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orcamentos"
  WHERE (("orcamentos"."id" = "orcamento_itens"."orcamento_id") AND ("orcamentos"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can insert their own orcamentos" ON "public"."orcamentos" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own marcas" ON "public"."marcas" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own orcamento_itens" ON "public"."orcamento_itens" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."orcamentos"
  WHERE (("orcamentos"."id" = "orcamento_itens"."orcamento_id") AND ("orcamentos"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can update their own orcamentos" ON "public"."orcamentos" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can view their own marcas" ON "public"."marcas" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own orcamento_itens" ON "public"."orcamento_itens" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orcamentos"
  WHERE (("orcamentos"."id" = "orcamento_itens"."orcamento_id") AND ("orcamentos"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can view their own orcamentos" ON "public"."orcamentos" FOR SELECT USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Usuários autenticados podem atualizar em pacotes_produtos" ON "public"."pacotes_produtos" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Usuários autenticados podem atualizar em pacotes_servicos" ON "public"."pacotes_servicos" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Usuários autenticados podem deletar em pacotes_produtos" ON "public"."pacotes_produtos" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Usuários autenticados podem deletar em pacotes_servicos" ON "public"."pacotes_servicos" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Usuários autenticados podem inserir em pacotes_produtos" ON "public"."pacotes_produtos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Usuários autenticados podem inserir em pacotes_servicos" ON "public"."pacotes_servicos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Usuários autenticados podem selecionar em pacotes_produtos" ON "public"."pacotes_produtos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Usuários autenticados podem selecionar em pacotes_servicos" ON "public"."pacotes_servicos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Usuários podem atualizar agendamento_servicos do próprio esta" ON "public"."agendamento_servicos" FOR UPDATE USING (("estabelecimento_id" IN ( SELECT "usuarios"."estabelecimento_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = "auth"."uid"()))));



CREATE POLICY "Usuários podem atualizar agendamentos do próprio estabelecime" ON "public"."agendamentos" FOR UPDATE USING (("estabelecimento_id" IN ( SELECT "usuarios"."estabelecimento_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = "auth"."uid"()))));



CREATE POLICY "Usuários podem atualizar comissões do seu estabelecimento" ON "public"."comissoes_registros" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "comissoes_registros"."estabelecimento_id")))));



CREATE POLICY "Usuários podem atualizar configurações do seu estabeleciment" ON "public"."configuracoes" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "configuracoes"."estabelecimento_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "configuracoes"."estabelecimento_id")))));



CREATE POLICY "Usuários podem atualizar suas próprias marcas" ON "public"."marcas" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem atualizar suas próprias notificações" ON "public"."notificacoes_historico" FOR UPDATE USING (("auth"."uid"() = "usuario_id")) WITH CHECK (("auth"."uid"() = "usuario_id"));



CREATE POLICY "Usuários podem deletar agendamento_servicos do próprio estabe" ON "public"."agendamento_servicos" FOR DELETE USING (("estabelecimento_id" IN ( SELECT "usuarios"."estabelecimento_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = "auth"."uid"()))));



CREATE POLICY "Usuários podem deletar agendamentos do próprio estabeleciment" ON "public"."agendamentos" FOR DELETE USING (("estabelecimento_id" IN ( SELECT "usuarios"."estabelecimento_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = "auth"."uid"()))));



CREATE POLICY "Usuários podem deletar comissões do seu estabelecimento" ON "public"."comissoes_registros" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "comissoes_registros"."estabelecimento_id")))));



CREATE POLICY "Usuários podem deletar suas próprias notificações" ON "public"."notificacoes_historico" FOR DELETE USING (("auth"."uid"() = "usuario_id"));



CREATE POLICY "Usuários podem excluir configurações do seu estabelecimento" ON "public"."configuracoes" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "configuracoes"."estabelecimento_id")))));



CREATE POLICY "Usuários podem excluir suas próprias marcas" ON "public"."marcas" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem inserir agendamento_servicos no próprio estabe" ON "public"."agendamento_servicos" FOR INSERT WITH CHECK (("estabelecimento_id" IN ( SELECT "usuarios"."estabelecimento_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = "auth"."uid"()))));



CREATE POLICY "Usuários podem inserir agendamentos no próprio estabeleciment" ON "public"."agendamentos" FOR INSERT WITH CHECK (("estabelecimento_id" IN ( SELECT "usuarios"."estabelecimento_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = "auth"."uid"()))));



CREATE POLICY "Usuários podem inserir comissões do seu estabelecimento" ON "public"."comissoes_registros" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "comissoes_registros"."estabelecimento_id")))));



CREATE POLICY "Usuários podem inserir configurações do seu estabelecimento" ON "public"."configuracoes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "configuracoes"."estabelecimento_id")))));



CREATE POLICY "Usuários podem inserir suas próprias marcas" ON "public"."marcas" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem inserir suas próprias notificações" ON "public"."notificacoes_historico" FOR INSERT WITH CHECK (("auth"."uid"() = "usuario_id"));



CREATE POLICY "Usuários podem ver agendamento_servicos do próprio estabeleci" ON "public"."agendamento_servicos" FOR SELECT USING (("estabelecimento_id" IN ( SELECT "usuarios"."estabelecimento_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = "auth"."uid"()))));



CREATE POLICY "Usuários podem ver agendamentos do próprio estabelecimento" ON "public"."agendamentos" FOR SELECT USING (("estabelecimento_id" IN ( SELECT "usuarios"."estabelecimento_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = "auth"."uid"()))));



CREATE POLICY "Usuários podem ver comissões do seu estabelecimento" ON "public"."comissoes_registros" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "comissoes_registros"."estabelecimento_id")))));



CREATE POLICY "Usuários podem ver suas próprias marcas" ON "public"."marcas" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem ver suas próprias notificações" ON "public"."notificacoes_historico" FOR SELECT USING (("auth"."uid"() = "usuario_id"));



CREATE POLICY "Usuários podem ver suas próprias permissões" ON "public"."permissoes_usuario" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"text") AND ("u"."estabelecimento_id" = "permissoes_usuario"."estabelecimento_id"))))));



CREATE POLICY "Usuários podem visualizar comandas do seu estabelecimento" ON "public"."comandas" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "comandas"."estabelecimento_id")))));



CREATE POLICY "Usuários podem visualizar configurações do seu estabelecimen" ON "public"."configuracoes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "configuracoes"."estabelecimento_id")))));



ALTER TABLE "public"."agendamento_servicos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agendamentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categorias_produtos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categorias_servicos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comandas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comandas_itens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comissoes_registros" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."configuracoes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "del_categorias_produtos" ON "public"."categorias_produtos" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "categorias_produtos"."estabelecimento_id")))));



CREATE POLICY "del_categorias_servicos" ON "public"."categorias_servicos" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "categorias_servicos"."estabelecimento_id")))));



CREATE POLICY "del_fornecedores" ON "public"."fornecedores" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "fornecedores"."estabelecimento_id")))));



CREATE POLICY "del_marcas" ON "public"."marcas" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "marcas"."estabelecimento_id")))));



CREATE POLICY "del_pacotes" ON "public"."pacotes" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "pacotes"."estabelecimento_id")))));



CREATE POLICY "del_pacotes_produtos" ON "public"."pacotes_produtos" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "pacotes_produtos"."estabelecimento_id")))));



CREATE POLICY "del_pacotes_servicos" ON "public"."pacotes_servicos" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "pacotes_servicos"."estabelecimento_id")))));



CREATE POLICY "del_produtos" ON "public"."produtos" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "produtos"."estabelecimento_id")))));



CREATE POLICY "del_servicos" ON "public"."servicos" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "servicos"."estabelecimento_id")))));



ALTER TABLE "public"."estabelecimentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fornecedores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ins_categorias_produtos" ON "public"."categorias_produtos" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "categorias_produtos"."estabelecimento_id")))));



CREATE POLICY "ins_categorias_servicos" ON "public"."categorias_servicos" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "categorias_servicos"."estabelecimento_id")))));



CREATE POLICY "ins_fornecedores" ON "public"."fornecedores" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "fornecedores"."estabelecimento_id")))));



CREATE POLICY "ins_marcas" ON "public"."marcas" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "marcas"."estabelecimento_id")))));



CREATE POLICY "ins_pacotes" ON "public"."pacotes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "pacotes"."estabelecimento_id")))));



CREATE POLICY "ins_pacotes_produtos" ON "public"."pacotes_produtos" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "pacotes_produtos"."estabelecimento_id")))));



CREATE POLICY "ins_pacotes_servicos" ON "public"."pacotes_servicos" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "pacotes_servicos"."estabelecimento_id")))));



CREATE POLICY "ins_produtos" ON "public"."produtos" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "produtos"."estabelecimento_id")))));



CREATE POLICY "ins_servicos" ON "public"."servicos" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "servicos"."estabelecimento_id")))));



ALTER TABLE "public"."marcas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notificacoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notificacoes_historico" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orcamento_itens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orcamentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pacotes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pacotes_produtos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pacotes_servicos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissoes_usuario" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."produtos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sel_categorias_produtos" ON "public"."categorias_produtos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "categorias_produtos"."estabelecimento_id")))));



CREATE POLICY "sel_categorias_servicos" ON "public"."categorias_servicos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "categorias_servicos"."estabelecimento_id")))));



CREATE POLICY "sel_fornecedores" ON "public"."fornecedores" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "fornecedores"."estabelecimento_id")))));



CREATE POLICY "sel_marcas" ON "public"."marcas" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "marcas"."estabelecimento_id")))));



CREATE POLICY "sel_pacotes" ON "public"."pacotes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "pacotes"."estabelecimento_id")))));



CREATE POLICY "sel_pacotes_produtos" ON "public"."pacotes_produtos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "pacotes_produtos"."estabelecimento_id")))));



CREATE POLICY "sel_pacotes_servicos" ON "public"."pacotes_servicos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "pacotes_servicos"."estabelecimento_id")))));



CREATE POLICY "sel_produtos" ON "public"."produtos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "produtos"."estabelecimento_id")))));



CREATE POLICY "sel_servicos" ON "public"."servicos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "servicos"."estabelecimento_id")))));



ALTER TABLE "public"."servicos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "upd_categorias_produtos" ON "public"."categorias_produtos" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "categorias_produtos"."estabelecimento_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "categorias_produtos"."estabelecimento_id")))));



CREATE POLICY "upd_categorias_servicos" ON "public"."categorias_servicos" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "categorias_servicos"."estabelecimento_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "categorias_servicos"."estabelecimento_id")))));



CREATE POLICY "upd_fornecedores" ON "public"."fornecedores" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "fornecedores"."estabelecimento_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "fornecedores"."estabelecimento_id")))));



CREATE POLICY "upd_marcas" ON "public"."marcas" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "marcas"."estabelecimento_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "marcas"."estabelecimento_id")))));



CREATE POLICY "upd_pacotes" ON "public"."pacotes" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "pacotes"."estabelecimento_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "pacotes"."estabelecimento_id")))));



CREATE POLICY "upd_pacotes_produtos" ON "public"."pacotes_produtos" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "pacotes_produtos"."estabelecimento_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "pacotes_produtos"."estabelecimento_id")))));



CREATE POLICY "upd_pacotes_servicos" ON "public"."pacotes_servicos" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "pacotes_servicos"."estabelecimento_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "pacotes_servicos"."estabelecimento_id")))));



CREATE POLICY "upd_produtos" ON "public"."produtos" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "produtos"."estabelecimento_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "produtos"."estabelecimento_id")))));



CREATE POLICY "upd_servicos" ON "public"."servicos" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "servicos"."estabelecimento_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."estabelecimento_id" = "servicos"."estabelecimento_id")))));



ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "usuarios_delete_definitivo" ON "public"."usuarios" FOR DELETE TO "authenticated" USING (("public"."is_super_admin"() = true));



CREATE POLICY "usuarios_insert_definitivo" ON "public"."usuarios" FOR INSERT TO "authenticated" WITH CHECK ((("public"."is_super_admin"() = true) OR (EXISTS ( SELECT 1
   FROM "public"."usuarios" "usuarios_1"
  WHERE (("usuarios_1"."id" = "auth"."uid"()) AND (("usuarios_1"."role" = 'admin'::"text") OR ("usuarios_1"."is_principal" = true)))
 LIMIT 1))));



CREATE POLICY "usuarios_podem_atualizar_comandas_estabelecimento" ON "public"."comandas" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "comandas"."estabelecimento_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "comandas"."estabelecimento_id")))));



CREATE POLICY "usuarios_podem_atualizar_itens_comandas_estabelecimento" ON "public"."comandas_itens" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "comandas_itens"."estabelecimento_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "comandas_itens"."estabelecimento_id")))));



CREATE POLICY "usuarios_podem_excluir_comandas_estabelecimento" ON "public"."comandas" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "comandas"."estabelecimento_id")))));



CREATE POLICY "usuarios_podem_excluir_itens_comandas_estabelecimento" ON "public"."comandas_itens" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "comandas_itens"."estabelecimento_id")))));



CREATE POLICY "usuarios_podem_inserir_comandas_estabelecimento" ON "public"."comandas" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "comandas"."estabelecimento_id")))));



CREATE POLICY "usuarios_podem_inserir_itens_comandas_estabelecimento" ON "public"."comandas_itens" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "comandas_itens"."estabelecimento_id")))));



CREATE POLICY "usuarios_podem_ver_comandas_estabelecimento" ON "public"."comandas" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "comandas"."estabelecimento_id")))));



CREATE POLICY "usuarios_podem_ver_itens_comandas_estabelecimento" ON "public"."comandas_itens" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND ("usuarios"."estabelecimento_id" = "comandas_itens"."estabelecimento_id")))));



CREATE POLICY "usuarios_select_definitivo" ON "public"."usuarios" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR ("estabelecimento_id" = "public"."get_user_estabelecimento_id"()) OR ("public"."is_super_admin"() = true)));



CREATE POLICY "usuarios_update_definitivo" ON "public"."usuarios" FOR UPDATE TO "authenticated" USING ((("id" = "auth"."uid"()) OR ("public"."is_super_admin"() = true))) WITH CHECK ((("id" = "auth"."uid"()) OR ("public"."is_super_admin"() = true)));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."atualizar_data_fechamento"() TO "anon";
GRANT ALL ON FUNCTION "public"."atualizar_data_fechamento"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualizar_data_fechamento"() TO "service_role";



GRANT ALL ON FUNCTION "public"."atualizar_foto_usuario"("usuario_id" "uuid", "nova_foto_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."atualizar_foto_usuario"("usuario_id" "uuid", "nova_foto_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualizar_foto_usuario"("usuario_id" "uuid", "nova_foto_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."atualizar_usuario"("p_usuario_id" "uuid", "p_nome_completo" "text", "p_email" "text", "p_cargo" "text", "p_nivel_acesso_id" "text", "p_foto_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."atualizar_usuario"("p_usuario_id" "uuid", "p_nome_completo" "text", "p_email" "text", "p_cargo" "text", "p_nivel_acesso_id" "text", "p_foto_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualizar_usuario"("p_usuario_id" "uuid", "p_nome_completo" "text", "p_email" "text", "p_cargo" "text", "p_nivel_acesso_id" "text", "p_foto_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."banir_conta"("p_estabelecimento_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."banir_conta"("p_estabelecimento_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."banir_conta"("p_estabelecimento_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."buscar_agendamentos_completos"("data_inicio" timestamp with time zone, "data_fim" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."buscar_agendamentos_completos"("data_inicio" timestamp with time zone, "data_fim" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."buscar_agendamentos_completos"("data_inicio" timestamp with time zone, "data_fim" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."buscar_agendamentos_completos"("p_data_inicio" timestamp with time zone, "p_data_fim" timestamp with time zone, "p_profissional_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."buscar_agendamentos_completos"("p_data_inicio" timestamp with time zone, "p_data_fim" timestamp with time zone, "p_profissional_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."buscar_agendamentos_completos"("p_data_inicio" timestamp with time zone, "p_data_fim" timestamp with time zone, "p_profissional_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."buscar_clientes_completos"("filtro" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."buscar_clientes_completos"("filtro" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."buscar_clientes_completos"("filtro" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."buscar_comandas_completas"("data_inicio" "date", "data_fim" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."buscar_comandas_completas"("data_inicio" "date", "data_fim" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."buscar_comandas_completas"("data_inicio" "date", "data_fim" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."buscar_comandas_completas"("p_data_inicio" timestamp with time zone, "p_data_fim" timestamp with time zone, "p_status" "text", "p_cliente_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."buscar_comandas_completas"("p_data_inicio" timestamp with time zone, "p_data_fim" timestamp with time zone, "p_status" "text", "p_cliente_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."buscar_comandas_completas"("p_data_inicio" timestamp with time zone, "p_data_fim" timestamp with time zone, "p_status" "text", "p_cliente_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."buscar_orcamentos_completos"("data_inicio" "date", "data_fim" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."buscar_orcamentos_completos"("data_inicio" "date", "data_fim" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."buscar_orcamentos_completos"("data_inicio" "date", "data_fim" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_ownership"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_ownership"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_ownership"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_user_data"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_user_data"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_user_data"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."contar_todos_usuarios"() TO "anon";
GRANT ALL ON FUNCTION "public"."contar_todos_usuarios"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."contar_todos_usuarios"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_new_organization"("user_id" "uuid", "org_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_new_organization"("user_id" "uuid", "org_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_new_organization"("user_id" "uuid", "org_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_usuarios_table"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_usuarios_table"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_usuarios_table"() TO "service_role";



GRANT ALL ON FUNCTION "public"."criar_nova_conta"("p_nome_estabelecimento" "text", "p_tipo_documento" "text", "p_numero_documento" "text", "p_telefone" "text", "p_segmento" "text", "p_nome_usuario" "text", "p_email" "text", "p_usuario_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."criar_nova_conta"("p_nome_estabelecimento" "text", "p_tipo_documento" "text", "p_numero_documento" "text", "p_telefone" "text", "p_segmento" "text", "p_nome_usuario" "text", "p_email" "text", "p_usuario_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."criar_nova_conta"("p_nome_estabelecimento" "text", "p_tipo_documento" "text", "p_numero_documento" "text", "p_telefone" "text", "p_segmento" "text", "p_nome_usuario" "text", "p_email" "text", "p_usuario_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_old_avatar"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_old_avatar"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_old_avatar"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_and_data"("user_id_to_delete" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_and_data"("user_id_to_delete" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_and_data"("user_id_to_delete" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_by_email"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_by_email"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_by_email"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_complete"("email_to_delete" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_complete"("email_to_delete" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_complete"("email_to_delete" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_completely"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_completely"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_completely"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."excluir_usuario"("usuario_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."excluir_usuario"("usuario_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."excluir_usuario"("usuario_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_migration"("migration_name" "text", "migration_script" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_migration"("migration_name" "text", "migration_script" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_migration"("migration_name" "text", "migration_script" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."finalizar_comanda"("p_comanda_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."finalizar_comanda"("p_comanda_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."finalizar_comanda"("p_comanda_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_agenda_profissional"("profissional_id" "uuid", "data_inicio" "date", "data_fim" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_agenda_profissional"("profissional_id" "uuid", "data_inicio" "date", "data_fim" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agenda_profissional"("profissional_id" "uuid", "data_inicio" "date", "data_fim" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_agendamentos_com_usuarios"("p_estabelecimento_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_agendamentos_com_usuarios"("p_estabelecimento_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agendamentos_com_usuarios"("p_estabelecimento_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cliente_completo"("cliente_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cliente_completo"("cliente_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cliente_completo"("cliente_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_produtos_baixo_estoque"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_produtos_baixo_estoque"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_produtos_baixo_estoque"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_proximos_agendamentos"("p_estabelecimento_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_proximos_agendamentos"("p_estabelecimento_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_proximos_agendamentos"("p_estabelecimento_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_relatorio_vendas"("data_inicio" "date", "data_fim" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_relatorio_vendas"("data_inicio" "date", "data_fim" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_relatorio_vendas"("data_inicio" "date", "data_fim" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_estabelecimento_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_estabelecimento_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_estabelecimento_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_organization_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_organization_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organization_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_usuarios_estabelecimento"("estabelecimento_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_usuarios_estabelecimento"("estabelecimento_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_usuarios_estabelecimento"("estabelecimento_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."list_triggers"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_triggers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_triggers"() TO "service_role";



GRANT ALL ON FUNCTION "public"."obter_dados_usuario"("usuario_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."obter_dados_usuario"("usuario_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."obter_dados_usuario"("usuario_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."produtos_baixo_estoque"() TO "anon";
GRANT ALL ON FUNCTION "public"."produtos_baixo_estoque"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."produtos_baixo_estoque"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reativar_conta"("p_estabelecimento_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reativar_conta"("p_estabelecimento_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reativar_conta"("p_estabelecimento_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_user_id_on_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_user_id_on_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_id_on_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."suspender_conta"("p_estabelecimento_id" "uuid", "p_suspensa_ate" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."suspender_conta"("p_estabelecimento_id" "uuid", "p_suspensa_ate" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."suspender_conta"("p_estabelecimento_id" "uuid", "p_suspensa_ate" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_uuid"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_uuid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_uuid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_cadastro_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_cadastro_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_cadastro_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_categorias_produtos_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_categorias_produtos_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_categorias_produtos_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_categorias_servicos_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_categorias_servicos_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_categorias_servicos_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_comanda_valor_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_comanda_valor_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_comanda_valor_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_estabelecimento_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_estabelecimento_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_estabelecimento_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_fornecedores_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_fornecedores_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_fornecedores_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_marcas_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_marcas_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_marcas_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_permissoes_usuario_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_permissoes_usuario_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_permissoes_usuario_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_produtos_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_produtos_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_produtos_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_usuario_estabelecimento"("usuario_id" "uuid", "p_nome_completo" "text", "p_email" "text", "p_telefone" "text", "p_avatar_url" "text", "p_role" "text", "p_faz_atendimento" boolean, "p_estabelecimento_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_usuario_estabelecimento"("usuario_id" "uuid", "p_nome_completo" "text", "p_email" "text", "p_telefone" "text", "p_avatar_url" "text", "p_role" "text", "p_faz_atendimento" boolean, "p_estabelecimento_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_usuario_estabelecimento"("usuario_id" "uuid", "p_nome_completo" "text", "p_email" "text", "p_telefone" "text", "p_avatar_url" "text", "p_role" "text", "p_faz_atendimento" boolean, "p_estabelecimento_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."verificar_permissoes_usuario"("usuario_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."verificar_permissoes_usuario"("usuario_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verificar_permissoes_usuario"("usuario_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";



























GRANT ALL ON TABLE "public"."agendamento_servicos" TO "anon";
GRANT ALL ON TABLE "public"."agendamento_servicos" TO "authenticated";
GRANT ALL ON TABLE "public"."agendamento_servicos" TO "service_role";



GRANT ALL ON TABLE "public"."agendamentos" TO "anon";
GRANT ALL ON TABLE "public"."agendamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."agendamentos" TO "service_role";



GRANT ALL ON TABLE "public"."categorias_produtos" TO "anon";
GRANT ALL ON TABLE "public"."categorias_produtos" TO "authenticated";
GRANT ALL ON TABLE "public"."categorias_produtos" TO "service_role";



GRANT ALL ON TABLE "public"."categorias_servicos" TO "anon";
GRANT ALL ON TABLE "public"."categorias_servicos" TO "authenticated";
GRANT ALL ON TABLE "public"."categorias_servicos" TO "service_role";



GRANT ALL ON TABLE "public"."clientes" TO "anon";
GRANT ALL ON TABLE "public"."clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes" TO "service_role";



GRANT ALL ON TABLE "public"."comandas" TO "anon";
GRANT ALL ON TABLE "public"."comandas" TO "authenticated";
GRANT ALL ON TABLE "public"."comandas" TO "service_role";



GRANT ALL ON TABLE "public"."comandas_itens" TO "anon";
GRANT ALL ON TABLE "public"."comandas_itens" TO "authenticated";
GRANT ALL ON TABLE "public"."comandas_itens" TO "service_role";



GRANT ALL ON TABLE "public"."comissoes_registros" TO "anon";
GRANT ALL ON TABLE "public"."comissoes_registros" TO "authenticated";
GRANT ALL ON TABLE "public"."comissoes_registros" TO "service_role";



GRANT ALL ON TABLE "public"."configuracoes" TO "anon";
GRANT ALL ON TABLE "public"."configuracoes" TO "authenticated";
GRANT ALL ON TABLE "public"."configuracoes" TO "service_role";



GRANT ALL ON TABLE "public"."crediario_movimentacoes" TO "anon";
GRANT ALL ON TABLE "public"."crediario_movimentacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."crediario_movimentacoes" TO "service_role";



GRANT ALL ON TABLE "public"."estabelecimentos" TO "anon";
GRANT ALL ON TABLE "public"."estabelecimentos" TO "authenticated";
GRANT ALL ON TABLE "public"."estabelecimentos" TO "service_role";



GRANT ALL ON TABLE "public"."fornecedores" TO "anon";
GRANT ALL ON TABLE "public"."fornecedores" TO "authenticated";
GRANT ALL ON TABLE "public"."fornecedores" TO "service_role";



GRANT ALL ON TABLE "public"."logs_atividades" TO "anon";
GRANT ALL ON TABLE "public"."logs_atividades" TO "authenticated";
GRANT ALL ON TABLE "public"."logs_atividades" TO "service_role";



GRANT ALL ON TABLE "public"."marcas" TO "anon";
GRANT ALL ON TABLE "public"."marcas" TO "authenticated";
GRANT ALL ON TABLE "public"."marcas" TO "service_role";



GRANT ALL ON TABLE "public"."notificacoes" TO "anon";
GRANT ALL ON TABLE "public"."notificacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."notificacoes" TO "service_role";



GRANT ALL ON TABLE "public"."notificacoes_historico" TO "anon";
GRANT ALL ON TABLE "public"."notificacoes_historico" TO "authenticated";
GRANT ALL ON TABLE "public"."notificacoes_historico" TO "service_role";



GRANT ALL ON TABLE "public"."orcamento_itens" TO "anon";
GRANT ALL ON TABLE "public"."orcamento_itens" TO "authenticated";
GRANT ALL ON TABLE "public"."orcamento_itens" TO "service_role";



GRANT ALL ON TABLE "public"."orcamentos" TO "anon";
GRANT ALL ON TABLE "public"."orcamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."orcamentos" TO "service_role";



GRANT ALL ON TABLE "public"."pacotes" TO "anon";
GRANT ALL ON TABLE "public"."pacotes" TO "authenticated";
GRANT ALL ON TABLE "public"."pacotes" TO "service_role";



GRANT ALL ON TABLE "public"."pacotes_produtos" TO "anon";
GRANT ALL ON TABLE "public"."pacotes_produtos" TO "authenticated";
GRANT ALL ON TABLE "public"."pacotes_produtos" TO "service_role";



GRANT ALL ON TABLE "public"."pacotes_servicos" TO "anon";
GRANT ALL ON TABLE "public"."pacotes_servicos" TO "authenticated";
GRANT ALL ON TABLE "public"."pacotes_servicos" TO "service_role";



GRANT ALL ON TABLE "public"."permissoes_usuario" TO "anon";
GRANT ALL ON TABLE "public"."permissoes_usuario" TO "authenticated";
GRANT ALL ON TABLE "public"."permissoes_usuario" TO "service_role";



GRANT ALL ON TABLE "public"."produtos" TO "anon";
GRANT ALL ON TABLE "public"."produtos" TO "authenticated";
GRANT ALL ON TABLE "public"."produtos" TO "service_role";



GRANT ALL ON TABLE "public"."servicos" TO "anon";
GRANT ALL ON TABLE "public"."servicos" TO "authenticated";
GRANT ALL ON TABLE "public"."servicos" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios" TO "anon";
GRANT ALL ON TABLE "public"."usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
