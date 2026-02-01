/**
 * 🎣 HOOK - GERENCIAMENTO DE DESPESAS
 * 
 * Fornece interface reativa para:
 * - Listagem de despesas com filtros
 * - Estatísticas e resumos
 * - CRUD completo
 * - Estado de loading e erros
 * - Invalidação de cache
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Expense,
  ExpenseCategory,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseFilters,
  ExpenseSummary,
} from '../types/Expense';
import { expensesService, categoriesService } from '../services/expensesService';

export function useExpenses(initialFilters?: ExpenseFilters) {
  const { user, estabelecimentoId } = useAuth();

  // Estados
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    total: 0,
    topCategory: null,
    comparison: { percentage: 0, trend: 'stable' },
  });
  
  const [filters, setFilters] = useState<ExpenseFilters>(
    initialFilters || { period: 'month' }
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carregar dados completos (despesas + categorias + resumo)
   */
  const loadData = useCallback(async (showLoading = true) => {
    if (!estabelecimentoId) return;

    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Carregar categorias (inicializar padrão se necessário)
      await categoriesService.initializeDefaultCategories(estabelecimentoId);
      const [expensesData, categoriesData, summaryData] = await Promise.all([
        expensesService.getExpenses(estabelecimentoId, filters),
        categoriesService.getCategories(estabelecimentoId),
        expensesService.getExpenseSummary(estabelecimentoId, filters),
      ]);

      setExpenses(expensesData);
      setCategories(categoriesData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Erro ao carregar despesas:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [estabelecimentoId, filters]);

  /**
   * Refresh manual (pull-to-refresh)
   */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(false);
  }, [loadData]);

  /**
   * Criar nova despesa
   */
  const createExpense = useCallback(
    async (input: CreateExpenseInput): Promise<Expense> => {
      if (!estabelecimentoId || !user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const newExpense = await expensesService.createExpense(
        input,
        estabelecimentoId,
        user.id
      );

      // Atualizar lista localmente
      setExpenses(prev => [newExpense, ...prev]);

      // Recarregar resumo
      const newSummary = await expensesService.getExpenseSummary(
        estabelecimentoId,
        filters
      );
      setSummary(newSummary);

      return newExpense;
    },
    [estabelecimentoId, user, filters]
  );

  /**
   * Atualizar despesa
   */
  const updateExpense = useCallback(
    async (id: string, input: UpdateExpenseInput): Promise<Expense> => {
      const updatedExpense = await expensesService.updateExpense(id, input);

      // Atualizar lista localmente
      setExpenses(prev =>
        prev.map(exp => (exp.id === id ? updatedExpense : exp))
      );

      // Recarregar resumo
      if (estabelecimentoId) {
        const newSummary = await expensesService.getExpenseSummary(
          estabelecimentoId,
          filters
        );
        setSummary(newSummary);
      }

      return updatedExpense;
    },
    [estabelecimentoId, filters]
  );

  /**
   * Excluir despesa
   */
  const deleteExpense = useCallback(
    async (id: string): Promise<void> => {
      await expensesService.deleteExpense(id);

      // Remover da lista localmente
      setExpenses(prev => prev.filter(exp => exp.id !== id));

      // Recarregar resumo
      if (estabelecimentoId) {
        const newSummary = await expensesService.getExpenseSummary(
          estabelecimentoId,
          filters
        );
        setSummary(newSummary);
      }
    },
    [estabelecimentoId, filters]
  );

  /**
   * Atualizar filtros
   */
  const updateFilters = useCallback((newFilters: Partial<ExpenseFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * Limpar filtros
   */
  const clearFilters = useCallback(() => {
    setFilters({ period: 'month' });
  }, []);

  /**
   * Buscar categoria por ID
   */
  const getCategoryById = useCallback(
    (categoryId: string): ExpenseCategory | undefined => {
      return categories.find(cat => cat.id === categoryId);
    },
    [categories]
  );

  // Carregar dados quando filtros mudarem
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // Dados
    expenses,
    categories,
    summary,
    filters,
    
    // Estados
    loading,
    refreshing,
    error,
    
    // Ações
    createExpense,
    updateExpense,
    deleteExpense,
    updateFilters,
    clearFilters,
    refresh,
    getCategoryById,
    
    // Utilitários
    hasData: expenses.length > 0,
    isEmpty: !loading && expenses.length === 0,
  };
}
