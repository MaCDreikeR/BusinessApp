import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { router, usePathname } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { logger } from '../../../utils/logger';
import { Fornecedor as FornecedorBase } from '@types';

type FornecedorLista = Pick<FornecedorBase, 'id' | 'nome'> & {
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  data_cadastro: string;
};

export default function FornecedoresScreen() {
  const [fornecedores, setFornecedores] = useState<FornecedorLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();

  const { estabelecimentoId } = useAuth();

  useEffect(() => {
    if (estabelecimentoId) {
      carregarFornecedores();
    }
  }, [pathname, estabelecimentoId]);

  const carregarFornecedores = async () => {
    try {
      setLoading(true);
      logger.debug('Iniciando carregamento de fornecedores...');
      if (!estabelecimentoId) {
        Alert.alert('Erro', 'Estabelecimento não identificado.');
        return;
      }
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) {
        logger.error('Erro ao carregar fornecedores:', error);
        throw error;
      }

      logger.debug('Fornecedores carregados com sucesso:', data);
      if (data) {
        setFornecedores(data);
      }
    } catch (error) {
      logger.error('Erro ao carregar fornecedores:', error);
      Alert.alert('Erro', 'Não foi possível carregar os fornecedores');
    } finally {
      setLoading(false);
    }
  };

  const handleNovoFornecedor = () => {
    router.push('/(app)/fornecedores/novo');
  };

  const handleEditarFornecedor = (fornecedor: FornecedorLista) => {
    router.push(`/(app)/fornecedores/${fornecedor.id}`);
  };

  const handleExcluirFornecedor = async (fornecedor: FornecedorLista) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este fornecedor?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('fornecedores')
                .delete()
                .eq('id', fornecedor.id);

              if (error) throw error;
              await carregarFornecedores();
            } catch (error) {
              logger.error('Erro ao excluir fornecedor:', error);
              Alert.alert('Erro', 'Não foi possível excluir o fornecedor');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: FornecedorLista }) => {
    return (
      <TouchableOpacity 
        style={styles.fornecedorCard}
        onPress={() => handleEditarFornecedor(item)}
      >
        <View style={styles.fornecedorHeader}>
          <View style={styles.fornecedorInfo}>
            <Text style={styles.fornecedorNome}>{item.nome}</Text>
            <Text style={styles.fornecedorCNPJ}>CNPJ: {item.cnpj}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => handleExcluirFornecedor(item)}
            style={styles.deleteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.fornecedorContato}>
          <View style={styles.contatoItem}>
            <Ionicons name="call" size={16} color="#6B7280" />
            <Text style={styles.contatoText}>{item.telefone}</Text>
          </View>
          <View style={styles.contatoItem}>
            <Ionicons name="mail" size={16} color="#6B7280" />
            <Text style={styles.contatoText}>{item.email}</Text>
          </View>
        </View>

        <View style={styles.fornecedorEndereco}>
          <Text style={styles.enderecoText}>
            {item.endereco}, {item.cidade} - {item.estado}
          </Text>
          <Text style={styles.enderecoText}>CEP: {item.cep}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const fornecedoresFiltrados = fornecedores.filter(fornecedor =>
    fornecedor.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fornecedor.cnpj.includes(searchQuery) ||
    fornecedor.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar fornecedores..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Carregando fornecedores...</Text>
        </View>
      ) : fornecedoresFiltrados.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>Nenhum fornecedor encontrado</Text>
        </View>
      ) : (
        <FlatList
          data={fornecedoresFiltrados}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  fornecedorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fornecedorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  fornecedorInfo: {
    flex: 1,
  },
  fornecedorNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  fornecedorCNPJ: {
    fontSize: 14,
    color: '#6B7280',
  },
  deleteButton: {
    padding: 8,
  },
  fornecedorContato: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  contatoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contatoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  fornecedorEndereco: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  enderecoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  }
}); 