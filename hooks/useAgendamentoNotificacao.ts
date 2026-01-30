import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { logger } from '../utils/logger';
import { addMinutesLocal } from '../lib/timezone';

interface AgendamentoAtivo {
  id: string;
  cliente: string;
  cliente_foto?: string | null;
  servico: string;
  horario: string;
  data_hora: string;
}

export function useAgendamentoNotificacao() {
  const { estabelecimentoId } = useAuth();
  const [agendamentoAtivo, setAgendamentoAtivo] = useState<AgendamentoAtivo | null>(null);
  const [mostrarNotificacao, setMostrarNotificacao] = useState(false);
  const [agendamentosNotificados, setAgendamentosNotificados] = useState<Set<string>>(new Set());

  const verificarAgendamentos = useCallback(async () => {
    if (!estabelecimentoId) return;

    try {
      const agora = new Date();
      const cincoMinutosAntes = addMinutesLocal(agora, -5);
      const cincoMinutosDepois = addMinutesLocal(agora, 5);

      // Buscar agendamentos que estão para começar ou acabaram de começar
      const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select('id, cliente, data_hora, servicos, status, usuario_id')
        .eq('estabelecimento_id', estabelecimentoId)
        .gte('data_hora', cincoMinutosAntes)
        .lte('data_hora', cincoMinutosDepois)
        .in('status', ['agendado', 'confirmado'])
        .order('data_hora', { ascending: true });

      if (error) {
        logger.error('Erro ao verificar agendamentos:', error);
        return;
      }

      if (agendamentos && agendamentos.length > 0) {
        // Pegar o primeiro agendamento que ainda não foi notificado
        const agendamentoParaNotificar = agendamentos.find(
          ag => !agendamentosNotificados.has(ag.id)
        );

        if (agendamentoParaNotificar) {
          const servicoNome = agendamentoParaNotificar.servicos?.[0]?.nome || 'Serviço não especificado';
          const horario = format(new Date(agendamentoParaNotificar.data_hora), 'HH:mm');

          // Buscar foto do cliente apenas por nome
          let clienteFoto = null;
          if (agendamentoParaNotificar.cliente) {
            const { data: clienteData } = await supabase
              .from('clientes')
              .select('foto_url')
              .eq('estabelecimento_id', estabelecimentoId)
              .ilike('nome', agendamentoParaNotificar.cliente)
              .limit(1)
              .maybeSingle();
            
            if (clienteData) {
              clienteFoto = clienteData.foto_url;
            }
          }

          setAgendamentoAtivo({
            id: agendamentoParaNotificar.id,
            cliente: agendamentoParaNotificar.cliente || 'Cliente não informado',
            cliente_foto: clienteFoto,
            servico: servicoNome,
            horario: horario,
            data_hora: agendamentoParaNotificar.data_hora
          });

          setMostrarNotificacao(true);

          // Enviar notificação local para a barra de status
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🔔 Agendamento Iniciando!',
              body: `${agendamentoParaNotificar.cliente} - ${servicoNome} às ${horario}`,
              data: { 
                tipo: 'agendamento',
                agendamentoId: agendamentoParaNotificar.id,
                cliente: agendamentoParaNotificar.cliente,
                servico: servicoNome,
                horario: horario,
              },
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: null, // Disparar imediatamente
          });

          // Criar comanda automaticamente
          // Verificar se já existe uma comanda aberta para este cliente hoje
          const inicioDoDiaLocal = await import('../lib/timezone').then(m => m.getStartOfDayLocal());
          
          const { data: comandaExistente } = await supabase
            .from('comandas')
            .select('id')
            .eq('cliente_nome', agendamentoParaNotificar.cliente)
            .eq('estabelecimento_id', estabelecimentoId)
            .eq('status', 'aberta')
            .gte('created_at', inicioDoDiaLocal)
            .maybeSingle();
          
          if (!comandaExistente) {
            logger.info('🔄 Criando comanda automaticamente para agendamento:', agendamentoParaNotificar.id);
            
            try {
              // Buscar ID do cliente por nome (OBRIGATÓRIO)
              let clienteId = null;
              
              if (agendamentoParaNotificar.cliente) {
                const { data: clienteData } = await supabase
                  .from('clientes')
                  .select('id')
                  .eq('estabelecimento_id', estabelecimentoId)
                  .ilike('nome', agendamentoParaNotificar.cliente)
                  .limit(1)
                  .maybeSingle();
                
                if (clienteData) {
                  clienteId = clienteData.id;
                }
              }
              
              // Se não encontrou o cliente, não pode criar comanda (cliente_id é obrigatório)
              if (!clienteId) {
                logger.warn('⚠️ Cliente não encontrado no banco. Não é possível criar comanda automaticamente.');
                return;
              }
              
              // Criar comanda
              const { data: novaComanda, error: comandaError } = await supabase
                .from('comandas')
                .insert({
                  cliente_nome: agendamentoParaNotificar.cliente,
                  cliente_id: clienteId,
                  estabelecimento_id: estabelecimentoId,
                  status: 'aberta',
                  valor_total: 0,
                  created_by_user_id: agendamentoParaNotificar.usuario_id || null,
                  data_abertura: new Date().toISOString(),
                })
                .select()
                .single();
              
              if (comandaError) {
                logger.error('❌ Erro ao criar comanda:', comandaError);
              } else if (novaComanda) {
                logger.success('✅ Comanda criada automaticamente:', novaComanda.id);
                
                // Adicionar itens dos serviços à comanda
                if (agendamentoParaNotificar.servicos && agendamentoParaNotificar.servicos.length > 0) {
                  logger.debug('📦 Serviços do agendamento:', JSON.stringify(agendamentoParaNotificar.servicos, null, 2));
                  
                  // Parse servicos se vier como string JSON
                  let servicosArray = agendamentoParaNotificar.servicos;
                  if (typeof servicosArray === 'string') {
                    try {
                      servicosArray = JSON.parse(servicosArray);
                    } catch {
                      servicosArray = [];
                    }
                  }
                  
                  // Buscar preços dos serviços no banco de dados
                  const servicoIds = servicosArray
                    .filter((s: any) => s.servico_id)
                    .map((s: any) => s.servico_id);
                  
                  let precosServicos: {[key: string]: number} = {};
                  if (servicoIds.length > 0) {
                    const { data: servicos } = await supabase
                      .from('servicos')
                      .select('id, valor')
                      .in('id', servicoIds);
                    
                    if (servicos) {
                      servicos.forEach(s => {
                        precosServicos[s.id] = s.valor || 0;
                      });
                    }
                  }
                  
                  const itens = servicosArray.map((servico: any) => {
                    // Tentar usar o preço do agendamento, senão buscar do banco
                    let precoNumerico = 0;
                    
                    if (servico.preco !== undefined && servico.preco !== null && servico.preco > 0) {
                      // Se tem preço no agendamento, usar esse
                      precoNumerico = typeof servico.preco === 'string' 
                        ? parseFloat(servico.preco) 
                        : servico.preco;
                    } else if (servico.servico_id && precosServicos[servico.servico_id]) {
                      // Se não tem preço mas tem servico_id, buscar do banco
                      precoNumerico = precosServicos[servico.servico_id];
                    }
                    
                    return {
                      comanda_id: novaComanda.id,
                      tipo: 'servico' as const,
                      nome: servico.nome,
                      preco_unitario: precoNumerico,
                      preco: precoNumerico,
                      quantidade: servico.quantidade || 1,
                      preco_total: precoNumerico * (servico.quantidade || 1),
                      estabelecimento_id: estabelecimentoId,
                    };
                  });
                  
                  logger.debug('📝 Itens a serem inseridos:', JSON.stringify(itens, null, 2));
                  
                  const { data: itensInseridos, error: itensError } = await supabase
                    .from('comandas_itens')
                    .insert(itens)
                    .select();
                  
                  if (itensError) {
                    logger.error('❌ Erro ao adicionar itens:', itensError);
                  } else {
                    logger.success('✅ Itens adicionados à comanda:', itensInseridos?.length || 0);
                    logger.debug('📋 Itens inseridos:', JSON.stringify(itensInseridos, null, 2));
                  }
                  
                  // Atualizar valor total da comanda
                  const valorTotal = itens.reduce((sum: number, item: any) => sum + item.preco_total, 0);
                  logger.debug('💰 Valor total calculado:', valorTotal);
                  
                  const { error: updateError } = await supabase
                    .from('comandas')
                    .update({ valor_total: valorTotal })
                    .eq('id', novaComanda.id);
                  
                  if (updateError) {
                    logger.error('❌ Erro ao atualizar valor total:', updateError);
                  } else {
                    logger.success('✅ Valor total atualizado');
                  }
                }
                
                logger.success('✅ Comanda criada e configurada com sucesso');
              }
            } catch (comandaErr) {
              logger.error('❌ Erro ao criar comanda automaticamente:', comandaErr);
            }
          } else {
            logger.info('ℹ️ Comanda aberta já existe para este cliente hoje:', comandaExistente.id);
          }

          // Marcar como notificado
          setAgendamentosNotificados(prev => new Set(prev).add(agendamentoParaNotificar.id));
        }
      }
    } catch (error) {
      logger.error('Erro ao verificar agendamentos:', error);
    }
  }, [estabelecimentoId, agendamentosNotificados]);

  const ocultarNotificacao = useCallback(() => {
    setMostrarNotificacao(false);
  }, []);

  const resetarNotificacao = useCallback(() => {
    setMostrarNotificacao(false);
    setAgendamentoAtivo(null);
  }, []);

  // Verificar a cada 30 segundos
  useEffect(() => {
    verificarAgendamentos();
    
    const intervalo = setInterval(() => {
      verificarAgendamentos();
    }, 30000); // 30 segundos

    return () => clearInterval(intervalo);
  }, [verificarAgendamentos]);

  // Resetar lista de notificados à meia-noite
  useEffect(() => {
    const agora = new Date();
    const meiaNoite = new Date(agora);
    meiaNoite.setHours(24, 0, 0, 0);
    
    const tempoAteMeiaNoite = meiaNoite.getTime() - agora.getTime();

    const timeout = setTimeout(() => {
      setAgendamentosNotificados(new Set());
      logger.debug('Lista de agendamentos notificados resetada');
    }, tempoAteMeiaNoite);

    return () => clearTimeout(timeout);
  }, []);

  return {
    agendamentoAtivo,
    mostrarNotificacao,
    ocultarNotificacao,
    resetarNotificacao
  };
}
