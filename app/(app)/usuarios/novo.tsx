import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

const formatarCelular = (valor: string) => {
  const celular = valor.replace(/\D/g, '');
  if (celular.length <= 2) return `(${celular}`;
  if (celular.length <= 7) return `(${celular.slice(0, 2)}) ${celular.slice(2)}`;
  return `(${celular.slice(0, 2)}) ${celular.slice(2, 7)}-${celular.slice(7, 11)}`;
};

export default function NovoUsuarioScreen() {
  const router = useRouter();
  const { session, estabelecimentoId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Dados do formulário
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState<'funcionario' | 'profissional'>('funcionario');
  const [fazAtendimento, setFazAtendimento] = useState(true);

  // Estados para mostrar/ocultar senhas
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);

  useEffect(() => {
    verificarPermissaoAdmin();
  }, []);

  const verificarPermissaoAdmin = async () => {
    try {
      if (!session?.user?.id) {
        router.replace('/usuarios');
        return;
      }

      const { data: userData, error } = await supabase
        .from('usuarios')
        .select('role, is_principal')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;

      // Permite acesso para admins ou usuários principais
      const podeCrearUsuario = userData?.role === 'admin' || userData?.is_principal === true;
      
      if (!podeCrearUsuario) {
        Alert.alert('Acesso Negado', 'Apenas administradores ou usuários principais podem criar novos usuários.');
        router.replace('/usuarios');
        return;
      }
    } catch (error: any) {
      console.error('Erro ao verificar permissão:', error);
      Alert.alert('Erro', 'Não foi possível verificar suas permissões.');
      router.replace('/usuarios');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erro', 'Precisamos de permissão para acessar suas fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUrl(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Erro', `Não foi possível selecionar a imagem: ${error.message}`);
    }
  };

  const uploadAvatar = async (imageUri: string, userId: string): Promise<string | null> => {
    try {
      const fileName = `${userId}_${Date.now()}.jpg`;
      
      // Converter URI para blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Erro no upload:', error);
      return null;
    }
  };

  const validarFormulario = () => {
    if (!nomeCompleto.trim()) {
      Alert.alert('Erro', 'Nome completo é obrigatório.');
      return false;
    }
    
    if (!email.trim()) {
      Alert.alert('Erro', 'Email é obrigatório.');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Erro', 'Email deve ter um formato válido.');
      return false;
    }
    
    if (!senha.trim()) {
      Alert.alert('Erro', 'Senha é obrigatória.');
      return false;
    }
    
    if (senha.length < 6) {
      Alert.alert('Erro', 'Senha deve ter pelo menos 6 caracteres.');
      return false;
    }
    
    if (senha !== confirmarSenha) {
      Alert.alert('Erro', 'Senhas não coincidem.');
      return false;
    }

    return true;
  };

  const handleSalvar = async () => {
    if (!validarFormulario()) return;
    if (!estabelecimentoId) {
      Alert.alert('Erro', 'Estabelecimento não identificado.');
      return;
    }

    setLoading(true);
    
    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Este email já está sendo usado por outro usuário.');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Erro ao criar usuário de autenticação.');
      }

      // 2. Upload do avatar (se houver)
      let avatarPublicUrl: string | null = null;
      if (avatarUrl) {
        avatarPublicUrl = await uploadAvatar(avatarUrl, authData.user.id);
      }

      // 3. Criar registro na tabela usuarios
      const { error: userError } = await supabase
        .from('usuarios')
        .insert({
          id: authData.user.id,
          nome_completo: nomeCompleto.trim(),
          email: email.toLowerCase().trim(),
          telefone: telefone.replace(/\D/g, '') || null,
          role: tipoUsuario,
          estabelecimento_id: estabelecimentoId,
          is_principal: false,
          faz_atendimento: fazAtendimento,
          avatar_url: avatarPublicUrl,
          created_at: new Date().toISOString(),
        });

      if (userError) throw userError;

      Alert.alert('Sucesso!', 'Usuário criado com sucesso.', [
        {
          text: 'OK',
          onPress: () => router.replace('/usuarios'),
        },
      ]);

    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      Alert.alert('Erro', error.message || 'Não foi possível criar o usuário.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#7C3AED" />
        </TouchableOpacity>
        <Text style={styles.title}>Novo Usuário</Text>
      </View>

      {/* Seção Avatar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Foto de Perfil (Opcional)</Text>
        <View style={styles.avatarContainer}>
          <TouchableOpacity style={styles.avatarButton} onPress={pickImage}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="camera" size={32} color="#7C3AED" />
                <Text style={styles.avatarText}>Adicionar Foto</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Dados Básicos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dados Básicos</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome Completo *</Text>
          <TextInput
            style={styles.input}
            value={nomeCompleto}
            onChangeText={setNomeCompleto}
            placeholder="Digite o nome completo"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email@exemplo.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Telefone (Opcional)</Text>
          <TextInput
            style={styles.input}
            value={telefone}
            onChangeText={(text) => setTelefone(formatarCelular(text))}
            placeholder="(11) 99999-9999"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            maxLength={15}
          />
        </View>
      </View>

      {/* Senha */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Senha de Acesso</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Senha *</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={senha}
              onChangeText={setSenha}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showSenha}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowSenha(!showSenha)}
            >
              <Ionicons 
                name={showSenha ? "eye-off" : "eye"} 
                size={20} 
                color="#7C3AED" 
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirmar Senha *</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              placeholder="Digite a senha novamente"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showConfirmarSenha}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowConfirmarSenha(!showConfirmarSenha)}
            >
              <Ionicons 
                name={showConfirmarSenha ? "eye-off" : "eye"} 
                size={20} 
                color="#7C3AED" 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tipo de Usuário */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipo de Usuário</Text>
        
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={[
              styles.radioButton,
              tipoUsuario === 'funcionario' && styles.radioButtonActive
            ]}
            onPress={() => setTipoUsuario('funcionario')}
          >
            <View style={[
              styles.radioCircle,
              tipoUsuario === 'funcionario' && styles.radioCircleActive
            ]}>
              {tipoUsuario === 'funcionario' && <View style={styles.radioDot} />}
            </View>
            <Text style={[
              styles.radioLabel,
              tipoUsuario === 'funcionario' && styles.radioLabelActive
            ]}>
              Funcionário
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.radioButton,
              tipoUsuario === 'profissional' && styles.radioButtonActive
            ]}
            onPress={() => setTipoUsuario('profissional')}
          >
            <View style={[
              styles.radioCircle,
              tipoUsuario === 'profissional' && styles.radioCircleActive
            ]}>
              {tipoUsuario === 'profissional' && <View style={styles.radioDot} />}
            </View>
            <Text style={[
              styles.radioLabel,
              tipoUsuario === 'profissional' && styles.radioLabelActive
            ]}>
              Profissional
            </Text>
          </TouchableOpacity>
        </View>

        {/* Checkbox Faz Atendimento */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setFazAtendimento(!fazAtendimento)}
        >
          <View style={[
            styles.checkbox,
            fazAtendimento && styles.checkboxActive
          ]}>
            {fazAtendimento && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.checkboxLabel}>
            Este usuário faz atendimento
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botões */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSalvar}
          disabled={loading}
        >
          {loading ? (
            <>
              <Text style={styles.saveButtonText}>Criando...</Text>
            </>
          ) : (
            <Text style={styles.saveButtonText}>Criar Usuário</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarButton: {
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#7C3AED',
    borderStyle: 'dashed',
  },
  avatarText: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '500',
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  passwordToggle: {
    padding: 12,
  },
  radioGroup: {
    gap: 12,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  radioButtonActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F3E8FF',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleActive: {
    borderColor: '#7C3AED',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7C3AED',
  },
  radioLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  radioLabelActive: {
    color: '#7C3AED',
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});