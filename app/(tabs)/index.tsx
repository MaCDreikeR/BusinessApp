import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import DashboardCard from '../components/DashboardCard';

export default function DashboardScreen() {
  const dashboardItems = [
    {
      title: 'Visão Geral',
      description: 'Painel principal do sistema',
      route: '/',
    },
    {
      title: 'Agenda',
      description: 'Visualize sua agenda diária',
      route: '/agenda',
    },
    {
      title: 'Agendamentos Online',
      description: 'Gerencie agendamentos feitos online',
      route: '/agendamentos-online',
    },
    {
      title: 'Vendas',
      description: 'Acompanhe suas vendas e faturamento',
      route: '/vendas',
    },
    {
      title: 'Comandas',
      description: 'Controle suas comandas',
      route: '/comandas',
    },
    {
      title: 'Orçamentos',
      description: 'Crie e gerencie orçamentos',
      route: '/orcamentos',
    },
    {
      title: 'Estoque',
      description: 'Gerencie seu estoque',
      route: '/estoque',
    },
    {
      title: 'Metas',
      description: 'Acompanhe suas metas e objetivos',
      route: '/metas',
    },
    {
      title: 'Despesas',
      description: 'Controle suas despesas',
      route: '/despesas',
    },
    {
      title: 'Relatórios',
      description: 'Visualize relatórios e análises',
      route: '/relatorios',
    },
    {
      title: 'Usuários',
      description: 'Gerenciar usuários',
      route: '/usuarios',
    },
    {
      title: 'Pacotes',
      description: 'Gerencie pacotes de serviços',
      route: '/pacotes',
    },
    {
      title: 'Fornecedores',
      description: 'Controle seus fornecedores',
      route: '/fornecedores',
    },
    {
      title: 'Clientes',
      description: 'Gerencie sua base de clientes',
      route: '/clientes',
    },
    {
      title: 'Aniversariantes',
      description: 'Veja os aniversariantes do mês',
      route: '/aniversariantes',
    },
    {
      title: 'Notificações',
      description: 'Central de notificações',
      route: '/notificacoes',
    },
    {
      title: 'Automação',
      description: 'Configure automações do sistema',
      route: '/automacao',
    },
    {
      title: 'Configurações',
      description: 'Ajuste as configurações do sistema',
      route: '/configuracoes',
    },
    {
      title: 'Suporte',
      description: 'Acesse o suporte técnico',
      route: '/suporte',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.cardsContainer}>
          {dashboardItems.map((item, index) => (
            <DashboardCard
              key={index}
              title={item.title}
              description={item.description}
              route={item.route}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  cardsContainer: {
    flex: 1,
  },
});
