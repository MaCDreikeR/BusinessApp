import React, { useMemo, useState } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';

export default function RelatoriosScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('vendas');
  const tabs = [
    { id: 'vendas', icon: 'chart-line', label: 'Vendas' },
    { id: 'agendamentos', icon: 'calendar-alt', label: 'Agendamentos' },
    { id: 'clientes', icon: 'users', label: 'Clientes' },
    { id: 'comissoes', icon: 'percentage', label: 'Comissões' },
  ];
  
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    headerText: {
      flex: 1,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primary,
    },
    tabsContainer: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      maxHeight: 72,
    },
    tabsContentContainer: {
      flexGrow: 1,
    },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    tab: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginHorizontal: 4,
      borderRadius: 8,
      minWidth: 92,
      backgroundColor: colors.background,
      height: 56,
    },
    tabActive: {
      backgroundColor: '#EDE9FE',
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: 12,
      color: '#666',
      textAlign: 'center',
      marginTop: 4,
    },
    tabTextActive: {
      color: colors.primary,
      fontWeight: '500',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    placeholder: {
      marginTop: 8,
      color: colors.textSecondary,
    },
  }), [colors]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
          >
            <FontAwesome5 name="bars" size={20} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <ThemedText style={styles.title}>Relatórios</ThemedText>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContentContainer}
      >
        <View style={styles.tabs}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab.id }}
              accessibilityLabel={tab.label}
            >
              <FontAwesome5
                name={tab.icon as any}
                size={16}
                color={activeTab === tab.id ? colors.primary : '#666'}
              />
              <ThemedText
                style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}
                numberOfLines={1}
              >
                {tab.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView style={styles.content}>
        <ThemedText type="subtitle">{tabs.find((t) => t.id === activeTab)?.label}</ThemedText>
        <ThemedText style={styles.placeholder}>Em desenvolvimento</ThemedText>
      </ScrollView>
    </ThemedView>
  );
}