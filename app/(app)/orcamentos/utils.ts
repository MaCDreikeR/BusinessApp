import { supabase } from '@lib/supabase';
import { logger } from '../../../utils/logger';
import { Cliente as ClienteBase, Produto as ProdutoBase, Servico as ServicoBase, Pacote as PacoteBase } from '@types';
import { CacheManager, CacheNamespaces, CacheTTL } from '../../../utils/cacheManager';

export interface Orcamento {
  id: string;
  cliente: string;
  cliente_id?: string;
  data: Date;
  valor_total: number;
  forma_pagamento: string;
  parcelas: number;
  desconto: number;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  observacoes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrcamentoItem {
  id: string;
  orcamento_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  produto_id?: string;
  servico_id?: string;
  pacote_id?: string;
  tipo: 'produto' | 'servico' | 'pacote';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type Cliente = Pick<ClienteBase, 'id' | 'nome' | 'telefone' | 'email'> & {
  cpf?: string;
  data_nascimento?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  observacoes?: string;
};

export type Produto = Pick<ProdutoBase, 'id' | 'nome' | 'preco' | 'descricao'> & {
  quantidade_disponivel: number;
};

export type Servico = Pick<ServicoBase, 'id' | 'nome' | 'preco' | 'descricao' | 'categoria_id'> & {
  duracao?: number;
};

export type Pacote = Pick<PacoteBase, 'id' | 'nome' | 'descricao' | 'valor'> & {
  desconto: number;
};

export async function carregarOrcamentos() {
  try {
    logger.debug('Verificando autenticação...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      logger.error('Erro ao verificar usuário:', userError);
      throw new Error('Erro ao verificar autenticação');
    }

    if (!user) {
      logger.error('Usuário não autenticado');
      throw new Error('Usuário não autenticado');
    }
    
    // Tentar cache primeiro
    const cacheKey = `lista_${user.id}`;
    const cachedData = await CacheManager.get<Orcamento[]>(
      CacheNamespaces.RELATORIOS,
      cacheKey
    );
    
    if (cachedData) {
      logger.debug('📦 Orçamentos carregados do cache');
      return cachedData;
    }

    logger.debug('Usuário autenticado, carregando orçamentos...');
    const { data, error } = await supabase
      .from('orcamentos')
      .select('*')
      .eq('created_by', user.id)
      .order('data', { ascending: false });

    if (error) {
      logger.error('Erro ao carregar orçamentos:', error);
      throw error;
    }

    logger.debug('Orçamentos carregados com sucesso:', data?.length);
    
    // Salvar no cache com TTL de 5 minutos (reutiliza cacheKey já declarado acima)
    await CacheManager.set(
      CacheNamespaces.RELATORIOS,
      cacheKey,
      data || [],
      CacheTTL.FIVE_MINUTES
    );
    
    return data;
  } catch (error) {
    logger.error('Erro na função carregarOrcamentos:', error);
    throw error;
  }
}

export async function carregarOrcamentoPorId(id: string) {
  try {
    const { data: orcamento, error } = await supabase
      .from('orcamentos')
      .select(`
        id,
        cliente,
        cliente_id,
        data,
        valor_total,
        forma_pagamento,
        parcelas,
        desconto,
        status,
        observacoes
      `)
      .eq('id', id)
      .single();

    if (error) {
      logger.error('Erro ao carregar orçamento:', error);
      throw new Error('Não foi possível carregar o orçamento');
    }

    return orcamento;
  } catch (error) {
    logger.error('Erro ao carregar orçamento:', error);
    throw new Error('Não foi possível carregar o orçamento');
  }
}

export async function criarOrcamento(orcamento: Omit<Orcamento, 'id' | 'created_by' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('orcamentos')
    .insert([{
      ...orcamento,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  
  // Invalidar cache de orçamentos
  const cacheKey = `lista_${user.id}`;
  await CacheManager.remove(CacheNamespaces.RELATORIOS, cacheKey);
  
  return data;
}

export async function atualizarOrcamento(id: string, orcamento: Partial<Orcamento>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('orcamentos')
    .update(orcamento)
    .eq('id', id)
    .eq('created_by', user.id)
    .select()
    .single();

  if (error) throw error;
  
  // Invalidar cache de orçamentos
  const cacheKey = `lista_${user.id}`;
  await CacheManager.remove(CacheNamespaces.RELATORIOS, cacheKey);
  
  return data;
}

export async function excluirOrcamento(id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { error } = await supabase
    .from('orcamentos')
    .delete()
    .eq('id', id)
    .eq('created_by', user.id);

  if (error) throw error;
  
  // Invalidar cache de orçamentos
  const cacheKey = `lista_${user.id}`;
  await CacheManager.remove(CacheNamespaces.RELATORIOS, cacheKey);
}

export async function adicionarItemOrcamento(item: Omit<OrcamentoItem, 'id' | 'created_by' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('orcamento_itens')
    .insert([{
      ...item,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function atualizarItemOrcamento(id: string, item: Partial<OrcamentoItem>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('orcamento_itens')
    .update(item)
    .eq('id', id)
    .eq('created_by', user.id)
    .select()
    .single();

  if (error) throw error;
  
  // Invalidar cache de orçamentos
  const cacheKey = `lista_${user.id}`;
  await CacheManager.remove(CacheNamespaces.RELATORIOS, cacheKey);
  
  return data;
}

export async function excluirItemOrcamento(id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { error } = await supabase
    .from('orcamento_itens')
    .delete()
    .eq('id', id)
    .eq('created_by', user.id);

  if (error) throw error;
  
  // Invalidar cache de orçamentos
  const cacheKey = `lista_${user.id}`;
  await CacheManager.remove(CacheNamespaces.RELATORIOS, cacheKey);
}

export function calcularValorTotalOrcamento(itens: OrcamentoItem[]) {
  return itens.reduce((total, item) => {
    return total + (item.quantidade * item.valor_unitario);
  }, 0);
}

export function formatarData(data: Date) {
  return new Date(data).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatarValor(valor: number) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'aprovado':
      return '#059669'; // Verde
    case 'rejeitado':
      return '#DC2626'; // Vermelho
    case 'pendente':
    default:
      return '#D97706'; // Amarelo
  }
}

export function getStatusText(status: string) {
  switch (status) {
    case 'aprovado':
      return 'Aprovado';
    case 'rejeitado':
      return 'Rejeitado';
    case 'pendente':
    default:
      return 'Pendente';
  }
}

export async function buscarClientes(nome: string): Promise<Cliente[]> {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .ilike('nome', `%${nome}%`)
      .order('nome');

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Erro ao buscar clientes:', error);
    throw error;
  }
}

export async function criarCliente(cliente: Omit<Cliente, 'id'>): Promise<Cliente> {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .insert([cliente])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Erro ao criar cliente:', error);
    throw error;
  }
}

export async function buscarProdutos(nome: string): Promise<Produto[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .ilike('nome', `%${nome}%`)
      .order('nome');

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Erro ao buscar produtos:', error);
    throw error;
  }
}

export async function buscarServicos(nome: string): Promise<Servico[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .ilike('nome', `%${nome}%`)
      .order('nome');

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Erro ao buscar serviços:', error);
    throw error;
  }
}

export async function buscarPacotes(nome: string): Promise<Pacote[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('pacotes')
      .select(`
        id,
        nome,
        descricao,
        valor,
        desconto,
        pacotes_produtos (
          id,
          quantidade,
          produto:produtos (
            id,
            nome,
            preco
          )
        ),
        pacotes_servicos (
          id,
          quantidade,
          servico:servicos (
            id,
            nome,
            preco
          )
        )
      `)
      .ilike('nome', `%${nome}%`)
      .order('nome');

    if (error) throw error;

    // Garante que valor e desconto sejam números
    const pacotesFormatados = (data || []).map(pacote => ({
      ...pacote,
      valor: Number(pacote.valor),
      desconto: Number(pacote.desconto || 0)
    }));

    logger.debug('Pacotes encontrados:', pacotesFormatados); // Debug
    return pacotesFormatados;
  } catch (error) {
    logger.error('Erro ao buscar pacotes:', error);
    throw error;
  }
}

export async function carregarItensOrcamento(orcamentoId: string) {
  try {
    const { data: itens, error } = await supabase
      .from('orcamento_itens')
      .select(`
        id,
        descricao,
        quantidade,
        valor_unitario,
        tipo,
        produto_id,
        servico_id,
        pacote_id
      `)
      .eq('orcamento_id', orcamentoId);

    if (error) {
      logger.error('Erro ao carregar itens do orçamento:', error);
      throw new Error('Não foi possível carregar os itens do orçamento');
    }

    return itens;
  } catch (error) {
    logger.error('Erro ao carregar itens do orçamento:', error);
    throw new Error('Não foi possível carregar os itens do orçamento');
  }
}

// Adicionar exportação padrão para resolver o aviso do Expo Router
const orcamentosUtils = {
  carregarOrcamentos,
  carregarOrcamentoPorId,
  criarOrcamento,
  atualizarOrcamento,
  excluirOrcamento,
  adicionarItemOrcamento,
  atualizarItemOrcamento,
  excluirItemOrcamento,
  calcularValorTotalOrcamento,
  formatarData,
  formatarValor,
  getStatusColor,
  getStatusText,
  buscarClientes,
  criarCliente,
  buscarProdutos,
  buscarServicos,
  buscarPacotes,
  carregarItensOrcamento
};

export default orcamentosUtils; 