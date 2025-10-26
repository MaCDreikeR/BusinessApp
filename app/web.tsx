import React from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { PWAInstallBanner } from '../components/PWAInstallBanner';

export default function WebLandingPage() {
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>BusinessApp</Text>
        <Text style={styles.subtitle}>
          Gestão completa do seu negócio
        </Text>
        <Text style={styles.description}>
          Sistema integrado para controle de vendas, estoque, agenda, 
          clientes e muito mais. Acesse de qualquer dispositivo.
        </Text>
      </View>

      <View style={styles.features}>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>📊</Text>
          <Text style={styles.featureTitle}>Dashboard Completo</Text>
          <Text style={styles.featureDesc}>Visão geral do seu negócio</Text>
        </View>

        <View style={styles.feature}>
          <Text style={styles.featureIcon}>📅</Text>
          <Text style={styles.featureTitle}>Agenda Online</Text>
          <Text style={styles.featureDesc}>Agendamentos automatizados</Text>
        </View>

        <View style={styles.feature}>
          <Text style={styles.featureIcon}>💰</Text>
          <Text style={styles.featureTitle}>Controle Financeiro</Text>
          <Text style={styles.featureDesc}>Vendas, despesas e comissões</Text>
        </View>

        <View style={styles.feature}>
          <Text style={styles.featureIcon}>👥</Text>
          <Text style={styles.featureTitle}>Gestão de Clientes</Text>
          <Text style={styles.featureDesc}>CRM integrado e completo</Text>
        </View>
      </View>

      <PWAInstallBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 24,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 600,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 30,
    maxWidth: 1000,
    alignSelf: 'center',
  },
  feature: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    width: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featureIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});