import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@lib/supabase';
import { logger } from '../utils/logger';

// Configurar o comportamento das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Função para salvar notificação no histórico
async function salvarNotificacaoNoHistorico(titulo: string, mensagem: string, tipo: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from('notificacoes_historico')
      .insert({
        user_id: user.id,
        titulo: titulo,
        mensagem: mensagem,
        tipo: tipo,
        data_envio: new Date().toISOString(),
        data_expiracao: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 horas
      });
  }
}

// Função para limpar notificações antigas
async function limparNotificacoesAntigas() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from('notificacoes_historico')
      .delete()
      .lt('data_expiracao', new Date().toISOString());
  }
}

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C3AED',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      logger.debug('Falha ao obter permissão para notificações push');
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'seu-project-id',
    })).data;

    // Salvar o token no Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: user.id,
          token: token,
          platform: Platform.OS,
        });
    }
  } else {
    logger.debug('Dispositivo físico necessário para notificações push');
    return;
  }

  return token;
}

export async function sendPushNotification(expoPushToken: string, title: string, body: string, tipo: string) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: { 
      tipo: tipo,
      data_envio: new Date().toISOString(),
    },
    priority: Notifications.AndroidNotificationPriority.HIGH,
  };

  try {
    // Enviar notificação push
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (response.ok) {
      // Salvar no histórico
      await salvarNotificacaoNoHistorico(title, body, tipo);
      // Limpar notificações antigas
      await limparNotificacoesAntigas();
    }
  } catch (error) {
    logger.error('Erro ao enviar notificação:', error);
  }
}

export async function scheduleLocalNotification(title: string, body: string, trigger: any, tipo: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: body,
      data: { 
        tipo: tipo,
        data_envio: new Date().toISOString(),
      },
    },
    trigger: trigger,
  });
}

// Função para buscar histórico de notificações
export async function getHistoricoNotificacoes() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notificacoes_historico')
    .select('*')
    .eq('user_id', user.id)
    .order('data_envio', { ascending: false });

  if (error) {
    logger.error('Erro ao buscar histórico:', error);
    return [];
  }

  return data;
}

// Adicionar exportação padrão para resolver o aviso do Expo Router
const notificationsService = {
  registerForPushNotificationsAsync,
  sendPushNotification,
  scheduleLocalNotification,
  getHistoricoNotificacoes
};

export default notificationsService; 