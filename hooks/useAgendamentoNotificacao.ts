import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import * as Notifications from 'expo-notifications';

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
      const cincoMinutosAntes = new Date(agora.getTime() - 5 * 60000); // 5 minutos antes
      const cincoMinutosDepois = new Date(agora.getTime() + 5 * 60000); // 5 minutos depois

      // Buscar agendamentos que estão para começar ou acabaram de começar
      const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select('id, cliente, data_hora, servicos, status, usuario_id')
        .eq('estabelecimento_id', estabelecimentoId)
        .gte('data_hora', cincoMinutosAntes.toISOString())
        .lte('data_hora', cincoMinutosDepois.toISOString())
        .in('status', ['agendado', 'confirmado'])
        .order('data_hora', { ascending: true });

      if (error) {
        console.error('Erro ao verificar agendamentos:', error);
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
          const inicioDoDia = new Date();
          inicioDoDia.setHours(0, 0, 0, 0);
          
          const { data: comandaExistente } = await supabase
            .from('comandas')
            .select('id')
            .eq('cliente_nome', agendamentoParaNotificar.cliente)
            .eq('estabelecimento_id', estabelecimentoId)
            .eq('status', 'aberta')
            .gte('created_at', inicioDoDia.toISOString())
            .maybeSingle();
          
          if (!comandaExistente) {
            console.log('🔄 Criando comanda automaticamente para agendamento:', agendamentoParaNotificar.id);
            
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
                console.log('⚠️ Cliente não encontrado no banco. Não é possível criar comanda automaticamente.');
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
                console.error('❌ Erro ao criar comanda:', comandaError);
              } else if (novaComanda) {
                console.log('✅ Comanda criada automaticamente:', novaComanda.id);
                
                // Adicionar itens dos serviços à comanda
                if (agendamentoParaNotificar.servicos && agendamentoParaNotificar.servicos.length > 0) {
                  console.log('📦 Serviços do agendamento:', JSON.stringify(agendamentoParaNotificar.servicos, null, 2));
                  
                  const itens = agendamentoParaNotificar.servicos.map((servico: any) => {
                    // Converter preço para número (pode vir como string do banco)
                    const precoNumerico = typeof servico.preco === 'string' 
                      ? parseFloat(servico.preco) 
                      : (servico.preco || 0);
                    
                    return {
                      comanda_id: novaComanda.id,
                      tipo: 'servico' as const,
                      nome: servico.nome,
                      preco_unitario: precoNumerico,
                      preco: precoNumerico,
                      quantidade: 1,
                      preco_total: precoNumerico,
                      estabelecimento_id: estabelecimentoId,
                    };
                  });
                  
                  console.log('📝 Itens a serem inseridos:', JSON.stringify(itens, null, 2));
                  
                  const { data: itensInseridos, error: itensError } = await supabase
                    .from('comandas_itens')
                    .insert(itens)
                    .select();
                  
                  if (itensError) {
                    console.error('❌ Erro ao adicionar itens:', itensError);
                  } else {
                    console.log('✅ Itens adicionados à comanda:', itensInseridos?.length || 0);
                    console.log('📋 Itens inseridos:', JSON.stringify(itensInseridos, null, 2));
                  }
                  
                  // Atualizar valor total da comanda
                  const valorTotal = itens.reduce((sum: number, item: any) => sum + item.preco_total, 0);
                  console.log('💰 Valor total calculado:', valorTotal);
                  
                  const { error: updateError } = await supabase
                    .from('comandas')
                    .update({ valor_total: valorTotal })
                    .eq('id', novaComanda.id);
                  
                  if (updateError) {
                    console.error('❌ Erro ao atualizar valor total:', updateError);
                  } else {
                    console.log('✅ Valor total atualizado');
                  }
                }
                
                console.log('✅ Comanda criada e configurada com sucesso');
              }
            } catch (comandaErr) {
              console.error('❌ Erro ao criar comanda automaticamente:', comandaErr);
            }
          } else {
            console.log('ℹ️ Comanda aberta já existe para este cliente hoje:', comandaExistente.id);
          }

          // Marcar como notificado
          setAgendamentosNotificados(prev => new Set(prev).add(agendamentoParaNotificar.id));
        }
      }
    } catch (error) {
      console.error('Erro ao verificar agendamentos:', error);
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
      console.log('Lista de agendamentos notificados resetada');
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
