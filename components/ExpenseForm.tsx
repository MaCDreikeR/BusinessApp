/**
 * 📝 COMPONENTE - FORMULÁRIO DE DESPESA
 * 
 * Modal de criação/edição de despesa:
 * - Validação em tempo real
 * - Máscara de moeda
 * - Seleção intuitiva de categoria e pagamento
 * - Suporte a despesas recorrentes
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Expense,
  ExpenseCategory,
  CreateExpenseInput,
  PaymentMethod,
} from '../types/Expense';
import { useTheme } from '../contexts/ThemeContext';

interface ExpenseFormProps {
  visible: boolean;
  expense?: Expense | null; // Para edição
  categories: ExpenseCategory[];
  onClose: () => void;
  onSave: (data: CreateExpenseInput) => Promise<void>;
}

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'pix', label: 'PIX', icon: 'qrcode' },
  { id: 'credit', label: 'Crédito', icon: 'credit-card' },
  { id: 'debit', label: 'Débito', icon: 'credit-card' },
  { id: 'cash', label: 'Dinheiro', icon: 'money-bill-wave' },
  { id: 'bank_transfer', label: 'Transferência', icon: 'exchange-alt' },
];

export function ExpenseForm({
  visible,
  expense,
  categories,
  onClose,
  onSave,
}: ExpenseFormProps) {
  const { colors } = useTheme();
  
  // Estados do formulário
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [recurring, setRecurring] = useState(false);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Preencher formulário ao editar
  useEffect(() => {
    if (expense) {
      setAmount((expense.amount / 100).toFixed(2).replace('.', ','));
      setCategoryId(expense.category_id);
      setDescription(expense.description || '');
      // Criar data sem problemas de timezone
      const [year, month, day] = expense.date.split('-');
      setDate(new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
      setPaymentMethod(expense.payment_method);
      setRecurring(expense.recurring || false);
    } else {
      resetForm();
    }
  }, [expense, visible]);

  const resetForm = () => {
    setAmount('');
    setCategoryId('');
    setDescription('');
    setDate(new Date());
    setPaymentMethod('pix');
    setRecurring(false);
    setErrors({});
  };

  const handleAmountChange = (text: string) => {
    // Remove tudo exceto números e vírgula
    const cleaned = text.replace(/[^\d,]/g, '');
    
    // Garante apenas uma vírgula
    const parts = cleaned.split(',');
    if (parts.length > 2) return;
    
    // Limita casas decimais
    if (parts[1] && parts[1].length > 2) return;
    
    setAmount(cleaned);
    
    // Limpa erro ao digitar
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: '' }));
    }
  };

  const formatAmountDisplay = () => {
    if (!amount) return 'R$ 0,00';
    
    const numericValue = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericValue)) return 'R$ 0,00';
    
    return numericValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Validar valor
    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      newErrors.amount = 'Informe um valor válido';
    }

    // Validar categoria
    if (!categoryId) {
      newErrors.categoryId = 'Selecione uma categoria';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // Converter valor para centavos
      const amountInCents = Math.round(
        parseFloat(amount.replace(',', '.')) * 100
      );

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      const data: CreateExpenseInput = {
        amount: amountInCents,
        category_id: categoryId,
        description: description.trim() || undefined,
        date: dateString,
        payment_method: paymentMethod,
        ...(recurring && { recurring: true, recurring_frequency: 'monthly' }),
      };

      await onSave(data);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      alert('Não foi possível salvar a despesa. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedPayment = PAYMENT_OPTIONS.find(p => p.id === paymentMethod);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: colors.text }]}>
              Cancelar
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {expense ? 'Editar Despesa' : 'Nova Despesa'}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.headerButton}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.headerButtonText, { color: colors.primary }]}>
                Salvar
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Valor */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              Valor <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.amountInputContainer}>
              <Text style={[styles.amountDisplay, { color: colors.text }]}>
                {formatAmountDisplay()}
              </Text>
              <TextInput
                style={[
                  styles.amountInput,
                  {
                    color: colors.text,
                    borderColor: errors.amount ? '#FF4444' : colors.border,
                  },
                ]}
                value={amount}
                onChangeText={handleAmountChange}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor={colors.text + '50'}
              />
            </View>
            {errors.amount && (
              <Text style={styles.errorText}>{errors.amount}</Text>
            )}
          </View>

          {/* Categoria */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              Categoria <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                {
                  borderColor: errors.categoryId ? '#FF4444' : colors.border,
                  backgroundColor: colors.card,
                },
              ]}
              onPress={() => setShowCategoryModal(true)}
            >
              {selectedCategory ? (
                <View style={styles.selectContent}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: selectedCategory.color },
                    ]}
                  >
                    <FontAwesome5
                      name={selectedCategory.icon}
                      size={16}
                      color="#fff"
                    />
                  </View>
                  <Text style={[styles.selectText, { color: colors.text }]}>
                    {selectedCategory.name}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.selectPlaceholder, { color: colors.text }]}>
                  Selecione uma categoria
                </Text>
              )}
              <FontAwesome5 name="chevron-right" size={14} color={colors.text} />
            </TouchableOpacity>
            {errors.categoryId && (
              <Text style={styles.errorText}>{errors.categoryId}</Text>
            )}
          </View>

          {/* Descrição */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              Descrição (opcional)
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.card },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Conta de luz do mês de janeiro"
              placeholderTextColor={colors.text + '50'}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          {/* Data */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Data</Text>
            <TouchableOpacity
              style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.selectContent}>
                <FontAwesome5 name="calendar" size={16} color={colors.text} />
                <Text style={[styles.selectText, { color: colors.text }]}>
                  {date.toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Forma de Pagamento */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              Forma de Pagamento
            </Text>
            <TouchableOpacity
              style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setShowPaymentModal(true)}
            >
              <View style={styles.selectContent}>
                <FontAwesome5
                  name={selectedPayment?.icon || 'credit-card'}
                  size={16}
                  color={colors.text}
                />
                <Text style={[styles.selectText, { color: colors.text }]}>
                  {selectedPayment?.label}
                </Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Despesa Recorrente */}
          <View style={[styles.section, styles.switchSection]}>
            <View style={styles.switchContent}>
              <FontAwesome5 name="redo" size={18} color={colors.text} />
              <View style={styles.switchTextContainer}>
                <Text style={[styles.label, { marginBottom: 2 }]}>
                  Despesa Recorrente
                </Text>
                <Text style={[styles.switchDescription, { color: colors.text }]}>
                  Registra automaticamente todos os meses
                </Text>
              </View>
            </View>
            <Switch
              value={recurring}
              onValueChange={setRecurring}
              trackColor={{ false: colors.border, true: colors.primary + '50' }}
              thumbColor={recurring ? colors.primary : '#f4f3f4'}
            />
          </View>
        </ScrollView>

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
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalContent}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Selecionar Categoria
                </Text>
              <ScrollView style={styles.modalList}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.modalItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setCategoryId(cat.id);
                      setShowCategoryModal(false);
                      if (errors.categoryId) {
                        setErrors(prev => ({ ...prev, categoryId: '' }));
                      }
                    }}
                  >
                    <View
                      style={[styles.categoryIcon, { backgroundColor: cat.color }]}
                    >
                      <FontAwesome5 name={cat.icon} size={16} color="#fff" />
                    </View>
                    <Text style={[styles.modalItemText, { color: colors.text }]}>
                      {cat.name}
                    </Text>
                    {categoryId === cat.id && (
                      <FontAwesome5 name="check" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Modal de Pagamento */}
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
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalContent}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Forma de Pagamento
                </Text>
              <ScrollView style={styles.modalList}>
                {PAYMENT_OPTIONS.map(payment => (
                  <TouchableOpacity
                    key={payment.id}
                    style={[styles.modalItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setPaymentMethod(payment.id);
                      setShowPaymentModal(false);
                    }}
                  >
                    <FontAwesome5 name={payment.icon} size={16} color={colors.text} />
                    <Text style={[styles.modalItemText, { color: colors.text }]}>
                      {payment.label}
                    </Text>
                    {paymentMethod === payment.id && (
                      <FontAwesome5 name="check" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
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
                setDate(normalized);
              }
            }}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    minWidth: 70,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#FF4444',
  },
  amountInputContainer: {
    alignItems: 'center',
  },
  amountDisplay: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  amountInput: {
    width: '100%',
    fontSize: 18,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    textAlign: 'center',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  selectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectText: {
    fontSize: 15,
  },
  selectPlaceholder: {
    fontSize: 15,
    opacity: 0.5,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 15,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    textAlignVertical: 'top',
  },
  switchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchDescription: {
    fontSize: 12,
    opacity: 0.6,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxHeight: '70%',
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
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
    flex: 1,
    fontSize: 15,
  },
});
