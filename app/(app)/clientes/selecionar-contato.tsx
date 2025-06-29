import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '@lib/supabase';
import Checkbox from 'expo-checkbox';

type Contato = {
  nome: string;
  telefone: string;
};

export default function SelecionarContatoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const contatosOriginais: Contato[] = JSON.parse(params.contatos as string);
  const [contatos, setContatos] = useState<Contato[]>(contatosOriginais);
  const [selecionando, setSelecionando] = useState(false);
  const [contatoSelecionado, setContatoSelecionado] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [selecionarTodos, setSelecionarTodos] = useState(false);
  const [contatosSelecionados, setContatosSelecionados] = useState<Set<string>>(new Set());

  const formatarTelefone = (telefone: string) => {
    // Remove todos os caracteres não numéricos
    const numeroLimpo = telefone.replace(/\D/g, '');
    
    // Se começar com +55, remove
    const numeroBR = numeroLimpo.replace(/^55/, '');
    
    // Garante que tenha pelo menos 10 dígitos (DDD + número)
    if (numeroBR.length < 10) return null;
    
    // Retorna apenas os últimos 11 dígitos (ou 10 se não tiver o 9 na frente)
    return numeroBR.slice(-11);
  };

  const filtrarContatos = useCallback((textoBusca: string) => {
    if (!textoBusca) {
      setContatos(contatosOriginais);
      return;
    }
    
    const textoBuscaLower = textoBusca.toLowerCase();
    const contatosFiltrados = contatosOriginais.filter(contato => 
      contato.nome.toLowerCase().includes(textoBuscaLower) ||
      contato.telefone.includes(textoBuscaLower)
    );
    setContatos(contatosFiltrados);
  }, [contatosOriginais]);

  const toggleSelecionarTodos = useCallback(() => {
    setSelecionarTodos(prev => {
      const novoEstado = !prev;
      if (novoEstado) {
        setContatosSelecionados(new Set(contatos.map(c => c.nome)));
      } else {
        setContatosSelecionados(new Set());
      }
      return novoEstado;
    });
  }, [contatos]);

  const toggleSelecionarContato = useCallback((nome: string) => {
    setContatosSelecionados(prev => {
      const novoSet = new Set(prev);
      if (novoSet.has(nome)) {
        novoSet.delete(nome);
        setSelecionarTodos(false);
      } else {
        novoSet.add(nome);
        if (novoSet.size === contatos.length) {
          setSelecionarTodos(true);
        }
      }
      return novoSet;
    });
  }, [contatos.length]);

  const importarContatosSelecionados = async () => {
    if (contatosSelecionados.size === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos um contato para importar.');
      return;
    }

    try {
      setSelecionando(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erro', 'Usuário não autenticado. Por favor, faça login novamente.');
        return;
      }

      const contatosParaImportar = contatos.filter(c => contatosSelecionados.has(c.nome));
      console.log('Contatos selecionados para importar:', contatosParaImportar);
      
      let importadosComSucesso = 0;
      let erros = 0;
      let jaExistentes = 0;

      for (const contato of contatosParaImportar) {
        const telefoneFormatado = formatarTelefone(contato.telefone);
        if (!telefoneFormatado) {
          console.error('Telefone inválido:', contato.telefone);
          erros++;
          continue;
        }

        // Verifica se já existe
        const { data: existentes, error: erroConsulta } = await supabase
          .from('clientes')
          .select('id, telefone')
          .eq('telefone', telefoneFormatado)
          .eq('user_id', user.id);

        if (erroConsulta) {
          console.error('Erro ao verificar contato existente:', erroConsulta);
          erros++;
          continue;
        }

        if (existentes && existentes.length > 0) {
          console.log('Contato já existe:', telefoneFormatado);
          jaExistentes++;
          continue;
        }

        // Importa o contato
        const { data: novoCliente, error: erroInsercao } = await supabase
          .from('clientes')
          .insert({
            nome: contato.nome,
            telefone: telefoneFormatado,
            user_id: user.id,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (erroInsercao) {
          console.error('Erro ao inserir contato:', erroInsercao);
          erros++;
        } else {
          console.log('Contato importado com sucesso:', novoCliente);
          importadosComSucesso++;
        }
      }

      let mensagem = '';
      if (importadosComSucesso > 0) {
        mensagem = `${importadosComSucesso} contato(s) importado(s) com sucesso.\n`;
      }
      if (jaExistentes > 0) {
        mensagem += `${jaExistentes} contato(s) já existente(s).\n`;
      }
      if (erros > 0) {
        mensagem += `${erros} erro(s) durante a importação.`;
      }

      Alert.alert(
        importadosComSucesso > 0 ? 'Importação concluída' : 'Atenção',
        mensagem,
        [{ text: 'OK', onPress: () => {
          if (importadosComSucesso > 0) {
            router.back();
          }
        }}]
      );
    } catch (error) {
      console.error('Erro ao importar contatos:', error);
      Alert.alert('Erro', 'Ocorreu um erro durante a importação. Por favor, tente novamente.');
    } finally {
      setSelecionando(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <FontAwesome5 name="arrow-left" size={20} color="#666" />
        </TouchableOpacity>
        <Text style={styles.title}>Importar Contato</Text>
        <TouchableOpacity 
          style={[styles.headerButton, styles.headerButtonImport]}
          onPress={importarContatosSelecionados}
          disabled={selecionando || contatosSelecionados.size === 0}
        >
          <FontAwesome5 
            name="check" 
            size={20} 
            color={contatosSelecionados.size > 0 ? "#7C3AED" : "#9CA3AF"} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <FontAwesome5 name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar contato..."
            value={busca}
            onChangeText={(texto) => {
              setBusca(texto);
              filtrarContatos(texto);
            }}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <View style={styles.selectAllContainer}>
          <Checkbox
            value={selecionarTodos}
            onValueChange={toggleSelecionarTodos}
            color={selecionarTodos ? '#7C3AED' : undefined}
            style={styles.checkbox}
          />
          <Text style={styles.selectAllText}>Selecionar todos</Text>
        </View>
      </View>

      <FlatList
        data={contatos}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[
              styles.contatoCard,
              contatosSelecionados.has(item.nome) && styles.contatoCardSelecionado
            ]}
            onPress={() => toggleSelecionarContato(item.nome)}
            disabled={selecionando}
          >
            <Checkbox
              value={contatosSelecionados.has(item.nome)}
              onValueChange={() => toggleSelecionarContato(item.nome)}
              color={contatosSelecionados.has(item.nome) ? '#7C3AED' : undefined}
              style={styles.checkbox}
            />
            <View style={styles.contatoIcone}>
              <FontAwesome5 name="user" size={20} color="#9CA3AF" />
            </View>
            <View style={styles.contatoInfo}>
              <Text style={styles.contatoNome}>{item.nome}</Text>
              <Text style={styles.contatoTelefone}>{item.telefone}</Text>
            </View>
            {selecionando && contatoSelecionado === item.nome && (
              <ActivityIndicator color="#7C3AED" style={styles.loadingIndicator} />
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listaContatos}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonImport: {
    backgroundColor: '#EDE9FE',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#111827',
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  checkbox: {
    margin: 8,
    borderRadius: 4,
  },
  listaContatos: {
    padding: 16,
  },
  contatoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  contatoCardSelecionado: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
    borderWidth: 1,
  },
  contatoIcone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contatoInfo: {
    flex: 1,
  },
  contatoNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  contatoTelefone: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingIndicator: {
    marginRight: 8,
  },
}); 