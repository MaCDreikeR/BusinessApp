import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { CacheManager, CacheNamespaces, CacheTTL } from '../utils/cacheManager';
import { getStartOfDayLocal, getEndOfDayLocal, getStartOfMonthLocal, getEndOfMonthLocal } from '../lib/timezone';

/**
 * Hook reutilizável para carregar agendamentos
 * Otimizado para evitar padrão N+1
 * 
 * @param estabelecimentoId ID do estabelecimento
 * @param selectedDate Data selecionada
 * @param selectedUser Usuário filtrado (opcional)
 * @param role Role do usuário logado
 * @param userId ID do usuário logado
 */
export function useAgendaData(
  estabelecimentoId: string | null,
  selectedDate: Date,
  selectedUser: string | null 
,
  role: string | null,
  userId: string | undefined
) {
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [agendamentosMes, setAgendamentosMes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Carregar agendamentos do dia com otimização N+1
   */
  const carregarAgendamentos = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      if (!estabelecimentoId) {
        logger.error('Estabelecimento ID não encontrado');
        return [];
      }
      
      // Filtrar por usuário se selecionado OU se for profissional
      const usuarioFiltro = selectedUser || (role === 'profissional' ? userId : null);
      
      // Gerar chave de cache
      const dataStr = format(selectedDate, 'yyyy-MM-dd');
      const cacheKey = `dia_${dataStr}_${usuarioFiltro || 'todos'}`;
      
      // Buscar do cache primeiro
      const cachedData = forceRefresh
        ? null
        : await CacheManager.get<any[]>(CacheNamespaces.AGENDAMENTOS, cacheKey);

      if (cachedData) {
        logger.debug('📦 Agendamentos carregados do cache');
        setAgendamentos(cachedData);
        return cachedData;
      }
      
      // Buscar do banco
      const ano = selectedDate.getFullYear();
      const mes = selectedDate.getMonth() + 1;
      const dia = selectedDate.getDate();
      
      const dataInicioLocal = getStartOfDayLocal(selectedDate);
      const dataFimLocal = getEndOfDayLocal(selectedDate);
      
      logger.debug(`📅 Buscando agendamentos do dia ${dia}/${mes}/${ano}`);
      
      let query = supabase
        .from('agendamentos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .gte('data_hora', dataInicioLocal)
        .lte('data_hora', dataFimLocal);
      
      if (usuarioFiltro) {
        query = query.eq('usuario_id', usuarioFiltro);
      }

      const { data, error } = await query;
      if (error) throw error;

      // 🚀 OTIMIZAÇÃO: Buscar todos os clientes e movimentações de uma vez
      const clienteIds = [...new Set(data?.map(ag => ag.cliente_id).filter(Boolean) || [])];
      
      let clientesData: any = {};
      let movimentacoesData: any = {};
      
      if (clienteIds.length > 0) {
        const { data: searchClientes } = await supabase
          .from('clientes')
          .select('id, foto_url, telefone')
          .in('id', clienteIds);
        
        (searchClientes || []).forEach(c => {
          clientesData[c.id] = c;
        });
        
        const { data: todasMovimentacoes } = await supabase
          .from('crediario_movimentacoes')
          .select('valor, cliente_id')
          .in('cliente_id', clienteIds);
        
        (todasMovimentacoes || []).forEach(mov => {
          if (!movimentacoesData[mov.cliente_id]) {
            movimentacoesData[mov.cliente_id] = [];
          }
          movimentacoesData[mov.cliente_id].push(mov);
        });
      }
      
      // Montar resultado
      const agendamentosComClientes = (data || []).map((ag: any) => {
        const cliente = ag.cliente_id ? clientesData[ag.cliente_id] : null;
        
        let cliente_foto = null;
        let cliente_telefone = null;
        let cliente_saldo = 0;
        
        if (cliente) {
          cliente_foto = cliente.foto_url;
          cliente_telefone = cliente.telefone;
          
          const movimentacoes = movimentacoesData[ag.cliente_id] || [];
          cliente_saldo = movimentacoes.reduce((total: number, mov: any) => {
            const valorNumerico = typeof mov.valor === 'string' 
              ? parseFloat(mov.valor.replace(',', '.')) 
              : mov.valor;
            return total + (valorNumerico || 0);
          }, 0);
        }
        
        return {
          ...ag,
          cliente_foto,
          cliente_telefone,
          cliente_saldo,
        };
      });
      
      logger.debug(`✅ [OTIMIZADO] ${agendamentosComClientes.length} agendamentos carregados`);
      
      // Salvar no cache
      await CacheManager.set(
        CacheNamespaces.AGENDAMENTOS,
        cacheKey,
        agendamentosComClientes,
        CacheTTL.TWO_MINUTES
      );
      
      setAgendamentos(agendamentosComClientes);
      return agendamentosComClientes;
    } catch (error) {
      logger.error('Erro ao carregar agendamentos:', error);
      setAgendamentos([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [estabelecimentoId, selectedDate, selectedUser, role, userId]);

  /**
   * Carregar agendamentos do mês com otimização N+1
   */
  const carregarAgendamentosMes = useCallback(async (forceRefresh = false) => {
    try {
      if (!estabelecimentoId) return [];
      
      const ano = selectedDate.getFullYear();
      const mes = selectedDate.getMonth() + 1;
      
      const dataInicioMesLocal = getStartOfMonthLocal(ano, mes);
      const dataFimMesLocal = getEndOfMonthLocal(ano, mes);
      
      const mesStr = format(selectedDate, 'yyyy-MM');
      const cacheKey = `mes_${mesStr}_${selectedUser || 'todos'}`;
      
      const cachedData = forceRefresh
        ? null
        : await CacheManager.get<any[]>(CacheNamespaces.AGENDAMENTOS, cacheKey);

      if (cachedData) {
        logger.debug('📦 Agendamentos do mês carregados do cache');
        setAgendamentosMes(cachedData);
        return cachedData;
      }
      
      let query = supabase
        .from('agendamentos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .gte('data_hora', dataInicioMesLocal)
        .lte('data_hora', dataFimMesLocal);

      if (selectedUser) {
        query = query.eq('usuario_id', selectedUser);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Mesma otimização do carregarAgendamentos
      const clienteIds = [...new Set(data?.map(ag => ag.cliente_id).filter(Boolean) || [])];
      
      let clientesData: any = {};
      let movimentacoesData: any = {};
      
      if (clienteIds.length > 0) {
        const { data: searchClientes } = await supabase
          .from('clientes')
          .select('id, foto_url, telefone')
          .in('id', clienteIds);
        
        (searchClientes || []).forEach(c => {
          clientesData[c.id] = c;
        });
        
        const { data: todasMovimentacoes } = await supabase
          .from('crediario_movimentacoes')
          .select('valor, cliente_id')
          .in('cliente_id', clienteIds);
        
        (todasMovimentacoes || []).forEach(mov => {
          if (!movimentacoesData[mov.cliente_id]) {
            movimentacoesData[mov.cliente_id] = [];
          }
          movimentacoesData[mov.cliente_id].push(mov);
        });
      }
      
      const agendamentosComClientes = (data || []).map((ag: any) => {
        const cliente = ag.cliente_id ? clientesData[ag.cliente_id] : null;
        
        let cliente_foto = null;
        let cliente_telefone = null;
        let cliente_saldo = 0;
        
        if (cliente) {
          cliente_foto = cliente.foto_url;
          cliente_telefone = cliente.telefone;
          
          const movimentacoes = movimentacoesData[ag.cliente_id] || [];
          cliente_saldo = movimentacoes.reduce((total: number, mov: any) => {
            const valorNumerico = typeof mov.valor === 'string' 
              ? parseFloat(mov.valor.replace(',', '.')) 
              : mov.valor;
            return total + (valorNumerico || 0);
          }, 0);
        }
        
        return {
          ...ag,
          cliente_foto,
          cliente_telefone,
          cliente_saldo,
        };
      });
      
      await CacheManager.set(
        CacheNamespaces.AGENDAMENTOS,
        cacheKey,
        agendamentosComClientes,
        CacheTTL.TWO_MINUTES
      );
      
      setAgendamentosMes(agendamentosComClientes);
      return agendamentosComClientes;
    } catch (error) {
      logger.error('Erro ao carregar agendamentos do mês:', error);
      return [];
    }
  }, [estabelecimentoId, selectedDate, selectedUser]);

  return {
    agendamentos,
    agendamentosMes,
    loading,
    carregarAgendamentos,
    carregarAgendamentosMes,
  };
}
