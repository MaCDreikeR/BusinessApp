import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Image, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useRef } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  observacoes: string | null;
  foto_url: string | null;
  estabelecimento_id: string;
  data_nascimento?: string;
};

export default function EditarClienteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { estabelecimentoId, user } = useAuth();
  const [activeTab, setActiveTab] = useState('dados');
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [foto, setFoto] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [dataNascimento, setDataNascimento] = useState('');

  // Estados para as outras abas
  const [saldoAtual, setSaldoAtual] = useState('0,00');
  const [modalCreditoVisible, setModalCreditoVisible] = useState(false);
  const [modalExtratoVisible, setModalExtratoVisible] = useState(false);
  const [extrato, setExtrato] = useState<Array<{ data: string; valor: number; descricao: string; tipo: string }>>([]);
  const [valorCredito, setValorCredito] = useState('');
  const [descricaoCredito, setDescricaoCredito] = useState('');
  const [dataCredito, setDataCredito] = useState<string>('');
  const [salvandoCredito, setSalvandoCredito] = useState(false);
  const [tipoCredito, setTipoCredito] = useState<'credito' | 'debito'>('credito');
  const valorInputRef = useRef<TextInput>(null);
  const [agendamentos, setAgendamentos] = useState<Array<{ data: string; hora: string; servico: string }>>([]);
  const [historico, setHistorico] = useState<Array<{ data: string; descricao: string }>>([]);
  const [pacotes, setPacotes] = useState<Array<{ nome: string; valor: string }>>([]);
  const [comandas, setComandas] = useState<Array<{ data: string; valor: string }>>([]);
  const [galeria, setGaleria] = useState<Array<string>>([]);

  useEffect(() => {
    carregarCliente();
  }, [id]);

  // Calcula saldo sempre que cliente muda ou quando activeTab for 'saldo'
  useEffect(() => {
    const calcularSaldo = async () => {
      if (!cliente?.id) return;
      const { data, error } = await supabase
        .from('crediario_movimentacoes')
        .select('valor')
        .eq('cliente_id', cliente.id);
      if (!error && data) {
        const soma = data.reduce((acc, mov) => acc + (typeof mov.valor === 'number' ? mov.valor : parseFloat(mov.valor)), 0);
        setSaldoAtual(soma.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
      }
    };
    calcularSaldo();
  }, [cliente, activeTab]);

  const carregarCliente = async () => {
    try {
      if (!estabelecimentoId) {
        Alert.alert('Erro', 'Estabelecimento não identificado');
        return;
      }

      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      if (error) {
        console.error('Erro ao carregar cliente:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados do cliente');
        return;
      }

      if (data) {
        setCliente(data);
        setNome(data.nome);
        setTelefone(data.telefone);
        setEmail(data.email || '');
        setObservacoes(data.observacoes || '');
        setFotoUrl(data.foto_url);
        
        if (data.data_nascimento) {
          const [ano, mes, dia] = data.data_nascimento.split('-');
          setDataNascimento(`${dia}/${mes}/${ano}`);
        } else {
          setDataNascimento('');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao carregar os dados do cliente');
    } finally {
      setCarregando(false);
    }
  };

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
      console.error('Erro ao selecionar foto:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a foto.');
    }
  };

  const formatarTelefone = (telefone: string) => {
    const numeroLimpo = telefone.replace(/\D/g, '');
    const numeroBR = numeroLimpo.replace(/^55/, '');
    if (numeroBR.length < 10) return null;
    return numeroBR.slice(-11);
  };

  const formatarData = (texto: string) => {
    // Remove qualquer caractere que não seja número
    const apenasNumeros = texto.replace(/\D/g, '');
    
    // Limita para 8 dígitos
    const limitado = apenasNumeros.slice(0, 8);
    
    // Formata como DD/MM/AAAA
    if (limitado.length <= 2) {
      return limitado;
    } else if (limitado.length <= 4) {
      return `${limitado.slice(0, 2)}/${limitado.slice(2)}`;
    } else {
      return `${limitado.slice(0, 2)}/${limitado.slice(2, 4)}/${limitado.slice(4)}`;
    }
  };

  const excluirCliente = async () => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este cliente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                Alert.alert('Erro', 'Usuário não autenticado');
                return;
              }

              const { error } = await supabase
                .from('clientes')
                .delete()
                .eq('id', id)
                .eq('estabelecimento_id', estabelecimentoId);

              if (error) {
                console.error('Erro ao excluir cliente:', error);
                Alert.alert('Erro', 'Não foi possível excluir o cliente');
                return;
              }

              Alert.alert('Sucesso', 'Cliente excluído com sucesso');
              router.back();
            } catch (error) {
              console.error('Erro ao excluir cliente:', error);
              Alert.alert('Erro', 'Ocorreu um erro ao excluir o cliente');
            }
          }
        }
      ]
    );
  };

  const salvarCliente = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'O nome do cliente é obrigatório.');
      return;
    }

    const telefoneFormatado = formatarTelefone(telefone);
    if (!telefoneFormatado) {
      Alert.alert('Atenção', 'Digite um número de telefone válido.');
      return;
    }

    // Validar data de nascimento se preenchida
    let dataFormatada = null;
    if (dataNascimento.trim()) {
      const [dia, mes, ano] = dataNascimento.split('/');
      
      // Validar se a data é válida
      const dataValida = new Date(Date.UTC(parseInt(ano), parseInt(mes) - 1, parseInt(dia)));
      
      if (isNaN(dataValida.getTime())) {
        Alert.alert('Atenção', 'Data de nascimento inválida.');
        return;
      }
      
      // Formatar para ISO 8601 (YYYY-MM-DD) usando UTC
      dataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }

    try {
      setSalvando(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erro', 'Usuário não autenticado');
        return;
      }

      let nova_foto_url = fotoUrl;
      if (foto) {
        const fotoNome = `${user.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('fotos-clientes')
          .upload(fotoNome, decode(foto), {
            contentType: 'image/jpeg',
            cacheControl: '3600',
          });

        if (uploadError) {
          console.error('Erro ao fazer upload da foto:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('fotos-clientes')
            .getPublicUrl(fotoNome);
          nova_foto_url = publicUrl;
        }
      }

      const { error } = await supabase
        .from('clientes')
        .update({
          nome: nome.trim(),
          telefone: telefoneFormatado,
          email: email.trim() || null,
          observacoes: observacoes.trim() || null,
          foto_url: nova_foto_url,
          data_nascimento: dataFormatada,
        })
        .eq('id', id)
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) {
        console.error('Erro ao atualizar cliente:', error);
        Alert.alert('Erro', 'Não foi possível atualizar o cliente');
        return;
      }

      Alert.alert(
        'Sucesso',
        'Cliente atualizado com sucesso!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao atualizar o cliente');
    } finally {
      setSalvando(false);
    }
  };

  const carregarDadosAdicionais = async () => {
    if (!cliente?.id) return;

    try {
      // Carregar saldo
      const { data: saldoData, error: saldoError } = await supabase
        .from('saldos')
        .select('valor')
        .eq('cliente_id', cliente.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!saldoError && saldoData) {
        setSaldoAtual(saldoData.valor.toFixed(2));
      }

      // Carregar agendamentos
      const { data: agendamentosData } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('cliente_id', cliente.id)
        .order('data_hora', { ascending: true });

      if (agendamentosData) {
        setAgendamentos(agendamentosData.map(a => ({
          data: new Date(a.data_hora).toLocaleDateString(),
          hora: new Date(a.data_hora).toLocaleTimeString().substr(0, 5),
          servico: a.servico
        })));
      }

      // Outros carregamentos podem ser adicionados aqui...

    } catch (error) {
      console.error('Erro ao carregar dados adicionais:', error);
    }
  };

  useEffect(() => {
    if (cliente?.id) {
      carregarDadosAdicionais();
    }
  }, [cliente]);

  const tabs = [
    { id: 'dados', icon: 'pen', label: 'Dados' },
    { id: 'saldo', icon: 'sync-alt', label: 'Saldo na casa' },
    { id: 'agendamentos', icon: 'calendar-alt', label: 'Agendamentos' },
    { id: 'historico', icon: 'history', label: 'Histórico' },
    { id: 'pacotes', icon: 'box', label: 'Pacotes' },
    { id: 'comandas', icon: 'receipt', label: 'Comandas' },
    { id: 'fotos', icon: 'images', label: 'Fotos' },
  ];

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
              ) : fotoUrl ? (
                <Image 
                  source={{ uri: fotoUrl }}
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
                  onChangeText={setTelefone}
                  placeholder="Digite o telefone"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
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
                  onChangeText={(texto) => setDataNascimento(formatarData(texto))}
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
            <TouchableOpacity
              style={styles.saldoCard}
              activeOpacity={0.7}
              onPress={async () => {
                // Busca movimentações do cliente
                if (!cliente?.id) return;
                const { data, error } = await supabase
                  .from('crediario_movimentacoes')
                  .select('data, valor, descricao, tipo')
                  .eq('cliente_id', cliente.id)
                  .order('data', { ascending: false });
                if (!error && data) setExtrato(data);
                setModalExtratoVisible(true);
              }}
            >
              <Text style={styles.saldoLabel}>Saldo Atual</Text>
              <Text
                style={[
                  styles.saldoValor,
                  parseFloat(saldoAtual.replace('.', '').replace(',', '.')) < 0
                    ? { color: '#EF4444' }
                    : { color: '#10B981' }
                ]}
              >
                R$ {saldoAtual}
              </Text>
            </TouchableOpacity>
            <Modal
              visible={modalExtratoVisible}
              animationType="slide"
              transparent
              onRequestClose={() => setModalExtratoVisible(false)}
            >
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '92%', maxHeight: '80%' }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>Extrato do Saldo</Text>
                  <ScrollView style={{ maxHeight: 350 }}>
                    {extrato.length === 0 && (
                      <Text style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 24 }}>Nenhuma movimentação encontrada.</Text>
                    )}
                    {extrato.map((mov, idx) => (
                      <View key={idx} style={{ borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingVertical: 10 }}>
                        <Text style={{ color: '#6B7280', fontSize: 13 }}>
                          {(() => {
                            if (!mov.data) return '';
                            // Tenta extrair só a parte da data (YYYY-MM-DD)
                            const match = mov.data.match(/^(\d{4})-(\d{2})-(\d{2})/);
                            if (match) {
                              return `${match[3]}/${match[2]}/${match[1]}`;
                            }
                            // fallback: mostra como está
                            return mov.data;
                          })()}
                        </Text>
                        <Text style={{ fontWeight: 'bold', color: mov.valor >= 0 ? '#10B981' : '#EF4444', fontSize: 16 }}>
                          {mov.valor >= 0 ? '+' : '-'} R$ {Math.abs(mov.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Text>
                        {mov.descricao ? (
                          <Text style={{ color: '#374151', fontSize: 14 }}>{mov.descricao}</Text>
                        ) : null}
                      </View>
                    ))}
                  </ScrollView>
                  <TouchableOpacity
                    style={{ marginTop: 18, alignSelf: 'center', backgroundColor: '#E5E7EB', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 32 }}
                    onPress={() => setModalExtratoVisible(false)}
                  >
                    <Text style={{ color: '#374151', fontWeight: '500', fontSize: 16 }}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setModalCreditoVisible(true)}
            >
              <FontAwesome5 name="plus" size={16} color="#7C3AED" />
              <Text style={styles.addButtonText}>Adicionar Crédito</Text>
            </TouchableOpacity>

            <Modal
              visible={modalCreditoVisible}
              animationType="slide"
              transparent
              onRequestClose={() => setModalCreditoVisible(false)}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%' }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 18, textAlign: 'center' }}>Adicionar Crédito/Débito</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: tipoCredito === 'credito' ? '#E8FFF3' : '#F3F4F6',
                        borderRadius: 8,
                        padding: 10,
                        marginRight: 4,
                        borderWidth: tipoCredito === 'credito' ? 2 : 1,
                        borderColor: tipoCredito === 'credito' ? '#10B981' : '#E5E7EB',
                        alignItems: 'center',
                      }}
                      onPress={() => {
                        setTipoCredito('credito');
                        if (valorCredito.startsWith('-')) setValorCredito(valorCredito.replace('-', ''));
                        setTimeout(() => valorInputRef.current?.focus(), 100);
                      }}
                    >
                      <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Crédito</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: tipoCredito === 'debito' ? '#FFF1F2' : '#F3F4F6',
                        borderRadius: 8,
                        padding: 10,
                        marginLeft: 4,
                        borderWidth: tipoCredito === 'debito' ? 2 : 1,
                        borderColor: tipoCredito === 'debito' ? '#EF4444' : '#E5E7EB',
                        alignItems: 'center',
                      }}
                      onPress={() => {
                        setTipoCredito('debito');
                        if (!valorCredito.startsWith('-')) setValorCredito('-' + valorCredito.replace('-', ''));
                        setTimeout(() => valorInputRef.current?.focus(), 100);
                      }}
                    >
                      <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Débito</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: '#6B7280', marginBottom: 4 }}>Valor</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                    <Text style={{ fontSize: 18, color: '#7C3AED', marginLeft: 12 }}>R$</Text>
                    <TextInput
                      ref={valorInputRef}
                      style={[styles.input, { flex: 1, backgroundColor: 'transparent', borderWidth: 0, fontSize: 18 }]}
                      placeholder="0,00"
                      value={valorCredito}
                      onChangeText={txt => {
                        // Máscara automática para moeda (R$ 0,00)
                        let v = txt.replace(/\D/g, '');
                        if (!v) {
                          setValorCredito('');
                          return;
                        }
                        // Limita a 8 dígitos (até 99.999,99)
                        v = v.slice(0, 8);
                        let num = parseInt(v, 10);
                        let cents = (num % 100).toString().padStart(2, '0');
                        let reais = Math.floor(num / 100).toString();
                        // Adiciona separador de milhar
                        reais = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                        let formatted = reais + ',' + cents;
                        if (tipoCredito === 'debito' && !formatted.startsWith('-')) formatted = '-' + formatted;
                        if (tipoCredito === 'credito' && formatted.startsWith('-')) formatted = formatted.replace('-', '');
                        setValorCredito(formatted);
                      }}
                      keyboardType="numeric"
                      maxLength={12}
                    />
                  </View>
                  <Text style={{ color: '#6B7280', marginBottom: 4 }}>Descrição</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                    <TextInput
                      style={[styles.input, { flex: 1, backgroundColor: 'transparent', borderWidth: 0, fontSize: 16 }]}
                      placeholder="Ex: Pagamento, ajuste, desconto..."
                      value={descricaoCredito}
                      onChangeText={setDescricaoCredito}
                      maxLength={60}
                    />
                  </View>
                  <Text style={{ color: '#6B7280', marginBottom: 4 }}>Data</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, marginBottom: 18, borderWidth: 1, borderColor: '#E5E7EB' }}>
                    <TextInput
                      style={[styles.input, { flex: 1, backgroundColor: 'transparent', borderWidth: 0, fontSize: 16 }]}
                      placeholder="DD/MM/AAAA (opcional)"
                      value={dataCredito}
                      onChangeText={txt => setDataCredito(formatarData(txt))}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                    <TouchableOpacity
                      style={[styles.footerButton, { marginRight: 8 }]}
                      onPress={() => {
                        setModalCreditoVisible(false);
                        setValorCredito('');
                        setDescricaoCredito('');
                        setTipoCredito('credito');
                      }}
                    >
                      <Text style={styles.footerButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.footerButton, styles.footerButtonSalvar, { opacity: !valorCredito.trim() || salvandoCredito ? 0.6 : 1 }]}
                      onPress={async () => {
                        if (!valorCredito.trim()) {
                          Alert.alert('Atenção', 'Informe o valor do crédito/débito.');
                          return;
                        }
                        // Remove formatação: pontos de milhar e substitui vírgula por ponto
                        let valorLimpo = valorCredito.replace(/\./g, '').replace(',', '.');
                        // Remove o sinal de menos se houver (já será tratado pelo tipo)
                        valorLimpo = valorLimpo.replace('-', '');
                        
                        let valor = parseFloat(valorLimpo);
                        if (isNaN(valor) || valor === 0) {
                          Alert.alert('Atenção', 'Informe um valor válido diferente de zero.');
                          return;
                        }
                        if (tipoCredito === 'debito' && valor > 0) valor = -valor;
                        if (tipoCredito === 'credito' && valor < 0) valor = Math.abs(valor);
                        setSalvandoCredito(true);
                        try {
                          // Determina data: se não preenchida, usa hoje
                          let dataMov = dataCredito && dataCredito.length === 10
                            ? dataCredito.split('/').reverse().join('-')
                            : new Date().toISOString().slice(0, 10);
                          // Insere movimentação
                          const { error: movError } = await supabase
                            .from('crediario_movimentacoes')
                            .insert({
                              cliente_id: cliente?.id,
                              valor,
                              tipo: tipoCredito,
                              descricao: descricaoCredito,
                              data: dataMov,
                            });
                          if (movError) throw movError;
                          
                          // Recalcula saldo do banco de dados
                          const { data: movimentacoes, error: saldoError } = await supabase
                            .from('crediario_movimentacoes')
                            .select('valor')
                            .eq('cliente_id', cliente?.id);
                          
                          if (!saldoError && movimentacoes) {
                            const soma = movimentacoes.reduce((acc, mov) => acc + (typeof mov.valor === 'number' ? mov.valor : parseFloat(mov.valor)), 0);
                            setSaldoAtual(soma.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
                          }
                          
                          setModalCreditoVisible(false);
                          setValorCredito('');
                          setDescricaoCredito('');
                          setTipoCredito('credito');
                          setDataCredito('');
                          Alert.alert('Sucesso', 'Movimentação registrada!');
                        } catch (err) {
                          Alert.alert('Erro', 'Não foi possível registrar a movimentação.');
                        } finally {
                          setSalvandoCredito(false);
                        }
                      }}
                      disabled={!valorCredito.trim() || salvandoCredito}
                    >
                      <Text style={[styles.footerButtonText, styles.footerButtonTextSalvar]}>
                        {salvandoCredito ? 'Salvando...' : 'Salvar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </Modal>
          </View>
        );

      case 'agendamentos':
        return (
          <View style={styles.tabContent}>
            {agendamentos.length > 0 ? (
              agendamentos.map((agendamento, index) => (
                <View key={index} style={styles.agendamentoCard}>
                  <View style={styles.agendamentoHeader}>
                    <Text style={styles.agendamentoData}>{agendamento.data}</Text>
                    <Text style={styles.agendamentoHora}>{agendamento.hora}</Text>
                  </View>
                  <Text style={styles.agendamentoServico}>{agendamento.servico}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <FontAwesome5 name="calendar-alt" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>
                  Nenhum agendamento encontrado
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
            >
              <FontAwesome5 name="plus" size={16} color="#7C3AED" />
              <Text style={styles.addButtonText}>Novo Agendamento</Text>
            </TouchableOpacity>
          </View>
        );

      case 'historico':
      case 'pacotes':
      case 'comandas':
      case 'fotos':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyState}>
              <FontAwesome5 
                name={
                  activeTab === 'historico' ? 'history' :
                  activeTab === 'pacotes' ? 'box' :
                  activeTab === 'comandas' ? 'receipt' : 'images'
                } 
                size={48} 
                color="#9CA3AF" 
              />
              <Text style={styles.emptyStateText}>
                {`Nenhum${activeTab === 'historico' ? ' histórico' :
                  activeTab === 'pacotes' ? ' pacote' :
                  activeTab === 'comandas' ? 'a comanda' :
                  'a foto'} encontrad${activeTab === 'comandas' || activeTab === 'fotos' ? 'a' : 'o'}`}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
            >
              <FontAwesome5 name="plus" size={16} color="#7C3AED" />
              <Text style={styles.addButtonText}>
                {`Adicionar ${
                  activeTab === 'historico' ? 'Registro' :
                  activeTab === 'pacotes' ? 'Pacote' :
                  activeTab === 'comandas' ? 'Comanda' : 'Foto'
                }`}
              </Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  if (carregando) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.headerButton, styles.headerButtonImport]}
            onPress={() => router.back()}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#7C3AED" />
          </TouchableOpacity>
          <Text style={styles.title}>Carregando...</Text>
          <View style={[styles.headerButton, { opacity: 0 }]} />
        </View>
      </View>
    );
  }

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
          <Text style={styles.title}>Editar Cliente</Text>
          <TouchableOpacity 
            style={[styles.headerButton, styles.headerButtonDelete]}
            onPress={excluirCliente}
          >
            <FontAwesome5 name="trash-alt" size={20} color="#EF4444" />
          </TouchableOpacity>
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
  headerButtonDelete: {
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
    flex: 1,
    padding: 16,
  },
  saldoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  saldoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  saldoValor: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE9FE',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  addButtonText: {
    color: '#7C3AED',
    fontWeight: '500',
    marginLeft: 8,
  },
  agendamentoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  agendamentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  agendamentoData: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  agendamentoHora: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500',
  },
  agendamentoServico: {
    fontSize: 16,
    color: '#111827',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
  },
}); 