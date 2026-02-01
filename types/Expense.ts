/**
 * 💰 MODELO DE DADOS - DESPESAS
 * 
 * Estrutura projetada para:
 * - Registro rápido de despesas
 * - Categorização eficiente
 * - Suporte a despesas recorrentes
 * - Integração com relatórios financeiros
 */

export type PaymentMethod = 'pix' | 'credit' | 'debit' | 'cash' | 'bank_transfer';

export interface Expense {
  id: string;
  estabelecimento_id: string;
  amount: number; // Valor em centavos para evitar problemas com float
  category_id: string;
  description?: string;
  date: string; // ISO 8601 format (YYYY-MM-DD)
  payment_method: PaymentMethod;
  recurring?: boolean;
  recurring_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurring_day?: number; // Dia do mês/semana para recorrência
  attachment_url?: string; // Para notas fiscais/comprovantes futuros
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface ExpenseCategory {
  id: string;
  estabelecimento_id: string;
  name: string;
  icon: string; // Nome do ícone FontAwesome5
  color: string; // Hex color para identificação visual
  is_active: boolean;
  created_at: string;
}

// Categorias padrão que serão criadas automaticamente
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Aluguel', icon: 'home', color: '#FF6B6B' },
  { name: 'Salários', icon: 'users', color: '#4ECDC4' },
  { name: 'Energia', icon: 'bolt', color: '#FFE66D' },
  { name: 'Água', icon: 'tint', color: '#95E1D3' },
  { name: 'Internet', icon: 'wifi', color: '#A8E6CF' },
  { name: 'Telefone', icon: 'phone', color: '#DCEDC1' },
  { name: 'Produtos', icon: 'box', color: '#FFA07A' },
  { name: 'Marketing', icon: 'bullhorn', color: '#DDA0DD' },
  { name: 'Manutenção', icon: 'tools', color: '#87CEEB' },
  { name: 'Impostos', icon: 'file-invoice-dollar', color: '#F08080' },
  { name: 'Contador', icon: 'calculator', color: '#B0C4DE' },
  { name: 'Comissões', icon: 'hand-holding-usd', color: '#FF8C00' },
  { name: 'Diversos', icon: 'ellipsis-h', color: '#D3D3D3' },
];

// Tipos para filtros
export type PeriodFilter = 'today' | 'week' | 'month' | 'custom';

export interface ExpenseFilters {
  period: PeriodFilter;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
}

// Tipos para resumo/estatísticas
export interface ExpenseSummary {
  total: number;
  topCategory: {
    name: string;
    amount: number;
    percentage: number;
  } | null;
  comparison: {
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
}

// Tipo para criar/atualizar despesa (omitindo campos auto-gerados)
export type CreateExpenseInput = Omit<
  Expense,
  'id' | 'created_at' | 'updated_at' | 'estabelecimento_id' | 'created_by'
>;

export type UpdateExpenseInput = Partial<CreateExpenseInput>;
