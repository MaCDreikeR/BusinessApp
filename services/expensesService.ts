/**
 * 📊 SERVIÇO DE DESPESAS
 * 
 * Camada de serviço responsável por:
 * - CRUD completo de despesas
 * - Cálculo de estatísticas e resumos
 * - Filtros e queries otimizadas
 * - Gestão de categorias
 */

import { supabase } from '../lib/supabase';
import {
  Expense,
  ExpenseCategory,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseFilters,
  ExpenseSummary,
  DEFAULT_EXPENSE_CATEGORIES,
} from '../types/Expense';

/**
 * 🎯 DESPESAS - CRUD
 */

export const expensesService = {
  /**
   * Buscar todas as despesas com filtros
   */
  async getExpenses(
    estabelecimentoId: string,
    filters?: ExpenseFilters
  ): Promise<Expense[]> {
    let query = supabase
      .from('despesas')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .order('date', { ascending: false });

    // Aplicar filtros de período
    if (filters?.period) {
      const { startDate, endDate } = getDateRangeFromPeriod(filters.period, filters.startDate, filters.endDate);
      query = query.gte('date', startDate).lte('date', endDate);
    }

    // Filtro por categoria
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    // Filtro por forma de pagamento
    if (filters?.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod);
    }

    // Retry e timeout
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
            // Forçar signOut global se disponível
            if (typeof window !== 'undefined' && window.signOut) window.signOut();
            throw err;
          }
          if (i < retries) {
            console.warn(`Retry ${i + 1} após erro:`, err);
            await new Promise(res => setTimeout(res, 1000 * (i + 1)));
          }
        }
      }
      throw lastError;
    };

    const { data, error } = await retryWithTimeout(() => query);

    if (error) {
      console.error('Erro ao buscar despesas:', error);
      throw new Error('Não foi possível carregar as despesas');
    }

    return data || [];
  },

  /**
   * Buscar despesa por ID
   */
  async getExpenseById(id: string): Promise<Expense | null> {
    const { data, error } = await supabase
      .from('despesas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar despesa:', error);
      return null;
    }

    return data;
  },

  /**
   * Criar nova despesa
   */
  async createExpense(
    input: CreateExpenseInput,
    estabelecimentoId: string,
    userId: string
  ): Promise<Expense> {
    const { data, error } = await supabase
      .from('despesas')
      .insert({
        ...input,
        estabelecimento_id: estabelecimentoId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar despesa:', error);
      throw new Error('Não foi possível registrar a despesa');
    }

    // Se for recorrente, criar despesas para os próximos 12 meses
    if (input.recurring && input.recurring_frequency === 'monthly') {
      await this.createRecurringExpenses(input, estabelecimentoId, userId, 12);
    }

    return data;
  },

  /**
   * Criar despesas recorrentes para os próximos meses
   */
  async createRecurringExpenses(
    input: CreateExpenseInput,
    estabelecimentoId: string,
    userId: string,
    months: number
  ): Promise<void> {
    const baseDate = new Date(input.date);
    const recurringExpenses = [];

    for (let i = 1; i <= months; i++) {
      const nextDate = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth() + i,
        baseDate.getDate()
      );

      const year = nextDate.getFullYear();
      const month = String(nextDate.getMonth() + 1).padStart(2, '0');
      const day = String(nextDate.getDate()).padStart(2, '0');
      
      recurringExpenses.push({
        ...input,
        date: `${year}-${month}-${day}`,
        estabelecimento_id: estabelecimentoId,
        created_by: userId,
      });
    }

    const { error } = await supabase
      .from('despesas')
      .insert(recurringExpenses);

    if (error) {
      console.error('Erro ao criar despesas recorrentes:', error);
      // Não lançamos erro aqui para não bloquear a criação da despesa original
    }
  },

  /**
   * Atualizar despesa
   */
  async updateExpense(
    id: string,
    input: UpdateExpenseInput
  ): Promise<Expense> {
    const { data, error } = await supabase
      .from('despesas')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar despesa:', error);
      throw new Error('Não foi possível atualizar a despesa');
    }

    return data;
  },

  /**
   * Excluir despesa
   */
  async deleteExpense(id: string): Promise<void> {
    const { error } = await supabase
      .from('despesas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir despesa:', error);
      throw new Error('Não foi possível excluir a despesa');
    }
  },

  /**
   * 📊 Calcular resumo de despesas
   */
  async getExpenseSummary(
    estabelecimentoId: string,
    filters?: ExpenseFilters
  ): Promise<ExpenseSummary> {
    const expenses = await this.getExpenses(estabelecimentoId, filters);
    
    // Total de despesas
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Categoria com maior gasto
    const categoryTotals = new Map<string, number>();
    for (const expense of expenses) {
      const current = categoryTotals.get(expense.category_id) || 0;
      categoryTotals.set(expense.category_id, current + expense.amount);
    }

    let topCategory = null;
    if (categoryTotals.size > 0) {
      const [topCategoryId, topAmount] = Array.from(categoryTotals.entries())
        .sort((a, b) => b[1] - a[1])[0];
      
      const categories = await categoriesService.getCategories(estabelecimentoId);
      const category = categories.find(c => c.id === topCategoryId);
      topCategory = {
        name: category?.name || 'Desconhecida',
        amount: topAmount,
        percentage: total > 0 ? (topAmount / total) * 100 : 0,
      };
    }

    // Comparativo com período anterior
    const comparison = await this.calculateComparison(
      estabelecimentoId,
      filters,
      total
    );

    return {
      total,
      topCategory,
      comparison,
    };
  },

  /**
   * Calcular comparação com período anterior
   */
  async calculateComparison(
    estabelecimentoId: string,
    filters: ExpenseFilters | undefined,
    currentTotal: number
  ): Promise<{ percentage: number; trend: 'up' | 'down' | 'stable' }> {
    if (!filters?.period || filters.period === 'custom') {
      return { percentage: 0, trend: 'stable' };
    }

    const { startDate: prevStart, endDate: prevEnd } = getPreviousPeriodRange(
      filters.period
    );

    const previousExpenses = await this.getExpenses(estabelecimentoId, {
      ...filters,
      period: 'custom',
      startDate: prevStart,
      endDate: prevEnd,
    });

    const previousTotal = previousExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    if (previousTotal === 0) {
      return { percentage: 0, trend: 'stable' };
    }

    const percentage = ((currentTotal - previousTotal) / previousTotal) * 100;

    return {
      percentage: Math.abs(percentage),
      trend: percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'stable',
    };
  },
};

