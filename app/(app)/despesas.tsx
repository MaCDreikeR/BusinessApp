import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useExpenses } from '../../hooks/useExpenses';
import { ExpenseFilters } from '../../components/ExpenseFilters';
import { ExpenseCard } from '../../components/ExpenseCard';
import { ExpenseForm } from '../../components/ExpenseForm';
import { Expense, CreateExpenseInput, PeriodFilter } from '../../types/Expense';
import { theme } from '../../utils/theme';

export default function DespesasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();

  const {
    expenses,
    categories,
    summary,
    filters,
    loading,
    refreshing,
    error,
    createExpense,
    updateExpense,
    deleteExpense,
    updateFilters,
    clearFilters,
    refresh,
    getCategoryById,
    isEmpty,
  } = useExpenses();

  const [formVisible, setFormVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const handleOpenForm = () => {
    setEditingExpense(null);
    setFormVisible(true);
  };

  const handleViewDetails = (expense: Expense) => {
    setSelectedExpense(expense);
    setDetailsVisible(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setDetailsVisible(false);
    setEditingExpense(expense);
    setFormVisible(true);
  };

  const handleSaveExpense = async (data: CreateExpenseInput) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, data);
    } else {
      await createExpense(data);
    }
  };

  const abrirDrawer = () => {
    navigation.dispatch(DrawerActions.toggleDrawer());
  };

  const formatCurrency = (cents: number): string => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <View style={styles.container}>
      {/* CABEÇALHO PADRÃO */}
      <View style={[styles.header, { paddingTop: insets.top, paddingBottom: 16 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={abrirDrawer}
          >
            <FontAwesome5 name="bars" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Despesas</Text>
        </View>

        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleOpenForm}
        >
          <FontAwesome5 name="plus" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ABAS DE FILTRO (PERÍODO) */}
      <View style={styles.filtrosWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filtrosContainer}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          <TouchableOpacity 
            style={[styles.filtroItem, filters.period === 'today' && styles.filtroAtivo]}
            onPress={() => updateFilters({ period: 'today' })}
          >
            <View style={[styles.filtroIcone, filters.period === 'today' && styles.filtroIconeAtivo]}>
              <FontAwesome5 name="calendar-day" size={16} color={filters.period === 'today' ? theme.colors.primary : '#666'} />
            </View>
            <Text style={[styles.filtroTexto, filters.period === 'today' && styles.filtroTextoAtivo]}>Hoje</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filtroItem, filters.period === 'week' && styles.filtroAtivo]}
            onPress={() => updateFilters({ period: 'week' })}
          >
            <View style={[styles.filtroIcone, filters.period === 'week' && styles.filtroIconeAtivo]}>
              <FontAwesome5 name="calendar-week" size={16} color={filters.period === 'week' ? theme.colors.primary : '#666'} />
            </View>
            <Text style={[styles.filtroTexto, filters.period === 'week' && styles.filtroTextoAtivo]}>Semana</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filtroItem, filters.period === 'month' && styles.filtroAtivo]}
            onPress={() => updateFilters({ period: 'month' })}
          >
            <View style={[styles.filtroIcone, filters.period === 'month' && styles.filtroIconeAtivo]}>
              <FontAwesome5 name="calendar-alt" size={16} color={filters.period === 'month' ? theme.colors.primary : '#666'} />
            </View>
            <Text style={[styles.filtroTexto, filters.period === 'month' && styles.filtroTextoAtivo]}>Mês</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filtroItem, filters.period === 'custom' && styles.filtroAtivo]}
            onPress={() => updateFilters({ period: 'custom' })}
          >
            <View style={[styles.filtroIcone, filters.period === 'custom' && styles.filtroIconeAtivo]}>
              <FontAwesome5 name="calendar" size={16} color={filters.period === 'custom' ? theme.colors.primary : '#666'} />
            </View>
            <Text style={[styles.filtroTexto, filters.period === 'custom' && styles.filtroTextoAtivo]}>Personalizado</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* SELETOR DE DATAS PERSONALIZADO */}
      {filters.period === 'custom' && (
        <View style={styles.customDateContainer}>
          <View style={styles.datePickerRow}>
            <View style={styles.datePickerItem}>
              <Text style={styles.dateLabel}>Data Início</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <FontAwesome5 name="calendar" size={14} color="#666" />
                <Text style={styles.dateButtonText}>
                  {filters.startDate 
                    ? (() => {
                        const [year, month, day] = filters.startDate.split('-');
                        return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('pt-BR');
                      })()
                    : 'Selecione'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerItem}>
              <Text style={styles.dateLabel}>Data Fim</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <FontAwesome5 name="calendar" size={14} color="#666" />
                <Text style={styles.dateButtonText}>
                  {filters.endDate 
                    ? (() => {
                        const [year, month, day] = filters.endDate.split('-');
                        return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('pt-BR');
                      })()
                    : 'Selecione'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* CARDS DE RESUMO */}
      <View style={styles.cardsContainer}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="wallet" size={18} color="#FF4444" />
            <Text style={styles.cardTitle}>Total</Text>
          </View>
          <Text style={[styles.cardValue, { color: '#FF4444' }]}>
            {formatCurrency(summary.total)}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="chart-pie" size={18} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Maior</Text>
          </View>
          {summary.topCategory ? (
            <>
              <Text style={styles.cardValue} numberOfLines={1}>
                {summary.topCategory.name}
              </Text>
              <Text style={styles.cardSubtitle}>
                {formatCurrency(summary.topCategory.amount)}
              </Text>
            </>
          ) : (
            <Text style={styles.cardEmpty}>Sem dados</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 
              name={summary.comparison.trend === 'up' ? 'arrow-up' : summary.comparison.trend === 'down' ? 'arrow-down' : 'minus'} 
              size={18} 
              color={summary.comparison.trend === 'up' ? '#FF4444' : summary.comparison.trend === 'down' ? '#4CAF50' : '#666'} 
            />
            <Text style={styles.cardTitle}>Variação</Text>
          </View>
          <Text style={[
            styles.cardValue,
            { color: summary.comparison.trend === 'up' ? '#FF4444' : summary.comparison.trend === 'down' ? '#4CAF50' : '#666' }
          ]}>
            {summary.comparison.percentage > 0 ? `${summary.comparison.percentage.toFixed(0)}%` : '—'}
          </Text>
        </View>
      </View>

      {/* CONTADOR */}
      <View style={styles.contadorContainer}>
        <Text style={styles.contadorTexto}>
          {expenses.length} {expenses.length === 1 ? 'despesa' : 'despesas'}
        </Text>
      </View>

      {/* LISTA DE DESPESAS */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="inbox" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Nenhuma despesa registrada</Text>
          <Text style={styles.emptyDescription}>
            Comece registrando suas despesas para ter controle financeiro
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleOpenForm}
          >
            <FontAwesome5 name="plus" size={16} color="#fff" />
            <Text style={styles.emptyButtonText}>Registrar Primeira Despesa</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ExpenseCard
              expense={item}
              category={getCategoryById(item.category_id)}
              onPress={() => handleViewDetails(item)}
              onEdit={() => handleEditExpense(item)}
              onDelete={() => deleteExpense(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* MODAL DE DETALHES */}
      {selectedExpense && (
        <Modal
          visible={detailsVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDetailsVisible(false)}
        >
          <TouchableOpacity 
            style={styles.detailsOverlay}
            activeOpacity={1}
            onPress={() => setDetailsVisible(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.detailsCard}>
                {/* Valor */}
                <Text style={styles.detailsAmount}>
                  {(selectedExpense.amount / 100).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </Text>

                {/* Categoria */}
                <View style={styles.detailsInfoRow}>
                  {getCategoryById(selectedExpense.category_id) && (
                    <>
                      <View 
                        style={[
                          styles.detailsCategoryIcon,
                          { backgroundColor: getCategoryById(selectedExpense.category_id)?.color }
                        ]}
                      >
                        <FontAwesome5 
                          name={getCategoryById(selectedExpense.category_id)?.icon || 'tag'} 
                          size={14} 
                          color="#fff" 
                        />
                      </View>
                      <Text style={styles.detailsCategoryText}>
                        {getCategoryById(selectedExpense.category_id)?.name}
                      </Text>
                    </>
                  )}
                </View>

                {/* Data */}
                <View style={styles.detailsInfoRow}>
                  <FontAwesome5 name="calendar" size={14} color="#666" />
                  <Text style={styles.detailsInfoText}>
                    {(() => {
                      const [year, month, day] = selectedExpense.date.split('-');
                      return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('pt-BR');
                    })()}
                  </Text>
                </View>

                {/* Forma de Pagamento */}
                <View style={styles.detailsInfoRow}>
                  <FontAwesome5 name="credit-card" size={14} color="#666" />
                  <Text style={styles.detailsInfoText}>
                    {selectedExpense.payment_method === 'pix' ? 'PIX' :
                     selectedExpense.payment_method === 'credit' ? 'Crédito' :
                     selectedExpense.payment_method === 'debit' ? 'Débito' :
                     selectedExpense.payment_method === 'cash' ? 'Dinheiro' :
                     'Transferência'}
                  </Text>
                </View>

                {/* Recorrente */}
                {selectedExpense.recurring && (
                  <View style={styles.detailsInfoRow}>
                    <FontAwesome5 name="redo" size={14} color="#666" />
                    <Text style={[styles.detailsInfoText, { color: '#666', fontWeight: '500' }]}>
                      Despesa Recorrente
                    </Text>
                  </View>
                )}

                {/* Descrição */}
                {selectedExpense.description && (
                  <View style={styles.detailsDescriptionBox}>
                    <Text style={styles.detailsDescriptionText}>
                      {selectedExpense.description}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* MODAL DE FORMULÁRIO */}
      <ExpenseForm
        visible={formVisible}
        expense={editingExpense}
        categories={categories}
        onClose={() => {
          setFormVisible(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
      />

      {/* DATE PICKERS */}
      {showStartDatePicker && (
        <DateTimePicker
          value={filters.startDate ? (() => {
            const [year, month, day] = filters.startDate.split('-');
            return new Date(Number(year), Number(month) - 1, Number(day));
          })() : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) {
              // Normalizar para meio-dia para evitar problemas de timezone
              const normalized = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                12,
                0,
                0
              );
              const year = normalized.getFullYear();
              const month = String(normalized.getMonth() + 1).padStart(2, '0');
              const day = String(normalized.getDate()).padStart(2, '0');
              updateFilters({ 
                startDate: `${year}-${month}-${day}`
              });
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={filters.endDate ? (() => {
            const [year, month, day] = filters.endDate.split('-');
            return new Date(Number(year), Number(month) - 1, Number(day));
          })() : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              // Normalizar para meio-dia para evitar problemas de timezone
              const normalized = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                12,
                0,
                0
              );
              const year = normalized.getFullYear();
              const month = String(normalized.getMonth() + 1).padStart(2, '0');
              const day = String(normalized.getDate()).padStart(2, '0');
              updateFilters({ 
                endDate: `${year}-${month}-${day}`
              });
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Header
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },

  // Filtros (Abas)
  filtrosWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filtrosContainer: {
    paddingVertical: 12,
  },
  filtroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: '#f5f5f5',
  },
  filtroAtivo: {
    backgroundColor: '#E8F5E9',
  },
  filtroIcone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  filtroIconeAtivo: {
    backgroundColor: '#fff',
  },
  filtroTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filtroTextoAtivo: {
    color: '#2e7d32',
  },

  // Seletor de Data Personalizada
  customDateContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  datePickerItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
  },

  // Cards de Resumo
  cardsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  card: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#999',
  },
  cardEmpty: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },

  // Contador
  contadorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  contadorTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },

  // Lista
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    backgroundColor: '#2e7d32',
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal de Detalhes
  detailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: 320,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  detailsAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  detailsInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  detailsInfoText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  detailsCategoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCategoryText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  detailsDescriptionBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailsDescriptionText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});