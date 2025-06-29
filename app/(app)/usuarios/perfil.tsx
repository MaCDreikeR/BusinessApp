import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, Image, Platform, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import * as FileSystem from 'expo-file-system';
import { Picker } from '@react-native-picker/picker';
import { decode } from 'base-64';

const SEGMENTOS = [
  { label: 'Selecione um segmento', value: '' },
  { label: 'Varejo', value: 'varejo' },
  { label: 'Serviços', value: 'servicos' },
  { label: 'Alimentação', value: 'alimentacao' },
  { label: 'Beleza e Estética', value: 'beleza' },
  { label: 'Saúde', value: 'saude' },
  { label: 'Outros', value: 'outros' }
];

export default function PerfilScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usuarioData, setUsuarioData] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [isPrincipal, setIsPrincipal] = useState(false);
  const [nomeEstabelecimento, setNomeEstabelecimento] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('CPF');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [segmento, setSegmento] = useState('');
  const [receberTutorial, setReceberTutorial] = useState(false);
  const [aceitarTermos, setAceitarTermos] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [fazAtendimento, setFazAtendimento] = useState(false);
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    if (session?.user?.id) {
      carregarPerfil();
    } else {
      setLoading(false);
      Alert.alert('Erro', 'Usuário não autenticado');
      router.replace('/(auth)/login');
    }
  }, [session?.user?.id]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'Editar Perfil',
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => router.replace('/usuarios')}
          style={{ marginLeft: 16 }}
        >
          <Ionicons name="arrow-back" size={24} color="#7C3AED" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const carregarPerfil = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/login');
        return;
      }

      // Buscar dados do usuário
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select(`
          *,
          conta:contas (
            nome_estabelecimento,
            tipo_documento,
            numero_documento,
            telefone,
            segmento
          )
        `)
        .eq('id', user.id)
        .single();

      if (usuarioError) {
        console.error('Erro ao buscar dados do usuário:', usuarioError);
        throw usuarioError;
      }

      if (!usuarioData) {
        throw new Error('Usuário não encontrado');
      }

      setUsuarioData(usuarioData);
      setNome(usuarioData.nome_completo);
      setEmail(usuarioData.email);
      setCelular(usuarioData.telefone);
      setReceberTutorial(usuarioData.receber_tutorial);
      setAceitarTermos(usuarioData.aceitar_termos);
      setFazAtendimento(usuarioData.faz_atendimento || false);

      // Se o usuário for principal, carrega os dados da conta
      if (usuarioData.is_principal && usuarioData.conta) {
        setNomeEstabelecimento(usuarioData.conta.nome_estabelecimento);
        setTipoDocumento(usuarioData.conta.tipo_documento);
        setNumeroDocumento(usuarioData.conta.numero_documento);
        setSegmento(usuarioData.conta.segmento);
      }

      if (usuarioData.avatar_url) {
        setAvatarUrl(`${usuarioData.avatar_url}?v=${Date.now()}`);
        } else {
          setAvatarUrl(null);
        }

      console.log('Dados do usuário carregados:', usuarioData);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      setSaving(true);

      if (!session?.user?.id || !avatarUrl) {
        return;
      }

      // Extrair o nome do arquivo da URL
      const fileNameMatch = avatarUrl.match(/avatars\/([^?]+)/);
      if (!fileNameMatch) {
        throw new Error('Nome do arquivo não encontrado na URL');
      }
      const fileName = fileNameMatch[1];

      // Excluir o arquivo do storage
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([fileName]);

      if (deleteError) {
        throw deleteError;
      }

      // Atualizar o perfil removendo a URL do avatar
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ 
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(null);
      Alert.alert('Sucesso', 'Foto de perfil removida com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir avatar:', error);
      Alert.alert('Erro', 'Não foi possível excluir a foto de perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erro', 'Precisamos de permissão para acessar suas fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      console.log('Resultado da seleção de imagem:', result);

      if (!result.canceled && result.assets[0]) {
        setSaving(true);
        const file = result.assets[0];

        // Se já existe um avatar, excluir primeiro
        if (avatarUrl) {
          const fileNameMatch = avatarUrl.match(/avatars\/([^?]+)/);
          if (fileNameMatch) {
            const oldFileName = fileNameMatch[1];
            await supabase.storage
              .from('avatars')
              .remove([oldFileName]);
          }
        }

        // Criar um FormData
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          type: 'image/jpeg',
          name: 'avatar.jpg'
        } as any);

        // Forçar extensão .jpg
        const fileName = `${session?.user.id}-${Date.now()}.jpg`;
        
        console.log('Iniciando upload do arquivo:', fileName);

        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, formData, {
            contentType: 'multipart/form-data',
            upsert: true
          });

        if (error) {
          console.error('Erro no upload:', error);
          throw error;
        }

        console.log('Upload concluído, obtendo URL pública');

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        console.log('URL pública obtida:', publicUrl);

        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ 
            avatar_url: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', session?.user.id);

        if (updateError) {
          console.error('Erro ao atualizar perfil:', updateError);
          throw updateError;
        }

        // Atualizar a URL com timestamp para forçar recarregamento
        setAvatarUrl(publicUrl + '?v=' + Date.now());
        Alert.alert('Sucesso', 'Imagem de perfil atualizada com sucesso!');
      }
    } catch (error) {
      console.error('Erro detalhado:', error);
      Alert.alert('Erro', 'Não foi possível fazer o upload da imagem. Por favor, tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Componente de imagem otimizado
  const AvatarImage = React.useMemo(() => {
    if (!avatarUrl) {
      return (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={40} color="#7C3AED" />
        </View>
      );
    }

    // Adicionar timestamp para forçar recarregamento da imagem
    const imageUrlWithTimestamp = `${avatarUrl}?v=${Date.now()}`;

    return (
      <Image
        source={{ 
          uri: imageUrlWithTimestamp,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }}
        style={styles.avatar}
        onLoadStart={() => console.log('Iniciando carregamento da imagem:', imageUrlWithTimestamp)}
        onLoadEnd={() => console.log('Carregamento da imagem concluído')}
        onError={(e) => {
          console.error('Erro ao carregar imagem:', imageUrlWithTimestamp, e.nativeEvent);
          setAvatarUrl(null);
        }}
      />
    );
  }, [avatarUrl]);

  const formatarCNPJ = (valor: string) => {
    // Remove todos os caracteres não numéricos
    const apenasNumeros = valor.replace(/\D/g, '');
    
    // Aplica a máscara XX.XXX.XXX/XXXX-XX
    return apenasNumeros.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
  };

  const handleCNPJChange = (texto: string) => {
    // Remove caracteres não numéricos para o estado
    const apenasNumeros = texto.replace(/\D/g, '');
    
    // Limita a 14 dígitos
    if (apenasNumeros.length <= 14) {
      // Guarda os números puros no estado
      setNumeroDocumento(apenasNumeros);
    }
  };

  const formatarCPF = (valor: string) => {
    // Remove todos os caracteres não numéricos
    const apenasNumeros = valor.replace(/\D/g, '');
    
    // Aplica a máscara XXX.XXX.XXX-XX
    return apenasNumeros.replace(
      /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
      '$1.$2.$3-$4'
    );
  };

  const formatarCelular = (valor: string) => {
    // Remove todos os caracteres não numéricos
    const apenasNumeros = valor.replace(/\D/g, '');
    
    // Aplica a máscara (XX) XXXX-XXXX
    return apenasNumeros.replace(
      /^(\d{2})(\d{4})(\d{4})$/,
      '($1) $2-$3'
    );
  };

  const handleAlterarSenha = async () => {
    if (!senhaAtual) {
      Alert.alert('Erro', 'A senha atual é obrigatória');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    if (novaSenha.length < 6) {
      Alert.alert('Erro', 'A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      setSaving(true);

      // Primeiro, reautenticar o usuário com a senha atual
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: email,
        password: senhaAtual,
      });

      if (reauthError) {
        throw new Error('Senha atual incorreta');
      }

      // Se a reautenticação foi bem sucedida, atualizar a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha 
      });

      if (updateError) throw updateError;

      Alert.alert('Sucesso', 'Senha atualizada com sucesso!');
      
      // Limpar os campos
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      Alert.alert('Erro', error.message || 'Não foi possível alterar a senha');
    } finally {
      setSaving(false);
    }
  };

  const handleSalvar = async () => {
    try {
      setLoading(true);

      // Validar campos obrigatórios
      if (!nome || !email || !celular) {
        Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      // Atualizar dados do usuário
      const { error: usuarioError } = await supabase
        .from('usuarios')
        .update({
          nome_completo: nome,
          email: email,
          telefone: celular,
          receber_tutorial: receberTutorial,
          aceitar_termos: aceitarTermos,
          faz_atendimento: fazAtendimento,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (usuarioError) throw usuarioError;

      // Se o usuário for principal, atualizar dados da conta
      if (usuarioData?.is_principal) {
        // Formatar documento
        let documentoFormatado = numeroDocumento;
        if (tipoDocumento === 'CPF') {
          documentoFormatado = formatarCPF(numeroDocumento);
        } else if (tipoDocumento === 'CNPJ') {
          documentoFormatado = formatarCNPJ(numeroDocumento);
        }

        // Atualizar dados da conta
        const { error: contaError } = await supabase
          .from('contas')
            .update({
            nome_estabelecimento: nomeEstabelecimento,
              tipo_documento: tipoDocumento,
              numero_documento: documentoFormatado,
              segmento: segmento
            })
          .eq('id', usuarioData.conta_id);

        if (contaError) throw contaError;
      }

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      await carregarPerfil();
      router.replace('/usuarios');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      Alert.alert('Erro', 'Não foi possível salvar as alterações');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          {/* Seção de Foto de Perfil */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              {AvatarImage}
              <TouchableOpacity 
                style={styles.editAvatarButton}
                onPress={handleUploadAvatar}
                disabled={saving}
              >
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              {avatarUrl && (
                <TouchableOpacity 
                  style={styles.deleteAvatarButton}
                  onPress={handleDeleteAvatar}
                  disabled={saving}
                >
                  <Ionicons name="trash" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.avatarLabel}>Foto de Perfil</Text>
          </View>

        <Text style={styles.sectionTitle}>Dados Pessoais</Text>
        
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome Completo *</Text>
          <TextInput
            style={styles.input}
            value={nome}
            onChangeText={setNome}
              placeholder="Digite seu nome completo"
          />
        </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>E-mail *</Text>
          <TextInput
              style={styles.input}
            value={email}
              onChangeText={setEmail}
              placeholder="Digite seu e-mail"
              keyboardType="email-address"
              autoCapitalize="none"
          />
        </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Celular *</Text>
          <TextInput
            style={styles.input}
              value={celular}
              onChangeText={setCelular}
            placeholder="(00) 00000-0000"
            keyboardType="phone-pad"
          />
        </View>

          {usuarioData?.is_principal && (
          <>
              <Text style={styles.sectionTitle}>Dados do Estabelecimento</Text>
            
              <View style={styles.inputContainer}>
              <Text style={styles.label}>Nome do Estabelecimento</Text>
              <TextInput
                style={styles.input}
                value={nomeEstabelecimento}
                onChangeText={setNomeEstabelecimento}
                  placeholder="Digite o nome do estabelecimento"
              />
            </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Tipo de Documento</Text>
                <View style={styles.radioContainer}>
                  <TouchableOpacity
                    style={[styles.radioButton, tipoDocumento === 'cpf' && styles.radioButtonSelected]}
                    onPress={() => setTipoDocumento('cpf')}
                  >
                    <Text style={[styles.radioText, tipoDocumento === 'cpf' && styles.radioTextSelected]}>CPF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioButton, tipoDocumento === 'cnpj' && styles.radioButtonSelected]}
                    onPress={() => setTipoDocumento('cnpj')}
                  >
                    <Text style={[styles.radioText, tipoDocumento === 'cnpj' && styles.radioTextSelected]}>CNPJ</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Número do Documento</Text>
              <TextInput
                style={styles.input}
                  value={numeroDocumento}
                  onChangeText={setNumeroDocumento}
                  placeholder={tipoDocumento === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                keyboardType="numeric"
              />
            </View>

              <View style={styles.inputContainer}>
              <Text style={styles.label}>Segmento</Text>
                  <Picker
                    selectedValue={segmento}
                    onValueChange={setSegmento}
                    style={styles.picker}
                  >
                  {SEGMENTOS.map((item) => (
                    <Picker.Item key={item.value} label={item.label} value={item.value} />
                    ))}
                  </Picker>
            </View>
          </>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Faz Atendimento?</Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity
              style={[styles.radioButton, fazAtendimento && styles.radioButtonSelected]}
              onPress={() => setFazAtendimento(true)}
            >
              <Text style={[styles.radioText, fazAtendimento && styles.radioTextSelected]}>Sim</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioButton, !fazAtendimento && styles.radioButtonSelected]}
              onPress={() => setFazAtendimento(false)}
            >
              <Text style={[styles.radioText, !fazAtendimento && styles.radioTextSelected]}>Não</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seção de Troca de Senha */}
        <Text style={styles.sectionTitle}>Alterar Senha</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Senha Atual</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              value={senhaAtual}
              onChangeText={setSenhaAtual}
              placeholder="Digite sua senha atual"
              secureTextEntry={!showSenhaAtual}
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowSenhaAtual(!showSenhaAtual)}
            >
              <Ionicons 
                name={showSenhaAtual ? "eye-off" : "eye"} 
                size={24} 
                color="#6B7280" 
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nova Senha</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              value={novaSenha}
              onChangeText={setNovaSenha}
              placeholder="Digite a nova senha"
              secureTextEntry={!showNovaSenha}
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowNovaSenha(!showNovaSenha)}
            >
              <Ionicons 
                name={showNovaSenha ? "eye-off" : "eye"} 
                size={24} 
                color="#6B7280" 
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirmar Nova Senha</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              placeholder="Confirme a nova senha"
              secureTextEntry={!showConfirmarSenha}
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowConfirmarSenha(!showConfirmarSenha)}
            >
              <Ionicons 
                name={showConfirmarSenha ? "eye-off" : "eye"} 
                size={24} 
                color="#6B7280" 
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.button, styles.alterarSenhaButton]}
          onPress={handleAlterarSenha}
          disabled={saving}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Alterando senha...' : 'Alterar Senha'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
            style={styles.button}
          onPress={handleSalvar}
            disabled={loading}
        >
            <Text style={styles.buttonText}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    padding: 16,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  radioContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F3E8FF',
  },
  radioText: {
    fontSize: 16,
    color: '#374151',
  },
  radioTextSelected: {
    fontWeight: '600',
    color: '#7C3AED',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    borderColor: '#7C3AED',
    backgroundColor: '#F3E8FF',
  },
  checkboxCheck: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: '#7C3AED',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  picker: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginTop: 8,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#7C3AED',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  deleteAvatarButton: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    backgroundColor: '#EF4444',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alterarSenhaButton: {
    backgroundColor: '#4F46E5',
    marginBottom: 24,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    padding: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#D1D5DB',
  },
}); 