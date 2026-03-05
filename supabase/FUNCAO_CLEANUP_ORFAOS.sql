-- ============================================================================
-- FUNÇÃO PARA CLEANUP AUTOMÁTICO DE USUÁRIOS ÓRFÃOS
-- ============================================================================
-- Este script cria uma função que remove usuários de auth.users se a criação
-- completa falhar (útil para recuperação após falhas)

-- ============================================================================
-- FUNÇÃO: Deletar usuário órfão de auth.users (se criar_nova_conta falhar)
-- ============================================================================
-- Você pode chamar isso do app se a RPC retornar erro

CREATE OR REPLACE FUNCTION public.limpar_usuario_orfao(p_user_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_resultado jsonb;
BEGIN
  -- Verifica se o usuário existe em auth.users
  IF EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    
    -- Deleta de auth.users
    DELETE FROM auth.users WHERE id = p_user_id;
    
    v_resultado := jsonb_build_object(
      'sucesso', true,
      'mensagem', 'Usuário órfão removido de auth.users',
      'user_id', p_user_id
    );
  ELSE
    v_resultado := jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Usuário não encontrado em auth.users',
      'user_id', p_user_id
    );
  END IF;
  
  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.limpar_usuario_orfao(uuid) TO "anon", "authenticated", "service_role";

-- ============================================================================
-- OBSERVAÇÃO: O app deve chamar assim se criar_nova_conta falhar:
-- ============================================================================
/*
PSEUDOCÓDIGO DO APP:

const { error: contaError } = await supabase.rpc('criar_nova_conta', {...});

if (contaError) {
  // Se a RPC falhar, tenta limpar o usuário de auth.users
  const { error: cleanError } = await supabase.rpc('limpar_usuario_orfao', {
    p_user_id: userId
  });
  
  if (!cleanError) {
    console.log('✅ Usuário órfão removido com sucesso');
  }
  
  Alert.alert('Erro', 'Falha ao criar conta. Tente novamente.');
  return;
}
*/

-- ============================================================================
-- ALTERNATIVA: Usar RLS com TRIGGER para auto-cleanup
-- ============================================================================
-- Se quiser automático, crie um trigger que verifica:
-- "Se um usuário foi criado em auth.users mas 5 minutos depois
--  não tem correspondência em public.usuarios, delete"

-- Para usar isso, crie uma função agendada via pg_cron (requer extensão no Supabase)
-- Não recomendo isso pois pode deletar dados legítimos que estão processando

-- ============================================================================
-- BEST PRACTICE RECOMENDADO:
-- ============================================================================
-- 1. ✅ Validar email_ja_cadastrado() ANTES de auth.signUp() [JÁ TEM]
-- 2. ✅ Caso auth.signUp suceda mas criar_nova_conta falhe:
--       - Avisar usuário: "Cadastro parcial completo. Tente login ou contate suporte"
--       - Chamar limpar_usuario_orfao() para remover de auth.users
--       - OU guardar para limpeza manual via script LIMPAR_AUTH_ORFAOS.sql
-- 3. ✅ Sempre fazer verificação post-RPC:
--       - Confirmar que public.usuarios foi criado
--       - Confirmar que public.estabelecimentos foi criado
