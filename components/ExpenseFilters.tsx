/**
 * 🔍 COMPONENTE - FILTROS DE DESPESAS
 * 
 * Filtros rápidos e intuitivos:
 * - Período (hoje, semana, mês, personalizado)
 * - Categoria
 * - Forma de pagamento
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ExpenseFilters as ExpenseFiltersType, ExpenseCategory, PaymentMethod, PeriodFilter } from '../types/Expense';
import { useTheme } from '../contexts/ThemeContext';

interface ExpenseFiltersProps {
  filters: ExpenseFiltersType;
  categories: ExpenseCategory[];
  onFiltersChange: (filters: Partial<ExpenseFiltersType>) => void;
  onClearFilters: () => void;
}

const PERIOD_OPTIONS: { id: PeriodFilter; label: string; icon: string }[] = [
  { id: 'today', label: 'Hoje', icon: 'calendar-day' },
  { id: 'week', label: 'Semana', icon: 'calendar-week' },
  { id: 'month', label: 'Mês', icon: 'calendar-alt' },
  { id: 'custom', label: 'Personalizado', icon: 'calendar' },
];

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'pix', label: 'PIX', icon: 'qrcode' },
  { id: 'credit', label: 'Crédito', icon: 'credit-card' },
  { id: 'debit', label: 'Débito', icon: 'credit-card' },
  { id: 'cash', label: 'Dinheiro', icon: 'money-bill-wave' },
  { id: 'bank_transfer', label: 'Transferência', icon: 'exchange-alt' },
];

export function ExpenseFilters({
  filters,
  categories,
  onFiltersChange,
  onClearFilters,
}: ExpenseFiltersProps) {
  const { colors } = useTheme();
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const selectedCategory = categories.find(c => c.id === filters.categoryId);
  const selectedPayment = PAYMENT_OPTIONS.find(p => p.id === filters.paymentMethod);

  const hasActiveFilters = filters.categoryId || filters.paymentMethod;

  const handlePeriodChange = (period: PeriodFilter) => {
    if (period === 'custom') {
      // Modo personalizado ativa os date pickers
      onFiltersChange({ period, startDate: undefined, endDate: undefined });
    } else {
      onFiltersChange({ period, startDate: undefined, endDate: undefined });
    }
  };

  const handleStartDateChange = (event: any, date?: Date) => {
    setShowStartDatePicker(false);
    if (date) {
      onFiltersChange({ startDate: date.toISOString().split('T')[0] });
    }
  };

  const handleEndDateChange = (event: any, date?: Date) => {
    setShowEndDatePicker(false);
    if (date) {
      onFiltersChange({ endDate: date.toISOString().split('T')[0] });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Filtro de Período */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Período</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.periodScroll}
      >
        {PERIOD_OPTIONS.map(option => {
          const isActive = filters.period === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.periodButton,
                {
                  backgroundColor: isActive ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handlePeriodChange(option.id)}
            >
              <FontAwesome5
                name={option.icon}
                size={16}
                color={isActive ? '#fff' : colors.text}
              />
              <Text
                style={[
                  styles.periodButtonText,
                  { color: isActive ? '#fff' : colors.text },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Date Pickers para período customizado */}
      {filters.period === 'custom' && (
        <View style={styles.customDateContainer}>
          <TouchableOpacity
            style={[styles.dateButton, { borderColor: colors.border }]}
            onPress={() => setShowStartDatePicker(true)}
          >
            <FontAwesome5 name="calendar" size={14} color={colors.text} />
            <Text style={[styles.dateButtonText, { color: colors.text }]}>
              {filters.startDate || 'Data Início'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.dateSeparator, { color: colors.text }]}>até</Text>

          <TouchableOpacity
            style={[styles.dateButton, { borderColor: colors.border }]}
            onPress={() => setShowEndDatePicker(true)}
          >
            <FontAwesome5 name="calendar" size={14} color={colors.text} />
            <Text style={[styles.dateButtonText, { color: colors.text }]}>
              {filters.endDate || 'Data Fim'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filtros Secundários */}
      <View style={styles.secondaryFilters}>
        {/* Categoria */}
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: filters.categoryId ? colors.primary : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setShowCategoryModal(true)}
        >
          <FontAwesome5
            name="tag"
            size={14}
            color={filters.categoryId ? '#fff' : colors.text}
          />
          <Text
            style={[
              styles.filterButtonText,
              { color: filters.categoryId ? '#fff' : colors.text },
            ]}
            numberOfLines={1}
          >
            {selectedCategory?.name || 'Categoria'}
          </Text>
        </TouchableOpacity>

        {/* Forma de Pagamento */}
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: filters.paymentMethod ? colors.primary : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setShowPaymentModal(true)}
        >
          <FontAwesome5
            name="credit-card"
            size={14}
            color={filters.paymentMethod ? '#fff' : colors.text}
          />
          <Text
            style={[
              styles.filterButtonText,
              { color: filters.paymentMethod ? '#fff' : colors.text },
            ]}
            numberOfLines={1}
          >
            {selectedPayment?.label || 'Pagamento'}
          </Text>
        </TouchableOpacity>

        {/* Limpar filtros */}
        {hasActiveFilters && (
          <TouchableOpacity
            style={[styles.clearButton, { borderColor: colors.border }]}
            onPress={onClearFilters}
          >
            <FontAwesome5 name="times" size={14} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Modal de Categorias */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Filtrar por Categoria
            </Text>
            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={[styles.modalItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  onFiltersChange({ categoryId: undefined });
                  setShowCategoryModal(false);
                }}
              >
                <Text style={[styles.modalItemText, { color: colors.text }]}>
                  Todas as categorias
                </Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    onFiltersChange({ categoryId: cat.id });
                    setShowCategoryModal(false);
                  }}
                >
                  <FontAwesome5 name={cat.icon} size={16} color={cat.color} />
                  <Text style={[styles.modalItemText, { color: colors.text }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Formas de Pagamento */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPaymentModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Filtrar por Pagamento
            </Text>
            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={[styles.modalItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  onFiltersChange({ paymentMethod: undefined });
                  setShowPaymentModal(false);
                }}
              >
                <Text style={[styles.modalItemText, { color: colors.text }]}>
                  Todas as formas
                </Text>
              </TouchableOpacity>
              {PAYMENT_OPTIONS.map(payment => (
                <TouchableOpacity
                  key={payment.id}
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    onFiltersChange({ paymentMethod: payment.id });
                    setShowPaymentModal(false);
                  }}
                >
                  <FontAwesome5 name={payment.icon} size={16} color={colors.text} />
                  <Text style={[styles.modalItemText, { color: colors.text }]}>
                    {payment.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={filters.startDate ? new Date(filters.startDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={filters.endDate ? new Date(filters.endDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  periodScroll: {
    marginBottom: 12,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  periodButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  customDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  dateButtonText: {
    fontSize: 13,
  },
  dateSeparator: {
    marginHorizontal: 8,
    fontSize: 13,
  },
  secondaryFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalItemText: {
    fontSize: 15,
  },
});
