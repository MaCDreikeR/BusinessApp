/**
 * 💳 COMPONENTE - CARD DE DESPESA
 * 
 * Item visual da lista de despesas com:
 * - Swipe actions (editar/excluir)
 * - Informações essenciais (categoria, valor, data, pagamento)
 * - Feedback tátil
 * - Design limpo e hierárquico
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Expense, ExpenseCategory, PaymentMethod } from '../types/Expense';
import { useTheme } from '../contexts/ThemeContext';

interface ExpenseCardProps {
  expense: Expense;
  category?: ExpenseCategory;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const PAYMENT_ICONS: Record<PaymentMethod, string> = {
  pix: 'qrcode',
  credit: 'credit-card',
  debit: 'credit-card',
  cash: 'money-bill-wave',
  bank_transfer: 'exchange-alt',
};

export function ExpenseCard({
  expense,
  category,
  onPress,
  onEdit,
  onDelete,
}: ExpenseCardProps) {
  const { colors } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);

  const handleDelete = () => {
    swipeableRef.current?.close();
    
    Alert.alert(
      'Excluir Despesa',
      'Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  };

  const handleEdit = () => {
    swipeableRef.current?.close();
    onEdit();
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-120, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={handleEdit}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <FontAwesome5 name="edit" size={20} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <FontAwesome5 name="trash" size={20} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  const formatDate = (dateString: string): string => {
    // Criar data sem problemas de timezone
    const [year, month, day] = dateString.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      });
    }
  };

  const formatCurrency = (cents: number): string => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      friction={2}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.surface || '#fff' }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Ícone da Categoria */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: category?.color || colors.primary },
          ]}
        >
          <FontAwesome5
            name={category?.icon || 'question'}
            size={20}
            color="#fff"
          />
        </View>

        {/* Informações Principais */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.category, { color: colors.text }]} numberOfLines={1}>
              {category?.name || 'Sem categoria'}
            </Text>
            <FontAwesome5
              name={PAYMENT_ICONS[expense.payment_method]}
              size={14}
              color={colors.text}
              style={styles.paymentIcon}
            />
          </View>

          {expense.description && (
            <Text
              style={[styles.description, { color: colors.text }]}
              numberOfLines={1}
            >
              {expense.description}
            </Text>
          )}

          <Text style={[styles.date, { color: colors.text }]}>
            {formatDate(expense.date)}
          </Text>
        </View>

        {/* Valor */}
        <View style={styles.amountContainer}>
          <Text style={[styles.amount, { color: '#FF4444' }]}>
            {formatCurrency(expense.amount)}
          </Text>
          {expense.recurring && (
            <View style={styles.recurringBadge}>
              <FontAwesome5 name="redo" size={10} color={colors.primary} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  category: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  paymentIcon: {
    marginLeft: 8,
    opacity: 0.6,
  },
  description: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    opacity: 0.5,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  recurringBadge: {
    marginTop: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#4A90E2',
  },
  deleteButton: {
    backgroundColor: '#FF4444',
  },
});
