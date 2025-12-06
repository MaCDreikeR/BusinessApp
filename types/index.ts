/**
 * Tipos Centralizados - BusinessApp
 * 
 * Este arquivo contém todas as interfaces TypeScript usadas no projeto.
 * Evita duplicação e facilita manutenção.
 * 
 * Uso:
 * import { Cliente, Produto, Servico } from '@types';
 */

// ============================================================================
// AUTENTICAÇÃO E USUÁRIO
// ============================================================================

export interface User {
  id: string;
  email: string;
  email_confirmed_at?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface Usuario {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  foto_url?: string;
  is_principal: boolean;
  estabelecimento_id: string;
  role?: 'admin' | 'funcionario' | 'super_admin';
  created_at?: string;
  updated_at?: string;
}

export interface UsuarioPermissoes {
  id: string;
  usuario_id: string;
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
  pode_editar_relatorios: boolean;
  pode_ver_configuracoes: boolean;
  pode_editar_configuracoes: boolean;
  pode_ver_usuarios: boolean;
  pode_editar_usuarios: boolean;
}

// ============================================================================
// ESTABELECIMENTO
// ============================================================================

export interface Estabelecimento {
  id: string;
  nome: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  logo_url?: string;
  status: 'ativa' | 'inativa' | 'suspensa';
  plano?: 'basico' | 'profissional' | 'premium';
  data_expiracao?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CLIENTES
// ============================================================================

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  cpf?: string;
  data_nascimento?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  foto_url?: string;
  observacoes?: string;
  saldo_crediario?: number;
  estabelecimento_id: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// PRODUTOS
// ============================================================================

export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  custo?: number;
  codigo_barras?: string;
  quantidade: number;
  quantidade_minima?: number;
  quantidade_disponivel?: number; // Alias para quantidade
  unidade?: string;
  categoria_id?: string;
  fornecedor_id?: string;
  foto_url?: string;
  ativo?: boolean;
  estabelecimento_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface CategoriaEstoque {
  id: string;
  nome: string;
  descricao?: string;
  estabelecimento_id: string;
  created_at?: string;
}

export interface MovimentacaoEstoque {
  id: string;
  produto_id: string;
  tipo: 'entrada' | 'saida' | 'ajuste';
  quantidade: number;
  valor_unitario?: number;
  observacoes?: string;
  usuario_id: string;
  estabelecimento_id: string;
  created_at: string;
}

// ============================================================================
// SERVIÇOS
// ============================================================================

export interface Servico {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  duracao?: number; // em minutos
  categoria_id?: string;
  comissao?: number;
  ativo?: boolean;
  estabelecimento_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface CategoriaServico {
  id: string;
  nome: string;
  descricao?: string;
  estabelecimento_id: string;
  created_at?: string;
}

// ============================================================================
// AGENDAMENTOS
// ============================================================================

export interface Agendamento {
  id: string;
  cliente_id: string;
  cliente_nome?: string;
  cliente_foto?: string | null;
  servico_id?: string;
  servico?: string;
  usuario_id?: string;
  usuario_nome?: string;
  horario: string;
  horario_termino?: string;
  data?: string;
  status?: 'pendente' | 'confirmado' | 'concluido' | 'cancelado';
  observacoes?: string;
  valor?: number;
  estabelecimento_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface AgendamentoNotificacao {
  id: string;
  agendamento_id: string;
  tipo: 'lembrete' | 'confirmacao';
  enviado: boolean;
  data_envio?: string;
  created_at: string;
}

// ============================================================================
// VENDAS E COMANDAS
// ============================================================================

export interface Venda {
  id: string;
  cliente_id?: string;
  cliente_nome?: string;
  valor: number;
  valor_total?: number; // Alias
  forma_pagamento: 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'pix' | 'crediario';
  parcelas?: number;
  desconto?: number;
  data: string;
  observacoes?: string;
  usuario_id: string;
  estabelecimento_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface ItemVenda {
  id: string;
  venda_id: string;
  produto_id?: string;
  servico_id?: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  tipo: 'produto' | 'servico';
  created_at?: string;
}

export interface Comanda {
  id: string;
  numero?: number;
  cliente_id: string;
  cliente_nome?: string;
  cliente_foto?: string;
  status: 'aberta' | 'fechada' | 'cancelada';
  valor_total: number;
  desconto?: number;
  observacoes?: string;
  data_abertura: string;
  data_fechamento?: string;
  usuario_id: string;
  estabelecimento_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface ItemComanda {
  id: string;
  comanda_id: string;
  produto_id?: string;
  servico_id?: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  tipo: 'produto' | 'servico';
  usuario_id?: string;
  created_at?: string;
}

// ============================================================================
// ORÇAMENTOS
// ============================================================================

export interface Orcamento {
  id: string;
  cliente: string;
  cliente_id?: string;
  cliente_nome?: string;
  data: Date | string;
  valor_total: number;
  forma_pagamento: string;
  parcelas: number;
  desconto: number;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  observacoes?: string;
  usuario_id?: string;
  created_by?: string; // Alias para usuario_id
  estabelecimento_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrcamentoItem {
  id: string;
  orcamento_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total?: number;
  produto_id?: string;
  servico_id?: string;
  pacote_id?: string;
  tipo: 'produto' | 'servico' | 'pacote';
  usuario_id?: string;
  created_by?: string; // Alias para usuario_id
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PACOTES
// ============================================================================

export interface Pacote {
  id: string;
  nome: string;
  descricao?: string;
  valor: number;
  desconto: number;
  validade_dias?: number;
  ativo?: boolean;
  estabelecimento_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProdutoPacote {
  id: string;
  pacote_id: string;
  produto_id: string;
  produto_nome?: string;
  quantidade: number;
  created_at?: string;
}

export interface ServicoPacote {
  id: string;
  pacote_id: string;
  servico_id: string;
  servico_nome?: string;
  quantidade: number;
  created_at?: string;
}

export interface ProdutoPacoteData {
  produto_id: string;
  quantidade: number;
}

export interface ServicoPacoteData {
  servico_id: string;
  quantidade: number;
}

// ============================================================================
// FORNECEDORES
// ============================================================================

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  contato?: string;
  observacoes?: string;
  ativo?: boolean;
  estabelecimento_id: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// COMISSÕES
// ============================================================================

export interface Comissao {
  id: string;
  usuario_id: string;
  usuario_nome?: string;
  venda_id?: string;
  servico_id?: string;
  valor: number;
  percentual: number;
  status: 'pendente' | 'paga';
  data_pagamento?: string;
  mes_referencia: string;
  estabelecimento_id: string;
  created_at: string;
}

// ============================================================================
// DESPESAS
// ============================================================================

export interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
  forma_pagamento: 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'pix' | 'boleto';
  recorrente?: boolean;
  observacoes?: string;
  usuario_id: string;
  estabelecimento_id: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// NOTIFICAÇÕES
// ============================================================================

export interface Notificacao {
  id: string;
  usuario_id: string;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'alerta' | 'erro' | 'sucesso';
  lida: boolean;
  link?: string;
  data: string;
  estabelecimento_id?: string;
  created_at?: string;
}

export interface NotificacaoPush {
  id: string;
  usuario_id: string;
  titulo: string;
  corpo: string;
  dados?: any;
  enviada: boolean;
  erro?: string;
  created_at: string;
}

// ============================================================================
// METAS
// ============================================================================

export interface Meta {
  id: string;
  descricao: string;
  tipo: 'vendas' | 'servicos' | 'clientes' | 'produtos';
  valor_meta: number;
  valor_atual: number;
  mes_referencia: string;
  usuario_id?: string;
  estabelecimento_id: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// RELATÓRIOS
// ============================================================================

export interface RelatorioVendas {
  total_vendas: number;
  valor_total: number;
  ticket_medio: number;
  forma_pagamento: {
    dinheiro: number;
    cartao_debito: number;
    cartao_credito: number;
    pix: number;
    crediario: number;
  };
  vendas_por_dia: {
    data: string;
    total: number;
    valor: number;
  }[];
}

export interface RelatorioProdutos {
  total_produtos: number;
  valor_estoque: number;
  produtos_baixo_estoque: Produto[];
  produtos_mais_vendidos: {
    produto_id: string;
    nome: string;
    quantidade: number;
    valor_total: number;
  }[];
}

export interface RelatorioServicos {
  total_servicos: number;
  servicos_realizados: number;
  valor_total: number;
  servicos_mais_vendidos: {
    servico_id: string;
    nome: string;
    quantidade: number;
    valor_total: number;
  }[];
}

// ============================================================================
// AUTOMAÇÃO
// ============================================================================

export interface AutomacaoMensagem {
  id: string;
  tipo: 'lembrete_agendamento' | 'confirmacao_agendamento' | 'aniversario' | 'marketing';
  titulo: string;
  mensagem: string;
  ativa: boolean;
  dias_antecedencia?: number;
  horario_envio?: string;
  estabelecimento_id: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// TIPOS AUXILIARES
// ============================================================================

export type FormaPagamento = 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'pix' | 'crediario' | 'boleto';

export type StatusComanda = 'aberta' | 'fechada' | 'cancelada';

export type StatusAgendamento = 'pendente' | 'confirmado' | 'concluido' | 'cancelado';

export type StatusOrcamento = 'pendente' | 'aprovado' | 'rejeitado';

export type TipoMovimentacao = 'entrada' | 'saida' | 'ajuste';

export type TipoItem = 'produto' | 'servico' | 'pacote';

export type UserRole = 'admin' | 'funcionario' | 'super_admin';

export type StatusEstabelecimento = 'ativa' | 'inativa' | 'suspensa';

export type PlanoEstabelecimento = 'basico' | 'profissional' | 'premium';

// ============================================================================
// TIPOS EXTENDIDOS (para casos específicos)
// ============================================================================

export interface ServicoSelecionado extends Servico {
  usuario_id?: string;
  usuario_nome?: string;
}

export interface ProdutoComEstoque extends Produto {
  estoque_baixo?: boolean;
}

export interface ClienteComSaldo extends Cliente {
  saldo_disponivel?: number;
  limite_credito?: number;
}

export interface VendaComItens extends Venda {
  itens?: ItemVenda[];
}

export interface ComandaComItens extends Comanda {
  itens?: ItemComanda[];
}

export interface OrcamentoComItens extends Orcamento {
  itens?: OrcamentoItem[];
}

export interface PacoteCompleto extends Pacote {
  produtos?: ProdutoPacote[];
  servicos?: ServicoPacote[];
}

// ============================================================================
// TIPOS PARA FORMULÁRIOS
// ============================================================================

export interface ClienteFormData {
  nome: string;
  telefone: string;
  email?: string;
  cpf?: string;
  data_nascimento?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  observacoes?: string;
}

export interface ProdutoFormData {
  nome: string;
  descricao?: string;
  preco: number;
  custo?: number;
  quantidade: number;
  quantidade_minima?: number;
  unidade?: string;
  categoria_id?: string;
  fornecedor_id?: string;
}

export interface ServicoFormData {
  nome: string;
  descricao?: string;
  preco: number;
  duracao?: number;
  categoria_id?: string;
  comissao?: number;
}

export interface AgendamentoFormData {
  cliente_id: string;
  servico_id: string;
  usuario_id?: string;
  horario: string;
  observacoes?: string;
}

export interface VendaFormData {
  cliente_id?: string;
  forma_pagamento: FormaPagamento;
  parcelas?: number;
  desconto?: number;
  observacoes?: string;
  itens: {
    produto_id?: string;
    servico_id?: string;
    descricao: string;
    quantidade: number;
    valor_unitario: number;
    tipo: TipoItem;
  }[];
}
