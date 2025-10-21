import React, { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView, Alert, StyleSheet } from 'react-native';
import { initLocalDatabase, resetLocalDatabase, seedLocalDatabase, getDatabaseConfig } from '../lib/database';
import { dataService } from '../lib/data-service';

export function DatabaseTestComponent() {
  const [dbInfo, setDbInfo] = useState<any>({});
  const [dados, setDados] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const config = getDatabaseConfig();
    setDbInfo(config);
  }, []);

  const handleInitDatabase = async () => {
    try {
      setLoading(true);
      await initLocalDatabase();
      Alert.alert('Sucesso', 'Banco inicializado com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      Alert.alert('Erro', 'Falha ao inicializar banco');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    try {
      setLoading(true);
      await resetLocalDatabase();
      setDados({});
      Alert.alert('Sucesso', 'Banco resetado com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      Alert.alert('Erro', 'Falha ao resetar banco');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDatabase = async () => {
    try {
      setLoading(true);
      await seedLocalDatabase();
      Alert.alert('Sucesso', 'Dados de exemplo inseridos!');
      await loadData();
    } catch (error) {
      console.error('Erro:', error);
      Alert.alert('Erro', 'Falha ao inserir dados');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const usuarios = await dataService.getUsuarios();
      const clientes = await dataService.getClientes('est-1');
      const servicos = await dataService.getServicos('est-1');
      const agendamentos = await dataService.getAgendamentos('est-1');

      setDados({
        usuarios,
        clientes,
        servicos,
        agendamentos
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Falha ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Teste do Banco de Dados</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuração Atual</Text>
        <Text>Tipo: {dbInfo.type}</Text>
        <Text>Ambiente: {process.env.EXPO_PUBLIC_ENVIRONMENT || 'local'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ações do Banco</Text>
        <View style={styles.buttonContainer}>
          <Button 
            title="Inicializar Banco" 
            onPress={handleInitDatabase}
            disabled={loading}
          />
          <Button 
            title="Resetar Banco" 
            onPress={handleResetDatabase}
            disabled={loading}
          />
          <Button 
            title="Inserir Dados Exemplo" 
            onPress={handleSeedDatabase}
            disabled={loading}
          />
          <Button 
            title="Carregar Dados" 
            onPress={loadData}
            disabled={loading}
          />
        </View>
      </View>

      {loading && <Text style={styles.loading}>Processando...</Text>}

      {dados.usuarios && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Carregados</Text>
          <Text>Usuários: {dados.usuarios?.length || 0}</Text>
          <Text>Clientes: {dados.clientes?.length || 0}</Text>
          <Text>Serviços: {dados.servicos?.length || 0}</Text>
          <Text>Agendamentos: {dados.agendamentos?.length || 0}</Text>
        </View>
      )}

      {dados.clientes && dados.clientes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clientes</Text>
          {dados.clientes.map((cliente: any, index: number) => (
            <Text key={index} style={styles.dataItem}>
              {cliente.nome} - {cliente.telefone}
            </Text>
          ))}
        </View>
      )}

      {dados.servicos && dados.servicos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Serviços</Text>
          {dados.servicos.map((servico: any, index: number) => (
            <Text key={index} style={styles.dataItem}>
              {servico.nome} - R$ {(servico.preco / 100).toFixed(2)}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buttonContainer: {
    gap: 10,
  },
  loading: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#666',
  },
  dataItem: {
    paddingVertical: 2,
    fontSize: 14,
  },
});