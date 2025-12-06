import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Image, DeviceEventEmitter } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { FontAwesome5, MaterialIcons, Feather } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { logger } from '../../../utils/logger';
import { 
  formatarTelefoneInput, 
  formatarDataInput,
  formatarMoedaInput,
  validarTelefone,
  validarDataFormatada
} from '../../../utils/validators';

export default function NovoClienteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { estabelecimentoId, user } = useAuth();
  const [activeTab, setActiveTab] = useState('dados');
  const [nome, setNome] = useState(params.nome as string || '');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);
  
  // Novos estados para as outras abas
  const [saldoInicial, setSaldoInicial] = useState('');
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [horaAgendamento, setHoraAgendamento] = useState('');
  const [servicoAgendado, setServicoAgendado] = useState('');

  // Estados para as novas abas
  const [pacotes, setPacotes] = useState<Array<{ nome: string; valor: string }>>([]);
  const [comandas, setComandas] = useState<Array<{ data: string; valor: string }>>([]);
  const [galeria, setGaleria] = useState<Array<string>>([]);

  useEffect(() => {
    // Se recebeu o nome do cliente como parâmetro, preenche o campo
    if (params.nome) {
      setNome(params.nome as string);
    }
  }, [params]);

  const selecionarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para selecionar uma foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setFoto(result.assets[0].base64);
      }
    } catch (error) {
      logger.error('Erro ao selecionar foto:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a foto.');
    }
  };

  const validarSaldo = (valor: string) => {
    if (!valor) return true; // Saldo não é obrigatório
    const numeroLimpo = valor.replace(/\D/g, '');
    const numero = parseInt(numeroLimpo);
    return !isNaN(numero) && numero >= 0;
  };

  const validarData = (data: string) => {
    if (!data) return true;
    return validarDataFormatada(data);
  };

  const validarHora = (hora: string) => {
    if (!hora) return true;
    const [horas, minutos] = hora.split(':');
    if (!horas || !minutos) return false;
    const h = parseInt(horas);
    const m = parseInt(minutos);
    return h >= 0 && h < 24 && m >= 0 && m < 60;
  };

  const handleSaldoChange = (valor: string) => {
    const saldoFormatado = formatarMoedaInput(valor);
    setSaldoInicial(saldoFormatado);
  };

  const handleDataChange = (valor: string) => {
    const dataFormatada = formatarDataInput(valor);
    setDataAgendamento(dataFormatada);
  };

  const handleHoraChange = (valor: string) => {
    let horaFormatada = valor.replace(/\D/g, '');
    if (horaFormatada.length > 4) {
      horaFormatada = horaFormatada.substr(0, 4);
    }
    if (horaFormatada.length >= 2) {
      horaFormatada = horaFormatada.replace(/(\d{2})(\d{0,2})/, '$1:$2');
    }
    setHoraAgendamento(horaFormatada);
  };

  const salvarCliente = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'O nome do cliente é obrigatório.');
      return;
    }

    if (!validarTelefone(telefone)) {
      Alert.alert('Atenção', 'Digite um número de telefone válido com DDD.');
      return;
    }

    if (dataNascimento && !validarDataFormatada(dataNascimento)) {
      Alert.alert('Atenção', 'Digite uma data de nascimento válida.');
      return;
    }

    if (saldoInicial && !validarSaldo(saldoInicial)) {
      Alert.alert('Atenção', 'Digite um valor válido para o saldo inicial.');
      return;
    }

    // Validar data e hora do agendamento
    if ((dataAgendamento || horaAgendamento || servicoAgendado) &&
        (!dataAgendamento || !horaAgendamento || !servicoAgendado)) {
      Alert.alert('Atenção', 'Para criar um agendamento, preencha todos os campos (data, hora e serviço).');
      return;
    }

    if (dataAgendamento && !validarData(dataAgendamento)) {
      Alert.alert('Atenção', 'Digite uma data válida para o agendamento.');
      return;
    }

    if (horaAgendamento && !validarHora(horaAgendamento)) {
      Alert.alert('Atenção', 'Digite uma hora válida para o agendamento.');
      return;
    }

    try {
      setSalvando(true);
      
      if (!user || !estabelecimentoId) {
        Alert.alert('Erro', 'Usuário ou estabelecimento não identificado');
        return;
      }

      let foto_url = null;
      if (foto) {
        const fotoNome = `${user.id}/${Date.now()}.jpg`;
        const { error: uploadError, data } = await supabase.storage
          .from('fotos-clientes')
          .upload(fotoNome, decode(foto), {
            contentType: 'image/jpeg',
            cacheControl: '3600',
          });

        if (uploadError) {
          logger.error('Erro ao fazer upload da foto:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('fotos-clientes')
            .getPublicUrl(fotoNome);
          foto_url = publicUrl;
        }
      }

      // Criar o cliente
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .insert({
          nome: nome.trim(),
          telefone: telefone.trim(),
          email: email.trim() || null,
          data_nascimento: dataNascimento ? new Date(dataNascimento.split('/').reverse().join('-')).toISOString().split('T')[0] : null,
          observacoes: observacoes.trim() || null,
          foto_url,
          estabelecimento_id: estabelecimentoId,
        })
        .select()
        .single();

      if (clienteError) {
        logger.error('Erro ao criar cliente:', clienteError);
        Alert.alert('Erro', 'Não foi possível criar o cliente. Por favor, tente novamente.');
        return;
      }

      // Se houver saldo inicial, criar registro de saldo
      if (saldoInicial && parseFloat(saldoInicial) > 0) {
        const { error: saldoError } = await supabase
          .from('saldos')
          .insert({
            cliente_id: clienteData.id,
            valor: parseFloat(saldoInicial),
            tipo: 'credito',
            descricao: 'Saldo inicial',
            estabelecimento_id: estabelecimentoId,
          });

        if (saldoError) {
          logger.error('Erro ao criar saldo:', saldoError);
          // Não impede a criação do cliente, apenas mostra um alerta
          Alert.alert('Atenção', 'Cliente criado, mas houve um erro ao registrar o saldo inicial.');
          router.back();
          return;
        }
      }

      // Se houver agendamento, criar registro de agendamento
      if (dataAgendamento && horaAgendamento && servicoAgendado) {
        const [dia, mes, ano] = dataAgendamento.split('/');
        const dataHora = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        const [hora, minuto] = horaAgendamento.split(':');
        dataHora.setHours(parseInt(hora), parseInt(minuto));
        
        const { error: agendamentoError } = await supabase
          .from('agendamentos')
          .insert({
            cliente_id: clienteData.id,
            data_hora: dataHora.toISOString(),
            servico: servicoAgendado.trim(),
            status: 'agendado',
            estabelecimento_id: estabelecimentoId,
          });

        if (agendamentoError) {
          logger.error('Erro ao criar agendamento:', agendamentoError);
          // Não impede a criação do cliente, apenas mostra um alerta
          Alert.alert('Atenção', 'Cliente criado, mas houve um erro ao registrar o agendamento.');
          router.back();
          return;
        }
      }

      // Verificar se precisa emitir evento de cliente cadastrado
      const returnTo = params.returnTo as string;
      if (returnTo === 'comandas') {
        DeviceEventEmitter.emit('clienteCadastrado', {
          clienteId: clienteData.id,
          clienteNome: clienteData.nome,
          returnTo: 'comandas'
        });
      }

      Alert.alert(
        'Sucesso',
        'Cliente criado com sucesso!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      logger.error('Erro ao criar cliente:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao criar o cliente. Por favor, tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dados':
        return (
          <>
            <TouchableOpacity 
              style={styles.fotoContainer}
              onPress={selecionarFoto}
            >
              {foto ? (
                <Image 
                  source={{ uri: `data:image/jpeg;base64,${foto}` }}
                  style={styles.fotoPerfil}
                />
              ) : (
                <View style={styles.fotoPlaceholder}>
                  <FontAwesome5 name="camera" size={24} color="#9CA3AF" />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome</Text>
              <View style={styles.inputContainer}>
                <FontAwesome5 name="user" size={16} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={nome}
                  onChangeText={setNome}
                  placeholder="Digite o nome do cliente"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefone</Text>
              <View style={styles.inputContainer}>
                <FontAwesome5 name="phone" size={16} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={telefone}
                  onChangeText={(valor) => setTelefone(formatarTelefoneInput(valor))}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={15}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-mail</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="mail-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Digite o e-mail"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Data de Nascimento</Text>
              <View style={styles.inputContainer}>
                <FontAwesome5 name="calendar" size={16} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={dataNascimento}
                  onChangeText={(valor) => setDataNascimento(formatarDataInput(valor))}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Observação</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={observacoes}
                onChangeText={setObservacoes}
                placeholder="Digite observações sobre o cliente"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
              />
            </View>
          </>
        );

      case 'saldo':
        return (
          <View style={styles.tabContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Saldo Inicial</Text>
              <View style={styles.inputContainer}>
                <FontAwesome5 name="dollar-sign" size={16} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={saldoInicial}
                  onChangeText={(valor) => setSaldoInicial(formatarMoedaInput(valor))}
                  placeholder="R$ 0,00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>
            </View>
            <Text style={styles.infoText}>
              O saldo na casa representa o valor que o cliente tem disponível para usar em serviços futuros.
            </Text>
          </View>
        );

      case 'agendamentos':
        return (
          <View style={styles.tabContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Data do Agendamento</Text>
              <View style={styles.inputContainer}>
                <FontAwesome5 name="calendar-alt" size={16} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={dataAgendamento}
                  onChangeText={handleDataChange}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hora</Text>
              <View style={styles.inputContainer}>
                <FontAwesome5 name="clock" size={16} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={horaAgendamento}
                  onChangeText={handleHoraChange}
                  placeholder="HH:MM"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Serviço</Text>
              <View style={styles.inputContainer}>
                <FontAwesome5 name="cut" size={16} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={servicoAgendado}
                  onChangeText={setServicoAgendado}
                  placeholder="Digite o serviço agendado"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>
        );

      case 'historico':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyState}>
              <FontAwesome5 name="history" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>
                O histórico estará disponível após criar o cliente
              </Text>
            </View>
          </View>
        );

      case 'pacotes':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyState}>
              <FontAwesome5 name="box" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>
                Os pacotes estarão disponíveis após criar o cliente
              </Text>
            </View>
          </View>
        );

      case 'comandas':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyState}>
              <FontAwesome5 name="receipt" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>
                As comandas estarão disponíveis após criar o cliente
              </Text>
            </View>
          </View>
        );

      case 'fotos':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyState}>
              <FontAwesome5 name="images" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>
                A galeria de fotos estará disponível após criar o cliente
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const tabs = [
    { id: 'dados', icon: 'pen', label: 'Dados' },
    { id: 'saldo', icon: 'sync-alt', label: 'Saldo na casa' },
    { id: 'agendamentos', icon: 'calendar-alt', label: 'Agendamentos' },
    { id: 'historico', icon: 'history', label: 'Histórico' },
    { id: 'pacotes', icon: 'box', label: 'Pacotes' },
    { id: 'comandas', icon: 'receipt', label: 'Comandas' },
    { id: 'fotos', icon: 'images', label: 'Fotos' },
  ];

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.headerButton, styles.headerButtonImport]}
            onPress={() => router.back()}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#7C3AED" />
          </TouchableOpacity>
          <Text style={styles.title}>Novo Cliente</Text>
          <View style={[styles.headerButton, { opacity: 0 }]} />
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
                  name={tab.icon}
                  size={16}
                  color={activeTab === tab.id ? "#7C3AED" : "#666"}
                />
                <Text 
                  style={[
                    styles.tabText, 
                    activeTab === tab.id && styles.tabTextActive,
                    { marginTop: 4 }
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <ScrollView style={styles.form}>
          {renderContent()}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.footerButton}
            onPress={() => router.back()}
          >
            <Text style={styles.footerButtonText}>Voltar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.footerButton, styles.footerButtonSalvar]}
            onPress={salvarCliente}
            disabled={salvando}
          >
            <Text style={[styles.footerButtonText, styles.footerButtonTextSalvar]}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
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
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  headerButtonImport: {
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7C3AED',
    flex: 1,
    textAlign: 'center',
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    minWidth: 80,
    backgroundColor: '#F9FAFB',
    height: 56,
  },
  tabActive: {
    backgroundColor: '#EDE9FE',
    borderBottomWidth: 2,
    borderBottomColor: '#7C3AED',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  tabTextActive: {
    color: '#7C3AED',
    fontWeight: '500',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  fotoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  fotoPerfil: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  fotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIcon: {
    padding: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
    borderRadius: 8,
  },
  footerButtonSalvar: {
    backgroundColor: '#E8FFF3',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  footerButtonTextSalvar: {
    color: '#10B981',
  },
  tabContent: {
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
}); 