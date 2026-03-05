import { useState, useCallback } from 'react';

/**
 * Hook reutilizável para gerenciar filtros da agenda
 * 
 * Gerencia:
 * - Data selecionada
 * - Usuário filtrado
 * - Modo de visualização (grid/list)
 */
export function useAgendaFilters(initialDate: Date = new Date()) {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const changeDate = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const nextDay = useCallback(() => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }, []);

  const previousDay = useCallback(() => {
    setSelectedDate(prev => {
      const previous = new Date(prev);
      previous.setDate(previous.getDate() - 1);
      return previous;
    });
  }, []);

  const toggleUsuario = useCallback((usuarioId: string) => {
    setSelectedUser(prev => prev === usuarioId ? null : usuarioId);
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedDate(new Date());
    setSelectedUser(null);
  }, []);

  return {
    selectedDate,
    selectedUser,
    viewMode,
    changeDate,
    nextDay,
    previousDay,
    toggleUsuario,
    toggleViewMode,
    resetFilters,
    setSelectedUser,
  };
}
