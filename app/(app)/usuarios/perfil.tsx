import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, Image, Modal, FlatList, ActivityIndicator, DeviceEventEmitter, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Picker } from '@react-native-picker/picker';

const SEGMENTOS = [
  { label: 'Selecione um segmento', value: '' },
  { label: 'Varejo', value: 'varejo' },
  { label: 'Serviços', value: 'servicos' },
  { label: 'Alimentação', value: 'alimentacao' },
  { label: 'Beleza e Estética', value: 'beleza' },
  { label: 'Saúde', value: 'saude' },
  { label: 'Outros', value: 'outros' }
];

const PERMISSOES = [
  { key: 'pode_ver_agenda', label: 'Ver Agenda', icon: 'calendar-outline' },
  { key: 'pode_editar_agenda', label: 'Editar Agenda', icon: 'calendar' },
  { key: 'pode_ver_clientes', label: 'Ver Clientes', icon: 'people-outline' },
  { key: 'pode_editar_clientes', label: 'Editar Clientes', icon: 'people' },
  { key: 'pode_ver_servicos', label: 'Ver Serviços', icon: 'construct-outline' },
  { key: 'pode_editar_servicos', label: 'Editar Serviços', icon: 'construct' },
  { key: 'pode_ver_vendas', label: 'Ver Vendas', icon: 'cash-outline' },
  { key: 'pode_editar_vendas', label: 'Editar Vendas', icon: 'cash' },
  { key: 'pode_ver_comandas', label: 'Ver Comandas', icon: 'receipt-outline' },
  { key: 'pode_editar_comandas', label: 'Editar Comandas', icon: 'receipt' },
  { key: 'pode_ver_orcamentos', label: 'Ver Orçamentos', icon: 'document-text-outline' },
  { key: 'pode_editar_orcamentos', label: 'Editar Orçamentos', icon: 'document-text' },
  { key: 'pode_ver_pacotes', label: 'Ver Pacotes', icon: 'cube-outline' },
  { key: 'pode_editar_pacotes', label: 'Editar Pacotes', icon: 'cube' },
  { key: 'pode_ver_estoque', label: 'Ver Estoque', icon: 'archive-outline' },
  { key: 'pode_editar_estoque', label: 'Editar Estoque', icon: 'archive' },
  { key: 'pode_ver_fornecedores', label: 'Ver Fornecedores', icon: 'business-outline' },
  { key: 'pode_editar_fornecedores', label: 'Editar Fornecedores', icon: 'business' },
  { key: 'pode_ver_aniversariantes', label: 'Ver Aniversariantes', icon: 'gift-outline' },
  { key: 'pode_editar_aniversariantes', label: 'Editar Aniversariantes', icon: 'gift' },
  { key: 'pode_ver_metas', label: 'Ver Metas', icon: 'flag-outline' },
  { key: 'pode_editar_metas', label: 'Editar Metas', icon: 'flag' },
  { key: 'pode_ver_despesas', label: 'Ver Despesas', icon: 'card-outline' },
  { key: 'pode_editar_despesas', label: 'Editar Despesas', icon: 'card' },
  { key: 'pode_ver_comissoes', label: 'Ver Comissões', icon: 'cash-outline' },
  { key: 'pode_editar_comissoes', label: 'Editar Comissões', icon: 'cash' },
  { key: 'pode_ver_agendamentos_online', label: 'Ver Agendamentos Online', icon: 'globe-outline' },
  { key: 'pode_editar_agendamentos_online', label: 'Editar Agendamentos Online', icon: 'globe' },
  { key: 'pode_ver_automacao', label: 'Ver Automação', icon: 'settings-outline' },
  { key: 'pode_editar_automacao', label: 'Editar Automação', icon: 'settings' },
  { key: 'pode_ver_notificacoes', label: 'Ver Notificações', icon: 'notifications-outline' },
  { key: 'pode_editar_notificacoes', label: 'Editar Notificações', icon: 'notifications' },
  { key: 'pode_ver_relatorios', label: 'Ver Relatórios', icon: 'bar-chart-outline' },
  { key: 'pode_ver_configuracoes', label: 'Ver Configurações', icon: 'cog-outline' },
  { key: 'pode_editar_configuracoes', label: 'Editar Configurações', icon: 'cog' },
  { key: 'pode_gerenciar_usuarios', label: 'Gerenciar Usuários', icon: 'person-add-outline' }
];

