// hooks/usePermissions.ts
import { useState, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Permissions {
  pode_ver_agenda: boolean;
  pode_editar_agenda: boolean;
  pode_ver_clientes: boolean;
  pode_editar_clientes: boolean;
  pode_ver_servicos: boolean;
  pode_editar_servicos: boolean;
  pode_ver_vendas: boolean;
  pode_editar_vendas: boolean;
  pode_ver_comandas: boolean;
  pode_editar_comandas: boolean;
  pode_ver_estoque: boolean;
  pode_editar_estoque: boolean;
  pode_ver_fornecedores: boolean;
  pode_editar_fornecedores: boolean;
  pode_ver_relatorios: boolean;
  pode_ver_configuracoes: boolean;
  pode_editar_configuracoes: boolean;
  pode_gerenciar_usuarios: boolean;
  pode_ver_orcamentos: boolean;
  pode_editar_orcamentos: boolean;
  pode_ver_pacotes: boolean;
  pode_editar_pacotes: boolean;
  pode_ver_aniversariantes: boolean;
  pode_editar_aniversariantes: boolean;
  pode_ver_metas: boolean;
  pode_editar_metas: boolean;
  pode_ver_despesas: boolean;
  pode_editar_despesas: boolean;
  pode_ver_agendamentos_online: boolean;
  pode_editar_agendamentos_online: boolean;
  pode_ver_automacao: boolean;
  pode_editar_automacao: boolean;
  pode_ver_notificacoes: boolean;
  pode_editar_notificacoes: boolean;
}

export const usePermissions = () => {
  const { session, estabelecimentoId, role } = useAuth();
  const [permissions, setPermissions] = useState<Permissions>({
    pode_ver_agenda: true,
    pode_editar_agenda: true,
    pode_ver_clientes: true,
    pode_editar_clientes: true,
    pode_ver_servicos: true,
    pode_editar_servicos: true,
    pode_ver_vendas: true,
    pode_editar_vendas: true,
    pode_ver_comandas: true,
    pode_editar_comandas: true,
    pode_ver_estoque: true,
    pode_editar_estoque: true,
    pode_ver_fornecedores: true,
    pode_editar_fornecedores: true,
    pode_ver_relatorios: true,
    pode_ver_configuracoes: true,
    pode_editar_configuracoes: true,
    pode_gerenciar_usuarios: true,
    pode_ver_orcamentos: true,
    pode_editar_orcamentos: true,
    pode_ver_pacotes: true,
    pode_editar_pacotes: true,
    pode_ver_aniversariantes: true,
    pode_editar_aniversariantes: true,
    pode_ver_metas: true,
    pode_editar_metas: true,
    pode_ver_despesas: true,
    pode_editar_despesas: true,
    pode_ver_agendamentos_online: true,
    pode_editar_agendamentos_online: true,
    pode_ver_automacao: true,
    pode_editar_automacao: true,
    pode_ver_notificacoes: true,
    pode_editar_notificacoes: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id && estabelecimentoId) {
      loadPermissions();
    } else {
      setLoading(false);
    }

    // Listener para atualizar permissões quando são alteradas
    const subscription = DeviceEventEmitter.addListener('permissoesAtualizadas', () => {
      loadPermissions();
    });

    return () => {
      subscription.remove();
    };
  }, [session?.user?.id, estabelecimentoId]);

  const loadPermissions = async () => {
    if (!session?.user?.id || !estabelecimentoId) return;

    try {
      setLoading(true);

      // Buscar permissões do usuário do banco de dados
      const { data, error } = await supabase
        .from('permissoes_usuario')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        // Usar exatamente as permissões salvas no banco
        const newPermissions = {
          pode_ver_agenda: data.pode_ver_agenda || false,
          pode_editar_agenda: data.pode_editar_agenda || false,
          pode_ver_clientes: data.pode_ver_clientes || false,
          pode_editar_clientes: data.pode_editar_clientes || false,
          pode_ver_servicos: data.pode_ver_servicos || false,
          pode_editar_servicos: data.pode_editar_servicos || false,
          pode_ver_vendas: data.pode_ver_vendas || false,
          pode_editar_vendas: data.pode_editar_vendas || false,
          pode_ver_comandas: data.pode_ver_comandas || false,
          pode_editar_comandas: data.pode_editar_comandas || false,
          pode_ver_estoque: data.pode_ver_estoque || false,
          pode_editar_estoque: data.pode_editar_estoque || false,
          pode_ver_fornecedores: data.pode_ver_fornecedores || false,
          pode_editar_fornecedores: data.pode_editar_fornecedores || false,
          pode_ver_relatorios: data.pode_ver_relatorios || false,
          pode_ver_configuracoes: data.pode_ver_configuracoes || false,
          pode_editar_configuracoes: data.pode_editar_configuracoes || false,
          pode_gerenciar_usuarios: data.pode_gerenciar_usuarios || false,
          pode_ver_orcamentos: data.pode_ver_orcamentos || false,
          pode_editar_orcamentos: data.pode_editar_orcamentos || false,
          pode_ver_pacotes: data.pode_ver_pacotes || false,
          pode_editar_pacotes: data.pode_editar_pacotes || false,
          pode_ver_aniversariantes: data.pode_ver_aniversariantes || false,
          pode_editar_aniversariantes: data.pode_editar_aniversariantes || false,
          pode_ver_metas: data.pode_ver_metas || false,
          pode_editar_metas: data.pode_editar_metas || false,
          pode_ver_despesas: data.pode_ver_despesas || false,
          pode_editar_despesas: data.pode_editar_despesas || false,
          pode_ver_agendamentos_online: data.pode_ver_agendamentos_online || false,
          pode_editar_agendamentos_online: data.pode_editar_agendamentos_online || false,
          pode_ver_automacao: data.pode_ver_automacao || false,
          pode_editar_automacao: data.pode_editar_automacao || false,
          pode_ver_notificacoes: data.pode_ver_notificacoes || false,
          pode_editar_notificacoes: data.pode_editar_notificacoes || false,
        };
        console.log('🔍 [Permissions] Configurações aplicadas:', newPermissions);
        setPermissions(newPermissions);
      } else {
        // Se não há registro de permissões, criar padrões básicas
        setPermissions({
          pode_ver_agenda: true,
          pode_editar_agenda: false,
          pode_ver_clientes: true,
          pode_editar_clientes: false,
          pode_ver_servicos: true,
          pode_editar_servicos: false,
          pode_ver_vendas: true,
          pode_editar_vendas: false,
          pode_ver_comandas: true,
          pode_editar_comandas: false,
          pode_ver_estoque: false,
          pode_editar_estoque: false,
          pode_ver_fornecedores: false,
          pode_editar_fornecedores: false,
          pode_ver_relatorios: false,
          pode_ver_configuracoes: false,
          pode_editar_configuracoes: false,
          pode_gerenciar_usuarios: false,
          pode_ver_orcamentos: true,
          pode_editar_orcamentos: false,
          pode_ver_pacotes: true,
          pode_editar_pacotes: false,
          pode_ver_aniversariantes: true,
          pode_editar_aniversariantes: false,
          pode_ver_metas: false,
          pode_editar_metas: false,
          pode_ver_despesas: false,
          pode_editar_despesas: false,
          pode_ver_agendamentos_online: false,
          pode_editar_agendamentos_online: false,
          pode_ver_automacao: false,
          pode_editar_automacao: false,
          pode_ver_notificacoes: true,
          pode_editar_notificacoes: false,
        });
      }

    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    permissions,
    loading,
    refreshPermissions: loadPermissions,
  };
};