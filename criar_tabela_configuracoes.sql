-- Este arquivo deve ser executado no Console SQL do Supabase
-- 1. Vá para https://supabase.com/dashboard
-- 2. Selecione seu projeto
-- 3. Clique em "SQL Editor" no menu lateral
-- 4. Cole este conteúdo e execute

-- Criação da tabela configuracoes
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL,
  valor text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Adicionar índice único para chave e user_id
CREATE UNIQUE INDEX IF NOT EXISTS configuracoes_chave_user_id_idx 
  ON public.configuracoes (chave, user_id);

-- Adicionar permissões RLS para a tabela
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Política que permite usuários autenticados lerem suas próprias configurações
CREATE POLICY "Usuários podem ler suas próprias configurações" 
  ON public.configuracoes FOR SELECT 
  USING (auth.uid() = user_id);

-- Política que permite usuários autenticados criarem suas próprias configurações
CREATE POLICY "Usuários podem inserir suas próprias configurações" 
  ON public.configuracoes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Política que permite usuários autenticados atualizarem suas próprias configurações
CREATE POLICY "Usuários podem atualizar suas próprias configurações" 
  ON public.configuracoes FOR UPDATE 
  USING (auth.uid() = user_id);

-- Política que permite usuários autenticados excluirem suas próprias configurações
CREATE POLICY "Usuários podem excluir suas próprias configurações" 
  ON public.configuracoes FOR DELETE 
  USING (auth.uid() = user_id); 