const formatarCNPJ = (valor: string) => {
  const cnpj = valor.replace(/\D/g, '');
  if (cnpj.length <= 2) return cnpj;
  if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
  if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
  if (cnpj.length <= 12) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
};
const formatarCPF = (valor: string) => {
  const cpf = valor.replace(/\D/g, '');
  if (cpf.length <= 3) return cpf;
  if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
  if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;
};
const formatarCelular = (valor: string) => {
  const celular = valor.replace(/\D/g, '');
  if (celular.length <= 2) return `(${celular}`;
  if (celular.length <= 7) return `(${celular.slice(0, 2)}) ${celular.slice(2)}`;
  return `(${celular.slice(0, 2)}) ${celular.slice(2, 7)}-${celular.slice(7, 11)}`;
};

export default function PerfilScreen() {
  const { session, estabelecimentoId } = useAuth();
  const { userId } = useLocalSearchParams();
  const editandoOutroUsuario = userId && userId !== session?.user?.id;
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
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [fazAtendimento, setFazAtendimento] = useState(false);
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  
  // Estados para modal de permissões
  const [modalPermissionsVisible, setModalPermissionsVisible] = useState(false);
  const [permissoes, setPermissoes] = useState<{[key: string]: boolean}>({});
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
  const navigation = useNavigation();

  useEffect(() => {
    if (session?.user?.id) {
      carregarPerfil();
    } else {
      setLoading(false);
      Alert.alert('Erro', 'Usuário não autenticado.');
      router.replace('/(auth)/login');
    }
  }, [session?.user?.id, userId]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: editandoOutroUsuario ? 'Editar Usuário' : 'Editar Perfil',
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
          <Ionicons name="arrow-back" size={24} color="#7C3AED" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={handleOpenPermissionsModal} style={{ marginRight: 16 }}>
          <Ionicons name="shield-checkmark" size={24} color="#7C3AED" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const carregarPerfil = async () => {
    setLoading(true);
    try {
      if (!session?.user?.id) throw new Error("ID do usuário não encontrado na sessão.");

      const targetUserId = editandoOutroUsuario ? userId as string : session.user.id;
      
      // Se estiver editando outro usuário, usar função RPC para contornar RLS
      let data, error;
      if (editandoOutroUsuario) {
        const result = await supabase.rpc('get_usuarios_estabelecimento', {
          estabelecimento_uuid: estabelecimentoId
        });
        error = result.error;
        data = result.data?.find((u: any) => u.id === userId);
        if (!data && !error) {
          throw new Error('Usuário não encontrado ou sem permissão para visualizar');
        }
      } else {
        const result = await supabase
          .from('usuarios')
          .select(`*, estabelecimento:estabelecimentos(*)`)
          .eq('id', targetUserId)
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      if (data) {
        setUsuarioData(data);
        setNome(data.nome_completo || '');
        setEmail(data.email || '');
        setCelular(formatarCelular(data.telefone || ''));
        setIsPrincipal(data.is_principal || false);
        setFazAtendimento(data.faz_atendimento || false);
        setAvatarUrl(data.avatar_url);
        if (data.estabelecimento) {
          setNomeEstabelecimento(data.estabelecimento.nome || '');
          setTipoDocumento(data.estabelecimento.tipo_documento || 'CPF');
          const doc = data.estabelecimento.numero_documento || '';
          setNumeroDocumento(data.estabelecimento.tipo_documento === 'CPF' ? formatarCPF(doc) : formatarCNPJ(doc));
          setSegmento(data.estabelecimento.segmento || '');
        }
      }
    } catch (error: any) {
      Alert.alert('Erro ao Carregar Perfil', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUploadAvatar = async () => {
    const oldAvatarUrl = avatarUrl;

    try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão Necessária', 'Precisamos de permissão para acessar suas fotos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (result.canceled || !result.assets[0]) {
            return;
        }

        setSaving(true);
        const file = result.assets[0];
        const fileExt = file.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
        const fileName = `${session!.user.id}-${Date.now()}.${fileExt}`;
        const contentType = `image/${fileExt}`;

        const formData = new FormData();
        formData.append('file', {
            uri: file.uri,
            name: fileName,
            type: contentType,
        } as any);

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, formData, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

        if (!publicUrl) throw new Error("Não foi possível obter a URL pública da nova imagem.");

        const { error: updateError } = await supabase
            .from('usuarios')
            .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
            .eq('id', session!.user.id);

        if (updateError) {
            await supabase.storage.from('avatars').remove([fileName]);
            throw updateError;
        }

        if (oldAvatarUrl) {
            const oldFileNameMatch = oldAvatarUrl.match(/avatars\/(.*)/);
            if (oldFileNameMatch && oldFileNameMatch[1]) {
                const oldFileName = oldFileNameMatch[1].split('?')[0];
                await supabase.storage.from('avatars').remove([oldFileName]);
            }
        }

        setAvatarUrl(publicUrl);
        Alert.alert('Sucesso', 'Imagem de perfil atualizada!');

    } catch (error: any) {
        Alert.alert('Erro', `Não foi possível fazer o upload da imagem: ${error.message}`);
    } finally {
        setSaving(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!avatarUrl) return;

    Alert.alert(
        "Remover Foto",
        "Tem certeza de que deseja remover sua foto de perfil?",
        [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Remover",
                style: "destructive",
                onPress: async () => {
                    setSaving(true);
                    try {
                        const fileNameMatch = avatarUrl.match(/avatars\/(.*)/);
                        if (!fileNameMatch || !fileNameMatch[1]) {
                            throw new Error("Não foi possível extrair o nome do arquivo da URL.");
                        }
                        const fileName = fileNameMatch[1].split('?')[0];

                        const { error: removeError } = await supabase.storage.from('avatars').remove([fileName]);
                        if (removeError) throw removeError;

                        const { error: updateError } = await supabase.from('usuarios').update({ avatar_url: null, updated_at: new Date().toISOString() }).eq('id', session!.user.id);
                        if (updateError) throw updateError;

                        setAvatarUrl(null);
                        Alert.alert('Sucesso', 'Sua foto de perfil foi removida.');
                    } catch (error: any) {
                        Alert.alert('Erro', `Não foi possível remover a foto: ${error.message}`);
                    } finally {
                        setSaving(false);
                    }
                },
            },
        ]
    );
  };

  const handleSalvar = async () => {
    setSaving(true);
    try {
      let estabelecimentoId = usuarioData?.estabelecimento?.id;

      // Se for principal e não tiver estabelecimento vinculado, cria um novo
      if (isPrincipal && !estabelecimentoId) {
        const { data: newEstab, error: newEstabError } = await supabase
          .from('estabelecimentos')
          .insert({
            nome: nomeEstabelecimento,
            tipo_documento: tipoDocumento,
            numero_documento: numeroDocumento.replace(/\D/g, ''),
            segmento,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (newEstab) estabelecimentoId = newEstab.id;
      }

      // Atualiza dados do usuário usando função RPC (contorna RLS)
      const targetUserId = editandoOutroUsuario ? userId as string : session!.user.id;
      
      const { data: updateResult, error: userError } = await supabase.rpc('update_usuario_estabelecimento', {
        usuario_id: targetUserId,
        p_nome_completo: nome,
        p_telefone: celular.replace(/\D/g, '') || null,
        p_faz_atendimento: fazAtendimento
      });

      if (userError) throw userError;

      // Atualiza dados do estabelecimento se já existir
      if (isPrincipal && estabelecimentoId) {
        const { error: estabError } = await supabase.from('estabelecimentos').update({
          nome: nomeEstabelecimento,
          tipo_documento: tipoDocumento,
          numero_documento: numeroDocumento.replace(/\D/g, ''),
          segmento,
          updated_at: new Date().toISOString(),
        }).eq('id', estabelecimentoId);

        if (estabError) throw estabError;
      }

      Alert.alert('Sucesso!', 'Seus dados foram atualizados.', [
        {
          text: 'OK',
          onPress: () => router.replace('/usuarios'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Erro ao Salvar', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAlterarSenha = async () => {
    if (novaSenha !== confirmarSenha) {
        Alert.alert('Erro', 'As novas senhas não coincidem.');
        return;
    }
    if (novaSenha.length < 8) {
        Alert.alert('Erro', 'A nova senha deve ter no mínimo 8 caracteres.');
        return;
    }
    setSaving(true);
    try {
        const { error } = await supabase.auth.updateUser({ password: novaSenha });
        if (error) throw error;
        Alert.alert('Sucesso', 'Sua senha foi alterada.');
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmarSenha('');
    } catch (error: any) {
        Alert.alert('Erro ao Alterar Senha', error.message);
    } finally {
        setSaving(false);
    }
  };

  // Funções para gerenciar permissões
  const handleOpenPermissionsModal = async () => {
    if (!session?.user?.id) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }

    try {
      // Verificar se o usuário é admin
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (userError) throw userError;

      if (userData?.role !== 'admin') {
        Alert.alert('Acesso Negado', 'Você não tem permissão para acessar esta área.');
        return;
      }

      setIsUserAdmin(true);
      await carregarPermissoes();
      setModalPermissionsVisible(true);
    } catch (error: any) {
      console.error('Erro ao verificar permissões:', error);
      Alert.alert('Erro', 'Não foi possível verificar as permissões do usuário.');
    }
  };

  const carregarPermissoes = async () => {
    if (!session?.user?.id) return;

    setLoadingPermissions(true);
    try {
      // Usar o ID do usuário que está sendo editado, não o usuário logado
      const targetUserId = editandoOutroUsuario ? userId as string : session.user.id;
      
      // Buscar permissões do usuário correto
      const { data, error } = await supabase
        .from('permissoes_usuario')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Se não existir registro de permissões, criar com todas liberadas por padrão
      if (!data) {
        const permissoesIniciais: {[key: string]: boolean} = {};
        PERMISSOES.forEach(p => {
          permissoesIniciais[p.key] = true;
        });
        setPermissoes(permissoesIniciais);
        await salvarPermissoes(permissoesIniciais);
      } else {
        // Converter as permissões do banco para o estado local
        const permissoesUsuario: {[key: string]: boolean} = {};
        PERMISSOES.forEach(p => {
          permissoesUsuario[p.key] = data[p.key] ?? true;
        });
        setPermissoes(permissoesUsuario);
      }
    } catch (error: any) {
      console.error('Erro ao carregar permissões:', error);
      Alert.alert('Erro', 'Não foi possível carregar as permissões.');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const togglePermissao = (key: string) => {
    const novasPermissoes = {
      ...permissoes,
      [key]: !permissoes[key]
    };
    setPermissoes(novasPermissoes);
  };

  const salvarPermissoes = async (permissoesParaSalvar: {[key: string]: boolean} = permissoes) => {
    if (!session?.user?.id) return;

    try {
      // Usar o ID do usuário que está sendo editado, não o usuário logado
      const targetUserId = editandoOutroUsuario ? userId as string : session.user.id;
      
      const dadosPermissoes = {
        user_id: targetUserId,
        estabelecimento_id: estabelecimentoId,
        ...permissoesParaSalvar,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('permissoes_usuario')
        .upsert(dadosPermissoes, { onConflict: 'user_id,estabelecimento_id' });

      if (error) throw error;

      Alert.alert('Sucesso', 'Permissões salvas com sucesso!');
      setModalPermissionsVisible(false);
      
      // Emitir evento para atualizar permissões em outros componentes
      DeviceEventEmitter.emit('permissoesAtualizadas');
    } catch (error: any) {
      console.error('Erro ao salvar permissões:', error);
      Alert.alert('Erro', 'Não foi possível salvar as permissões.');
    }
  };

  const renderPermissionItem = ({ item }: { item: typeof PERMISSOES[0] }) => (
    <TouchableOpacity
      style={styles.permissionItem}
      onPress={() => togglePermissao(item.key)}
    >
      <View style={styles.permissionLeft}>
        <Ionicons 
          name={item.icon as any} 
          size={24} 
          color="#7C3AED" 
          style={styles.permissionIcon} 
        />
        <Text style={styles.permissionLabel}>{item.label}</Text>
      </View>
      <View style={styles.checkboxContainer}>
        <Ionicons
          name={permissoes[item.key] ? "checkbox" : "square-outline"}
          size={24}
          color={permissoes[item.key] ? "#7C3AED" : "#9CA3AF"}
        />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.formContainer}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#7C3AED" />
                </View>
              )}
              <TouchableOpacity style={styles.editAvatarButton} onPress={handleUploadAvatar} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="camera" size={20} color="#FFFFFF" />}
              </TouchableOpacity>
              {avatarUrl && (
                <TouchableOpacity style={styles.deleteAvatarButton} onPress={handleDeleteAvatar} disabled={saving}>
                  <Ionicons name="trash" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.avatarLabel}>Foto de Perfil</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dados Pessoais</Text>
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Nome Completo</Text>
                <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Seu nome completo"/>
            </View>
            <View style={styles.inputContainer}>
                <Text style={styles.label}>E-mail</Text>
                <TextInput style={[styles.input, styles.inputDisabled]} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={false} />
            </View>
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Celular</Text>
                <TextInput style={styles.input} value={celular} onChangeText={(text) => setCelular(formatarCelular(text))} keyboardType="phone-pad" placeholder="(00) 00000-0000"/>
            </View>
            <View style={styles.switchContainer}>
                <Text style={styles.label}>Este usuário faz atendimentos/agendamentos</Text>
                <Switch trackColor={{ false: "#767577", true: "#81b0ff" }} thumbColor={fazAtendimento ? "#7C3AED" : "#f4f3f4"} value={fazAtendimento} onValueChange={setFazAtendimento} />
            </View>
          </View>
          
          {isPrincipal && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dados do Estabelecimento</Text>
              <View style={styles.inputContainer}>
                  <Text style={styles.label}>Nome do Estabelecimento</Text>
                  <TextInput style={styles.input} value={nomeEstabelecimento} onChangeText={setNomeEstabelecimento} placeholder="Nome da sua empresa"/>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Tipo de Documento</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={tipoDocumento} onValueChange={(itemValue) => setTipoDocumento(itemValue)}>
                    <Picker.Item label="CPF" value="CPF" />
                    <Picker.Item label="CNPJ" value="CNPJ" />
                  </Picker>
                </View>
              </View>
              <View style={styles.inputContainer}>
                  <Text style={styles.label}>{tipoDocumento}</Text>
                  <TextInput style={styles.input} value={numeroDocumento} onChangeText={(text) => setNumeroDocumento(tipoDocumento === 'CPF' ? formatarCPF(text) : formatarCNPJ(text))} keyboardType="numeric"/>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Segmento</Text>
                <View style={styles.pickerContainer}>
                    <Picker selectedValue={segmento} onValueChange={(itemValue) => setSegmento(itemValue)}>
                        {SEGMENTOS.map(s => <Picker.Item key={s.value} label={s.label} value={s.value} />)}
                    </Picker>
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alterar Senha</Text>
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Nova Senha</Text>
                <TextInput style={styles.input} value={novaSenha} onChangeText={setNovaSenha} secureTextEntry={!showNovaSenha} placeholder="Mínimo 8 caracteres"/>
            </View>
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirmar Nova Senha</Text>
                <TextInput style={styles.input} value={confirmarSenha} onChangeText={setConfirmarSenha} secureTextEntry={!showConfirmarSenha} placeholder="Repita a nova senha"/>
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleAlterarSenha} disabled={saving}>
                <Text style={styles.saveButtonText}>Alterar Senha</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.saveButton, styles.mainSaveButton]} onPress={handleSalvar} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Salvar Alterações</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de Permissões */}
      <Modal
        visible={modalPermissionsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editandoOutroUsuario ? `Permissões - ${nome}` : 'Permissões de Acesso'}
            </Text>
            <TouchableOpacity
              onPress={() => setModalPermissionsVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {loadingPermissions ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={styles.loadingText}>Carregando permissões...</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={PERMISSOES}
                renderItem={renderPermissionItem}
                keyExtractor={(item) => item.key}
                style={styles.permissionsList}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setModalPermissionsVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={() => salvarPermissoes()}
                >
                  <Text style={styles.modalSaveText}>Salvar Alterações</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
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
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  mainSaveButton: {
    backgroundColor: '#7C3AED',
    padding: 16,
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos do Modal de Permissões
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  permissionsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  permissionIcon: {
    marginRight: 12,
  },
  permissionLabel: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  checkboxContainer: {
    padding: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});