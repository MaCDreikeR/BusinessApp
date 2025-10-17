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
        .select('id, cliente, data_hora, servicos, status')
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