/**
 * 🏷️ CATEGORIAS - CRUD
 */

export const categoriesService = {
  /**
   * Buscar todas as categorias
   */
  async getCategories(estabelecimentoId: string): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
      .from('categorias_despesas')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Erro ao buscar categorias:', error);
      throw new Error('Não foi possível carregar as categorias');
    }

    return data || [];
  },

  /**
   * Buscar categoria por ID
   */
  async getCategoryById(id: string): Promise<ExpenseCategory | null> {
    const { data, error } = await supabase
      .from('categorias_despesas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar categoria:', error);
      return null;
    }

    return data;
  },

  /**
   * Inicializar categorias padrão
   */
  async initializeDefaultCategories(estabelecimentoId: string): Promise<void> {
    const existingCategories = await this.getCategories(estabelecimentoId);
    
    if (existingCategories.length > 0) {
      return; // Já existem categorias
    }

    const categoriesToInsert = DEFAULT_EXPENSE_CATEGORIES.map(cat => ({
      estabelecimento_id: estabelecimentoId,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      is_active: true,
    }));

    const { error } = await supabase
      .from('categorias_despesas')
      .insert(categoriesToInsert);

    if (error) {
      console.error('Erro ao criar categorias padrão:', error);
      throw new Error('Não foi possível criar categorias padrão');
    }
  },

  /**
   * Criar categoria customizada
   */
  async createCategory(
    estabelecimentoId: string,
    name: string,
    icon: string,
    color: string
  ): Promise<ExpenseCategory> {
    const { data, error } = await supabase
      .from('categorias_despesas')
      .insert({
        estabelecimento_id: estabelecimentoId,
        name,
        icon,
        color,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar categoria:', error);
      throw new Error('Não foi possível criar a categoria');
    }

    return data;
  },
};

/**
 * 📅 UTILITÁRIOS DE DATA
 */

function getDateRangeFromPeriod(
  period: string,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;

    case 'week':
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;

    case 'custom':
      if (!customStart || !customEnd) {
        // Se custom não tiver datas, usa o mês atual como fallback
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      }
      return {
        startDate: customStart,
        endDate: customEnd,
      };

    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

function getPreviousPeriodRange(period: string): { startDate: string; endDate: string } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case 'today':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setDate(now.getDate() - 1);
      endDate.setHours(23, 59, 59);
      break;

    case 'week':
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setDate(now.getDate() - dayOfWeek - 1);
      endDate.setHours(23, 59, 59);
      break;

    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;

    default:
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

// Exportar getCategoryById como função standalone para facilitar uso
export const getCategoryById = categoriesService.getCategoryById.bind(categoriesService);
