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
      // 🔥 ADICIONADO: valor_total para sabermos se é um pacote com desconto
      const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select('id, cliente, data_hora, servicos, status, usuario_id, valor_total')
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

          // ==========================================
          // CRIAR COMANDA AUTOMATICAMENTE
          // ==========================================
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
              
              if (!clienteId) {
                logger.warn('⚠️ Cliente não encontrado no banco. Não é possível criar comanda automaticamente.');
                return;
              }
              
              // Criar comanda base (preços serão ajustados a seguir)
              const { data: novaComanda, error: comandaError } = await supabase
                .from('comandas')
                .insert({
                  cliente_nome: agendamentoParaNotificar.cliente,
                  cliente_id: clienteId,
                  estabelecimento_id: estabelecimentoId,
                  status: 'aberta',
                  valor_total: 0,
                  valor_desconto: 0,
                  created_by_user_id: null,
                  created_by_user_nome: 'Agendamento',
                  data_abertura: new Date().toISOString(),
                })
                .select()
                .single();
              
              if (comandaError) {
                logger.error('❌ Erro ao criar comanda:', comandaError);
              } else if (novaComanda) {
                logger.success('✅ Comanda criada automaticamente:', novaComanda.id);
                
                // Parse servicos
                let servicosArray = agendamentoParaNotificar.servicos;
                if (typeof servicosArray === 'string') {
                  try { servicosArray = JSON.parse(servicosArray); } catch { servicosArray = []; }
                }

                if (servicosArray && servicosArray.length > 0) {
                  
                  // 🔥 LÓGICA INTELIGENTE DE PREÇOS
                  // Buscar TODOS os serviços do estabelecimento para cruzar ID ou Nome
                  const { data: servicosDb } = await supabase
                    .from('servicos')
                    .select('id, nome, preco')
                    .eq('estabelecimento_id', estabelecimentoId);
                  
                  let precosBanco: Record<string, number> = {};
                  if (servicosDb) {
                    servicosDb.forEach(s => {
                      if (s.id) precosBanco[s.id] = Number(s.preco) || 0;
                      // Salvar também pelo nome em minúsculas para encontrar caso o JSON só tenha o nome
                      if (s.nome) precosBanco[s.nome.trim().toLowerCase()] = Number(s.preco) || 0;
                    });
                  }
                  
                  let somaItens = 0;
                  
                  const itens = servicosArray.map((servico: any) => {
                    let precoNumerico = 0;
                    
                    // 1. Tentar o preço que veio do JSON (se for > 0)
                    if (servico.preco && Number(servico.preco) > 0) {
                      precoNumerico = Number(servico.preco);
                    } 
                    // 2. Tentar pelo ID (se existir no JSON)
                    else if (servico.servico_id && precosBanco[servico.servico_id] !== undefined) {
                      precoNumerico = precosBanco[servico.servico_id];
                    } 
                    // 3. Tentar pelo Nome exato (muito comum em pacotes)
                    else if (servico.nome && precosBanco[servico.nome.trim().toLowerCase()] !== undefined) {
                      precoNumerico = precosBanco[servico.nome.trim().toLowerCase()];
                    }

                    const qtd = servico.quantidade || 1;
                    const precoTotalItem = precoNumerico * qtd;
                    somaItens += precoTotalItem;
                    
                    return {
                      comanda_id: novaComanda.id,
                      tipo: 'servico' as const,
                      nome: servico.nome,
                      preco_unitario: precoNumerico,
                      preco: precoNumerico,
                      quantidade: qtd,
                      preco_total: precoTotalItem,
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
                    logger.success('✅ Itens adicionados à comanda');
                  }
                  
                  // 🔥 CÁLCULO FINAL DE PACOTES E DESCONTOS
                  const valorAgendamento = Number(agendamentoParaNotificar.valor_total) || 0;
                  let descontoAplicado = 0;
                  let valorFinalComanda = somaItens;

                  // Se a soma dos itens for 0 (nenhum preço encontrado), forçamos o valor total do agendamento no primeiro item para não ficar zerado
                  if (somaItens === 0 && valorAgendamento > 0 && itensInseridos && itensInseridos.length > 0) {
                      logger.warn('⚠️ Preços zerados. Forçando valor total do agendamento no primeiro item.');
                      await supabase.from('comandas_itens')
                        .update({ 
                          preco: valorAgendamento, 
                          preco_unitario: valorAgendamento, 
                          preco_total: valorAgendamento 
                        })
                        .eq('id', itensInseridos[0].id);
                      valorFinalComanda = valorAgendamento;
                  } 
                  // Se for um PACOTE (valor cobrado é menor que a soma dos serviços avulsos)
                  else if (valorAgendamento > 0 && valorAgendamento < somaItens) {
                    descontoAplicado = somaItens - valorAgendamento;
                    valorFinalComanda = valorAgendamento;
                    logger.info(`💰 Detectado desconto de pacote! Desconto: R$ ${descontoAplicado}`);
                  }
                  
                  const { error: updateError } = await supabase
                    .from('comandas')
                    .update({ 
                      valor_total: valorFinalComanda,
                      valor_desconto: descontoAplicado
                    })
                    .eq('id', novaComanda.id);
                  
                  if (updateError) {
                    logger.error('❌ Erro ao atualizar valor total:', updateError);
                  } else {
                    logger.success(`✅ Valor total: ${valorFinalComanda} (Desconto: ${descontoAplicado})`);
                  }
                }
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
    }, 30000);

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