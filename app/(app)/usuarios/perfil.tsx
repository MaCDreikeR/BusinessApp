import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, Image, Modal, FlatList, ActivityIndicator, DeviceEventEmitter, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { Picker } from '@react-native-picker/picker';
import { logger } from '../../../utils/logger';
import { formatarCPF, formatarCNPJ, formatarTelefone as formatarCelular } from '../../../utils/validators';
import { theme, colors } from '../../../utils/theme';

const SEGMENTOS = [
  { label: 'Selecione um segmento', value: '' },
  { label: 'Varejo', value: 'varejo' },
  { label: 'Servi�os', value: 'servicos' },
  { label: 'Alimenta��o', value: 'alimentacao' },
  { label: 'Beleza e Est�tica', value: 'beleza' },
  { label: 'Sa�de', value: 'saude' },
  { label: 'Outros', value: 'outros' }
];

const PERMISSOES = [
  { key: 'pode_ver_agenda', label: 'Ver Agenda', icon: 'calendar-outline' },
  { key: 'pode_editar_agenda', label: 'Editar Agenda', icon: 'calendar' },
  { key: 'pode_ver_clientes', label: 'Ver Clientes', icon: 'people-outline' },
  { key: 'pode_editar_clientes', label: 'Editar Clientes', icon: 'people' },
  { key: 'pode_ver_servicos', label: 'Ver Servi�os', icon: 'construct-outline' },
  { key: 'pode_editar_servicos', label: 'Editar Servi�os', icon: 'construct' },
  { key: 'pode_ver_vendas', label: 'Ver Vendas', icon: 'cash-outline' },
  { key: 'pode_editar_vendas', label: 'Editar Vendas', icon: 'cash' },
  { key: 'pode_ver_comandas', label: 'Ver Comandas', icon: 'receipt-outline' },
  { key: 'pode_editar_comandas', label: 'Editar Comandas', icon: 'receipt' },
  { key: 'pode_ver_orcamentos', label: 'Ver Or�amentos', icon: 'document-text-outline' },
  { key: 'pode_editar_orcamentos', label: 'Editar Or�amentos', icon: 'document-text' },
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
  { key: 'pode_ver_comissoes', label: 'Ver Comiss�es', icon: 'cash-outline' },
  { key: 'pode_editar_comissoes', label: 'Editar Comiss�es', icon: 'cash' },
  { key: 'pode_ver_agendamentos_online', label: 'Ver Agendamentos Online', icon: 'globe-outline' },
  { key: 'pode_editar_agendamentos_online', label: 'Editar Agendamentos Online', icon: 'globe' },
  { key: 'pode_ver_automacao', label: 'Ver Automa��o', icon: 'settings-outline' },
  { key: 'pode_editar_automacao', label: 'Editar Automa��o', icon: 'settings' },
  { key: 'pode_ver_notificacoes', label: 'Ver Notifica��es', icon: 'notifications-outline' },
  { key: 'pode_editar_notificacoes', label: 'Editar Notifica��es', icon: 'notifications' },
  { key: 'pode_ver_relatorios', label: 'Ver Relat�rios', icon: 'bar-chart-outline' },
  { key: 'pode_ver_configuracoes', label: 'Ver Configura��es', icon: 'cog-outline' },
  { key: 'pode_editar_configuracoes', label: 'Editar Configura��es', icon: 'cog' },
  { key: 'pode_gerenciar_usuarios', label: 'Gerenciar Usu�rios', icon: 'person-add-outline' }
];

