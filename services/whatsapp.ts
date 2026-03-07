import { Alert, Linking, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export type AgendamentoMensagem = {
  cliente_nome: string;
  cliente_telefone: string; // pode vir com máscara
  data: string; // esperado YYYY-MM-DD
  hora: string; // ex: 09:00
  servico: string;
  empresa_nome?: string;
  valor?: number;
};

const MODELO_PADRAO = (
  '✨ Olá {cliente}. Você tem um horário agendado {dia}, {data}, às {hora}. ' +
  'Serviço: {servico}. *Podemos confirmar seu horário?*\n\n' +
  '*{empresa}*'
);

export function formatarData(isoDate: string) {
  // isoDate esperado no formato YYYY-MM-DD
  try {
    const [y, m, d] = isoDate.split('-').map(Number);
    if (!y || !m || !d) return isoDate;
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  } catch {
    return isoDate;
  }
}

export function obterDiaSemana(isoDate: string) {
  try {
    const [y, m, d] = isoDate.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    return dias[dt.getDay()];
  } catch {
    return '';
  }
}

async function getEmpresaId(): Promise<string | null> {
  const retryWithTimeout = async (fn: () => Promise<any>, retries = 2, timeout = 12000) => {
    let lastError;
    for (let i = 0; i <= retries; i++) {
      try {
        return await Promise.race([
          fn(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
        ]);
      } catch (err) {
        lastError = err;
        if (err?.message?.includes('permission') || err?.code === 'PGRST116') {
          if (typeof window !== 'undefined' && window.signOut) window.signOut();
          throw err;
        }
        if (i < retries) {
          logger.warn(`Retry ${i + 1} após erro:`, err);
          await new Promise(res => setTimeout(res, 1000 * (i + 1)));
        }
      }
    }
    throw lastError;
  };
  const { data: { user } } = await retryWithTimeout(() => supabase.auth.getUser());
  if (!user) return null;
  const { data, error } = await retryWithTimeout(() =>
    supabase
      .from('usuarios')
      .select('estabelecimento_id')
      .eq('id', user.id)
      .single()
  );
  if (error) return null;
  return data?.estabelecimento_id || null;
}

async function getEmpresaNome(empresaId: string): Promise<string | undefined> {
  const retryWithTimeout = async (fn: () => Promise<any>, retries = 2, timeout = 12000) => {
    let lastError;
    for (let i = 0; i <= retries; i++) {
      try {
        return await Promise.race([
          fn(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
        ]);
      } catch (err) {
        lastError = err;
        if (err?.message?.includes('permission') || err?.code === 'PGRST116') {
          if (typeof window !== 'undefined' && window.signOut) window.signOut();
          throw err;
        }
        if (i < retries) {
          logger.warn(`Retry ${i + 1} após erro:`, err);
          await new Promise(res => setTimeout(res, 1000 * (i + 1)));
        }
      }
    }
    throw lastError;
  };
  const { data, error } = await retryWithTimeout(() =>
    supabase
      .from('estabelecimentos')
      .select('nome')
      .eq('id', empresaId)
      .single()
  );
  if (error) return undefined;
  return data?.nome || undefined;
}

export async function getModeloMensagem(empresaId?: string): Promise<string> {
  let empresa = empresaId;
  if (!empresa) empresa = await getEmpresaId() as string | undefined;
  if (!empresa) return MODELO_PADRAO;

  const retryWithTimeout = async (fn: () => Promise<any>, retries = 2, timeout = 12000) => {
    let lastError;
    for (let i = 0; i <= retries; i++) {
      try {
        return await Promise.race([
          fn(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
        ]);
      } catch (err) {
        lastError = err;
        if (err?.message?.includes('permission') || err?.code === 'PGRST116') {
          if (typeof window !== 'undefined' && window.signOut) window.signOut();
          throw err;
        }
        if (i < retries) {
          logger.warn(`Retry ${i + 1} após erro:`, err);
          await new Promise(res => setTimeout(res, 1000 * (i + 1)));
        }
      }
    }
    throw lastError;
  };
  const { data, error } = await retryWithTimeout(() =>
    supabase
      .from('configuracoes_mensagens')
      .select('modelo')
      .eq('empresa_id', empresa)
      .eq('tipo', 'agendamento')
      .maybeSingle()
  );
  if (error) return MODELO_PADRAO;
  return data?.modelo || MODELO_PADRAO;
}

export async function salvarModeloMensagem(modelo: string, empresaId?: string) {
  let empresa = empresaId;
  if (!empresa) empresa = await getEmpresaId() as string | undefined;
  if (!empresa) throw new Error('Estabelecimento não identificado');

  const retryWithTimeout = async (fn: () => Promise<any>, retries = 2, timeout = 12000) => {
    let lastError;
    for (let i = 0; i <= retries; i++) {
      try {
        return await Promise.race([
          fn(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
        ]);
      } catch (err) {
        lastError = err;
        if (err?.message?.includes('permission') || err?.code === 'PGRST116') {
          if (typeof window !== 'undefined' && window.signOut) window.signOut();
          throw err;
        }
        if (i < retries) {
          logger.warn(`Retry ${i + 1} após erro:`, err);
          await new Promise(res => setTimeout(res, 1000 * (i + 1)));
        }
      }
    }
    throw lastError;
  };
  const { error } = await retryWithTimeout(() =>
    supabase
      .from('configuracoes_mensagens')
      .upsert({ empresa_id: empresa, tipo: 'agendamento', modelo }, { onConflict: 'empresa_id,tipo' })
  );
  if (error) throw error;
}

// ========== ANIVERSARIANTES ==========

const MODELO_ANIVERSARIANTE_PADRAO = `Olá, {cliente}! 🎉🎂

Hoje é um dia especial! A equipe da {empresa} deseja um Feliz Aniversário! 🎈

Parabéns pelos seus {idade} anos! Que este novo ciclo seja repleto de saúde, felicidade e realizações.

Aproveite para agendar um momento especial de cuidado e bem-estar com a gente! 💆‍♀️✨`;

export async function getModeloAniversariante(empresaId?: string): Promise<string> {
  let empresa = empresaId;
  if (!empresa) empresa = await getEmpresaId() as string | undefined;
  if (!empresa) return MODELO_ANIVERSARIANTE_PADRAO;

  const { data, error } = await supabase
    .from('configuracoes_mensagens')
    .select('modelo')
    .eq('empresa_id', empresa)
    .eq('tipo', 'aniversariante')
    .maybeSingle();

  if (error) {
    logger.error('Erro ao buscar modelo de aniversariante:', error);
    return MODELO_ANIVERSARIANTE_PADRAO;
  }

  return data?.modelo || MODELO_ANIVERSARIANTE_PADRAO;
}

export async function salvarModeloAniversariante(modelo: string, empresaId?: string) {
  let empresa = empresaId;
  if (!empresa) empresa = await getEmpresaId() as string | undefined;
  if (!empresa) throw new Error('Estabelecimento não identificado');

  const { error } = await supabase
    .from('configuracoes_mensagens')
    .upsert({ empresa_id: empresa, tipo: 'aniversariante', modelo }, { onConflict: 'empresa_id,tipo' });

  if (error) throw error;
}

export function normalizePhoneForWhatsapp(raw: string | undefined, defaultCountry = '55'): string | null {
  if (!raw) return null;
  // Remove tudo que não for dígito
  let digits = String(raw).replace(/\D/g, '');

  // Remove prefixos internacionais duplicados como 00
  if (digits.startsWith('00')) {
    digits = digits.replace(/^0+/, '');
  }

  // Se já contém o DDI do Brasil (55), usa como está
  if (digits.startsWith(defaultCountry)) {
    return digits;
  }

  // Números locais esperados no Brasil: 10 (sem 9 inicial) ou 11 dígitos (com 9)
  if (digits.length === 10 || digits.length === 11) {
    return defaultCountry + digits;
  }

  // Se for um número internacional com DDI (ex: 1xxxxxxxxxx), assume válido se >=11
  if (digits.length >= 11) {
    return digits;
  }

  return null;
}

export async function enviarMensagemWhatsapp(
  agendamento: AgendamentoMensagem,
  empresaIdOptional?: string
) {
  try {
    const empresaId = empresaIdOptional || (await getEmpresaId());
    const modelo = await getModeloMensagem(empresaId || undefined);

    // Assegura nome da empresa
    let empresaNome = agendamento.empresa_nome;
    if (!empresaNome && empresaId) {
      empresaNome = await getEmpresaNome(empresaId);
    }

    const mensagemFinal = modelo
      .replace(/\{cliente\}/g, agendamento.cliente_nome)
      .replace(/\{data\}/g, formatarData(agendamento.data))
      .replace(/\{hora\}/g, agendamento.hora)
      .replace(/\{servico\}/g, agendamento.servico)
      .replace(/\{empresa\}/g, empresaNome || '')
      .replace(/\{valor\}/g, agendamento.valor != null ? agendamento.valor.toFixed(2).replace('.', ',') : '')
      .replace(/\{dia\}/g, obterDiaSemana(agendamento.data));

    // Normaliza o telefone para o formato esperado pelo wa.me (DDI + número, sem sinais)
    const normalized = normalizePhoneForWhatsapp(agendamento.cliente_telefone);
    if (!normalized) {
      Alert.alert('Telefone inválido', 'O número do cliente parece inválido. Verifique o contato e tente novamente.');
      return;
    }

    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(mensagemFinal)}`;
    const fallback = `whatsapp://send?phone=${normalized}&text=${encodeURIComponent(mensagemFinal)}`;

    // Tenta abrir via esquema nativo primeiro (mais confiável em dispositivos móveis)
    try {
      const canNative = await Linking.canOpenURL(fallback);
      if (canNative) {
        await Linking.openURL(fallback);
        return;
      }
    } catch (e) {
      // ignora e tenta https
    }

    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
        return;
      }
    } catch (e) {
      // ignora
    }

    Alert.alert('WhatsApp indisponível', 'Não foi possível abrir o WhatsApp neste dispositivo.');
  } catch (err) {
    logger.error('Erro ao enviar WhatsApp:', err);
    Alert.alert('Erro', 'Não foi possível preparar a mensagem do WhatsApp.');
  }
}

export default enviarMensagemWhatsapp;
