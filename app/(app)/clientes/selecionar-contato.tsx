import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Linking
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { logger } from '../../../utils/logger';
import { useTheme } from '../../../contexts/ThemeContext';

// Definindo uma interface para o objeto de contato para melhor tipagem
interface Contato {
  id: string;
  name: string;
  phoneNumbers?: Contacts.PhoneNumber[];
}

export default function SelecionarContatoScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [contatos, setContatos] = useState<Contato[]>([]);
  const [contatosFiltrados, setContatosFiltrados] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [permissaoConcedida, setPermissaoConcedida] = useState(true); // Novo estado
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Selecionar Contato',
    });
    carregarContatos();
  }, [navigation]);

  const carregarContatos = async () => {
    setLoading(true);
    const { status } = await Contacts.requestPermissionsAsync();

    if (status === 'granted') {
      setPermissaoConcedida(true);
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });

      if (data.length > 0) {
        const contatosComTelefone = data.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0);
        const contatosOrdenados = contatosComTelefone.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setContatos(contatosOrdenados);
        setContatosFiltrados(contatosOrdenados);
      }
    } else {
      // Se a permissão for negada, atualizamos o estado
      setPermissaoConcedida(false);
      Alert.alert(
        "Permissão Necessária",
        "O acesso aos contatos foi negado. Para usar esta funcionalidade, por favor, habilite a permissão nas configurações do seu dispositivo."
      );
    }
    setLoading(false);
  };

  const handleBusca = (texto: string) => {
    setTermoBusca(texto);
    if (texto) {
      const contatosFiltrados = contatos.filter(contato =>
        contato.name.toLowerCase().includes(texto.toLowerCase())
      );
      setContatosFiltrados(contatosFiltrados);
    } else {
      setContatosFiltrados(contatos);
    }
  };
  
  const handleSelecionarContato = (contato: Contato) => {
    // Lógica para quando um contato é selecionado
    // Por exemplo, voltar para a tela anterior e passar os dados
    logger.debug('Contato Selecionado:', contato);
    navigation.goBack(); 
  };

  const renderItem = ({ item }: { item: Contato }) => (
    <TouchableOpacity style={styles.itemContainer} onPress={() => handleSelecionarContato(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name ? item.name[0].toUpperCase() : '?'}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.nome}>{item.name}</Text>
        <Text style={styles.telefone}>{item.phoneNumbers ? item.phoneNumbers[0].number : 'Sem número'}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Se a permissão foi negada, exibe a tela de aviso
  if (!permissaoConcedida) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="people-circle-outline" size={80} color="#D1D5DB" />
        <Text style={styles.permissaoTitulo}>Acesso aos Contatos Necessário</Text>
        <Text style={styles.permissaoTexto}>
          Para adicionar clientes a partir da sua agenda, precisamos da sua permissão para acessar seus contatos.
        </Text>
        <TouchableOpacity style={styles.botaoPermissao} onPress={() => Linking.openSettings()}>
          <Text style={styles.botaoPermissaoTexto}>Abrir Configurações</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar contato..."
          value={termoBusca}
          onChangeText={handleBusca}
          placeholderTextColor={colors.textTertiary}
        />
      </View>
      <FlatList
        data={contatosFiltrados}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={
            <View style={styles.centeredContainer}>
                <Text style={styles.emptyText}>Nenhum contato encontrado.</Text>
            </View>
        }
      />
    </View>
  );
}

// Função auxiliar para criar estilos dinâmicos
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    color: colors.primaryDark,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
  },
  nome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  telefone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  permissaoTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  permissaoTexto: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  botaoPermissao: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  botaoPermissaoTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});