export default function PerfilScreen() {
  const { session, estabelecimentoId } = useAuth();
  const { colors } = useTheme();
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
  
  // Novos estados para SEO e informa��es completas do estabelecimento
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [telefoneEstabelecimento, setTelefoneEstabelecimento] = useState('');
  const [whatsappEstabelecimento, setWhatsappEstabelecimento] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [complemento, setComplemento] = useState('');
  const [descricao, setDescricao] = useState('');
  const [faixaPreco, setFaixaPreco] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [site, setSite] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [fazAtendimento, setFazAtendimento] = useState(false);
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  
  // Estados para modal de permiss�es
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
      Alert.alert('Erro', 'Usu�rio n�o autenticado.');
      router.replace('/(auth)/login');
    }
  }, [session?.user?.id, userId]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: editandoOutroUsuario ? 'Editar Usu�rio' : 'Editar Perfil',
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={handleOpenPermissionsModal} style={{ marginRight: 16 }}>
          <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const carregarPerfil = async () => {
    setLoading(true);
    try {
      if (!session?.user?.id) throw new Error("ID do usu�rio n�o encontrado na sess�o.");

      const targetUserId = editandoOutroUsuario ? userId as string : session.user.id;
      
      // Se estiver editando outro usu�rio, usar fun��o RPC para contornar RLS
      let data, error;
      if (editandoOutroUsuario) {
        const result = await supabase.rpc('get_usuarios_estabelecimento', {
          estabelecimento_uuid: estabelecimentoId
        });
        error = result.error;
        data = result.data?.find((u: any) => u.id === userId);
        if (!data && !error) {
          throw new Error('Usu�rio n�o encontrado ou sem permiss�o para visualizar');
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
          
          // Carregar novos campos
          setLogoUrl(data.estabelecimento.logo_url || null);
          setTelefoneEstabelecimento(formatarCelular(data.estabelecimento.telefone || ''));
          setWhatsappEstabelecimento(formatarCelular(data.estabelecimento.whatsapp || ''));
          setCep(data.estabelecimento.cep || '');
          setEndereco(data.estabelecimento.endereco || '');
          setBairro(data.estabelecimento.bairro || '');
          setCidade(data.estabelecimento.cidade || '');
          setEstado(data.estabelecimento.estado || '');
          setComplemento(data.estabelecimento.complemento || '');
          setDescricao(data.estabelecimento.descricao || '');
          setFaixaPreco(data.estabelecimento.faixa_preco || '');
          setInstagram(data.estabelecimento.instagram || '');
          setFacebook(data.estabelecimento.facebook || '');
          setSite(data.estabelecimento.site || '');
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
            Alert.alert('Permiss�o Necess�ria', 'Precisamos de permiss�o para acessar suas fotos.');
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

        if (!publicUrl) throw new Error("N�o foi poss�vel obter a URL p�blica da nova imagem.");

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
        Alert.alert('Erro', `N�o foi poss�vel fazer o upload da imagem: ${error.message}`);
    } finally {
        setSaving(false);
    }
  };

  const handleUploadLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiss�o Necess�ria', 'Precisamos de permiss�o para acessar suas fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets[0]) return;

      setSaving(true);
      const file = result.assets[0];
      const fileExt = file.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `logo-${estabelecimentoId}-${Date.now()}.${fileExt}`;
      const contentType = `image/${fileExt}`;

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: fileName,
        type: contentType,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, formData, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      if (!publicUrl) throw new Error('N�o foi poss�vel obter URL p�blica');

      const { error: updateError } = await supabase
        .from('estabelecimentos')
        .update({ logo_url: publicUrl })
        .eq('id', estabelecimentoId);

      if (updateError) throw updateError;

      setLogoUrl(publicUrl);
      Alert.alert('Sucesso', 'Logo atualizada!');
    } catch (error: any) {
      Alert.alert('Erro', `N�o foi poss�vel fazer upload: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const buscarCep = async (cepInput: string) => {
    const cepLimpo = cepInput.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        Alert.alert('CEP n�o encontrado', 'Verifique o CEP digitado');
        return;
      }

      setEndereco(data.logradouro || '');
      setBairro(data.bairro || '');
      setCidade(data.localidade || '');
      setEstado(data.uf || '');
    } catch (error) {
      Alert.alert('Erro', 'N�o foi poss�vel buscar o CEP');
    } finally {
      setLoadingCep(false);
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
                            throw new Error("N�o foi poss�vel extrair o nome do arquivo da URL.");
                        }
                        const fileName = fileNameMatch[1].split('?')[0];

                        const { error: removeError } = await supabase.storage.from('avatars').remove([fileName]);
                        if (removeError) throw removeError;

                        const { error: updateError } = await supabase.from('usuarios').update({ avatar_url: null, updated_at: new Date().toISOString() }).eq('id', session!.user.id);
                        if (updateError) throw updateError;

                        setAvatarUrl(null);
                        Alert.alert('Sucesso', 'Sua foto de perfil foi removida.');
                    } catch (error: any) {
                        Alert.alert('Erro', `N�o foi poss�vel remover a foto: ${error.message}`);
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

      // Se for principal e n�o tiver estabelecimento vinculado, cria um novo
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

      // Atualiza dados do usu�rio usando fun��o RPC (contorna RLS)
      const targetUserId = editandoOutroUsuario ? userId as string : session!.user.id;
      
      const { data: updateResult, error: userError } = await supabase.rpc('update_usuario_estabelecimento', {
        usuario_id: targetUserId,
        p_nome_completo: nome,
        p_telefone: celular.replace(/\D/g, '') || null,
        p_faz_atendimento: fazAtendimento
      });

      if (userError) throw userError;

      // Atualiza dados do estabelecimento se j� existir
      if (isPrincipal && estabelecimentoId) {
        const { error: estabError } = await supabase.from('estabelecimentos').update({
          nome: nomeEstabelecimento,
          tipo_documento: tipoDocumento,
          numero_documento: numeroDocumento.replace(/\D/g, ''),
          segmento,
          telefone: telefoneEstabelecimento.replace(/\D/g, '') || null,
          whatsapp: whatsappEstabelecimento.replace(/\D/g, '') || null,
          cep: cep.replace(/\D/g, '') || null,
          endereco: endereco || null,
          bairro: bairro || null,
          cidade: cidade || null,
          estado: estado || null,
          complemento: complemento || null,
          descricao: descricao || null,
          faixa_preco: faixaPreco || null,
          instagram: instagram || null,
          facebook: facebook || null,
          site: site || null,
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
        Alert.alert('Erro', 'As novas senhas n�o coincidem.');
        return;
    }
    if (novaSenha.length < 8) {
        Alert.alert('Erro', 'A nova senha deve ter no m�nimo 8 caracteres.');
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

  // Fun��es para gerenciar permiss�es
  const handleOpenPermissionsModal = async () => {
    if (!session?.user?.id) {
      Alert.alert('Erro', 'Usu�rio n�o autenticado.');
      return;
    }

    try {
      // Verificar se o usu�rio � admin
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (userError) throw userError;

      if (userData?.role !== 'admin') {
        Alert.alert('Acesso Negado', 'Voc� n�o tem permiss�o para acessar esta �rea.');
        return;
      }

      setIsUserAdmin(true);
      await carregarPermissoes();
      setModalPermissionsVisible(true);
    } catch (error: any) {
      logger.error('Erro ao verificar permiss�es:', error);
      Alert.alert('Erro', 'N�o foi poss�vel verificar as permiss�es do usu�rio.');
    }
  };

  const carregarPermissoes = async () => {
    if (!session?.user?.id) return;

    setLoadingPermissions(true);
    try {
      // Usar o ID do usu�rio que est� sendo editado, n�o o usu�rio logado
      const targetUserId = editandoOutroUsuario ? userId as string : session.user.id;
      
      // Buscar permiss�es do usu�rio correto
      const { data, error } = await supabase
        .from('permissoes_usuario')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Se n�o existir registro de permiss�es, criar com todas liberadas por padr�o
      if (!data) {
        const permissoesIniciais: {[key: string]: boolean} = {};
        PERMISSOES.forEach(p => {
          permissoesIniciais[p.key] = true;
        });
        setPermissoes(permissoesIniciais);
        await salvarPermissoes(permissoesIniciais);
      } else {
        // Converter as permiss�es do banco para o estado local
        const permissoesUsuario: {[key: string]: boolean} = {};
        PERMISSOES.forEach(p => {
          permissoesUsuario[p.key] = data[p.key] ?? true;
        });
        setPermissoes(permissoesUsuario);
      }
    } catch (error: any) {
      logger.error('Erro ao carregar permiss�es:', error);
      Alert.alert('Erro', 'N�o foi poss�vel carregar as permiss�es.');
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
      // Usar o ID do usu�rio que est� sendo editado, n�o o usu�rio logado
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

      Alert.alert('Sucesso', 'Permiss�es salvas com sucesso!');
      setModalPermissionsVisible(false);
      
      // Emitir evento para atualizar permiss�es em outros componentes
      DeviceEventEmitter.emit('permissoesAtualizadas');
    } catch (error: any) {
      logger.error('Erro ao salvar permiss�es:', error);
      Alert.alert('Erro', 'N�o foi poss�vel salvar as permiss�es.');
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
          color={colors.primary} 
          style={styles.permissionIcon} 
        />
        <Text style={styles.permissionLabel}>{item.label}</Text>
      </View>
      <View style={styles.checkboxContainer}>
        <Ionicons
          name={permissoes[item.key] ? "checkbox" : "square-outline"}
          size={24}
          color={permissoes[item.key] ? colors.primary : "#9CA3AF"}
        />
      </View>
    </TouchableOpacity>
  );

  // Criar estilos com as cores do tema
  const styles = createStyles({
    background: colors.background,
    surface: colors.surface,
    text: colors.text,
    textSecondary: colors.textSecondary,
    border: colors.border
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
                  <Ionicons name="person" size={40} color={colors.primary} />
                </View>
              )}
              <TouchableOpacity style={styles.editAvatarButton} onPress={handleUploadAvatar} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="camera" size={20} color={colors.white} />}
              </TouchableOpacity>
              {avatarUrl && (
                <TouchableOpacity style={styles.deleteAvatarButton} onPress={handleDeleteAvatar} disabled={saving}>
                  <Ionicons name="trash" size={20} color={colors.white} />
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
                <Switch trackColor={{ false: colors.border, true: colors.primary }} thumbColor={fazAtendimento ? colors.primaryContrast : colors.borderLight} value={fazAtendimento} onValueChange={setFazAtendimento} />
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

              {/* Logo do Estabelecimento */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Logo do Estabelecimento</Text>
                {logoUrl ? (
                  <View style={styles.logoPreview}>
                    <Image source={{ uri: logoUrl }} style={styles.logoImage} />
                    <TouchableOpacity style={styles.changeLogoButton} onPress={handleUploadLogo} disabled={saving}>
                      <Text style={styles.changeLogoText}>Alterar Logo</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.uploadButton} onPress={handleUploadLogo} disabled={saving}>
                    <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                    <Text style={styles.uploadButtonText}>Fazer Upload da Logo</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Contato */}
              <Text style={[styles.label, { marginTop: 20, marginBottom: 10, fontSize: 16, fontWeight: '600' }]}>
                ?? Contato
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Telefone</Text>
                <TextInput 
                  style={styles.input} 
                  value={telefoneEstabelecimento} 
                  onChangeText={(text) => setTelefoneEstabelecimento(formatarCelular(text))} 
                  keyboardType="phone-pad"
                  placeholder="(00) 0000-0000"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>WhatsApp</Text>
                <TextInput 
                  style={styles.input} 
                  value={whatsappEstabelecimento} 
                  onChangeText={(text) => setWhatsappEstabelecimento(formatarCelular(text))} 
                  keyboardType="phone-pad"
                  placeholder="(00) 00000-0000"
                />
              </View>

              {/* Endere�o */}
              <Text style={[styles.label, { marginTop: 20, marginBottom: 10, fontSize: 16, fontWeight: '600' }]}>
                ?? Localiza��o
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>CEP</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput 
                    style={[styles.input, { flex: 1 }]} 
                    value={cep} 
                    onChangeText={(text) => {
                      setCep(text);
                      if (text.replace(/\D/g, '').length === 8) {
                        buscarCep(text);
                      }
                    }} 
                    keyboardType="numeric"
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {loadingCep && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 10 }} />}
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Endere�o</Text>
                <TextInput 
                  style={styles.input} 
                  value={endereco} 
                  onChangeText={setEndereco}
                  placeholder="Rua, Av, n�mero"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Bairro</Text>
                <TextInput 
                  style={styles.input} 
                  value={bairro} 
                  onChangeText={setBairro}
                  placeholder="Nome do bairro"
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.inputContainer, { flex: 2 }]}>
                  <Text style={styles.label}>Cidade</Text>
                  <TextInput 
                    style={styles.input} 
                    value={cidade} 
                    onChangeText={setCidade}
                    placeholder="Cidade"
                  />
                </View>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={styles.label}>Estado</Text>
                  <TextInput 
                    style={styles.input} 
                    value={estado} 
                    onChangeText={(text) => setEstado(text.toUpperCase())}
                    placeholder="UF"
                    maxLength={2}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Complemento (opcional)</Text>
                <TextInput 
                  style={styles.input} 
                  value={complemento} 
                  onChangeText={setComplemento}
                  placeholder="Sala, andar, etc"
                />
              </View>

              {/* SEO */}
              <Text style={[styles.label, { marginTop: 20, marginBottom: 10, fontSize: 16, fontWeight: '600' }]}>
                ??? Informa��es para Buscadores (Google)
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Descri��o do Estabelecimento</Text>
                <TextInput 
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                  value={descricao} 
                  onChangeText={setDescricao}
                  placeholder="Breve descri��o do seu neg�cio (aparece no Google)"
                  multiline
                  numberOfLines={4}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Faixa de Pre�o</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={faixaPreco} onValueChange={(itemValue) => setFaixaPreco(itemValue)}>
                    <Picker.Item label="Selecione" value="" />
                    <Picker.Item label="$ (Econ�mico)" value="$" />
                    <Picker.Item label="$$ (Moderado)" value="$$" />
                    <Picker.Item label="$$$ (Alto)" value="$$$" />
                    <Picker.Item label="$$$$ (Premium)" value="$$$$" />
                  </Picker>
                </View>
              </View>

              {/* Redes Sociais */}
              <Text style={[styles.label, { marginTop: 20, marginBottom: 10, fontSize: 16, fontWeight: '600' }]}>
                ?? Redes Sociais (opcional)
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Instagram</Text>
                <TextInput 
                  style={styles.input} 
                  value={instagram} 
                  onChangeText={setInstagram}
                  placeholder="@seu_perfil"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Facebook</Text>
                <TextInput 
                  style={styles.input} 
                  value={facebook} 
                  onChangeText={setFacebook}
                  placeholder="facebook.com/suapagina"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Site</Text>
                <TextInput 
                  style={styles.input} 
                  value={site} 
                  onChangeText={setSite}
                  placeholder="https://seusite.com.br"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              {/* Nota sobre hor�rios */}
              <View style={{ 
                backgroundColor: '#EEF2FF', 
                padding: 12, 
                borderRadius: 8, 
                marginTop: 16,
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Ionicons name="information-circle" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 13, color: '#4338CA', flex: 1 }}>
                  Hor�rios de funcionamento: configure na tela de Agenda
                </Text>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alterar Senha</Text>
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Nova Senha</Text>
                <TextInput style={styles.input} value={novaSenha} onChangeText={setNovaSenha} secureTextEntry={!showNovaSenha} placeholder="M�nimo 8 caracteres"/>
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
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveButtonText}>Salvar Altera��es</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de Permiss�es */}
      <Modal
        visible={modalPermissionsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editandoOutroUsuario ? `Permiss�es - ${nome}` : 'Permiss�es de Acesso'}
            </Text>
            <TouchableOpacity
              onPress={() => setModalPermissionsVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loadingPermissions ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Carregando permiss�es...</Text>
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
                  <Text style={styles.modalSaveText}>Salvar Altera��es</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

// Fun��o auxiliar para criar estilos din�micos
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
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
    backgroundColor: colors.error,
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
    color: colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  inputDisabled: {
    backgroundColor: colors.background,
    color: colors.textSecondary,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  mainSaveButton: {
    backgroundColor: colors.primary,
    padding: 16,
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos do Modal de Permiss�es
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
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
    color: colors.textSecondary,
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
    color: colors.text,
    flex: 1,
  },
  checkboxContainer: {
    padding: 4,
  },
  separator: {
    height: 1,
    backgroundColor: colors.background,
    marginHorizontal: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoPreview: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
  },
  changeLogoButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  changeLogoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});

