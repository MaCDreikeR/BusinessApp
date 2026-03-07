import React, { useRef, useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { logger } from '../../utils/logger';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  validarCPF, 
  validarCNPJ, 
  validarTelefone as validarCelular,
  validarEmail,
  formatarCPF, 
  formatarCNPJ, 
  formatarTelefone as formatarCelular 
} from '../../utils/validators';
import { Button } from '../../components/Button';

const segmentos = [
  { label: 'Varejo', value: 'varejo' },
  { label: 'ServiÃ§os', value: 'servicos' },
  { label: 'AlimentaÃ§Ã£o', value: 'alimentacao' },
  { label: 'Beleza e EstÃ©tica', value: 'beleza' },
  { label: 'SaÃºde', value: 'saude' },
  { label: 'Outros', value: 'outros' },
];

type FieldErrorKey =
  | 'nomeEstabelecimento'
  | 'numeroDocumento'
  | 'telefone'
  | 'segmento'
  | 'nomeCompleto'
  | 'email'
  | 'senha'
  | 'confirmarSenha'
  | 'aceitaTermos';

type FieldErrors = Partial<Record<FieldErrorKey, string>>;

export default function CadastroScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const numeroDocumentoRef = useRef<TextInput>(null);
  const telefoneRef = useRef<TextInput>(null);
  const nomeCompletoRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const senhaRef = useRef<TextInput>(null);
  const confirmarSenhaRef = useRef<TextInput>(null);

  const [nomeEstabelecimento, setNomeEstabelecimento] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('CPF');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [segmento, setSegmento] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [aceitaTutorial, setAceitaTutorial] = useState(false);
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('error');

  const capitalizarPrimeiraLetraPalavras = (texto: string) => {
    return texto
      .split(/(\s+)/)
      .map(parte => {
        if (!parte || /^\s+$/.test(parte)) return parte;
        return parte.charAt(0).toUpperCase() + parte.slice(1);
      })
      .join('');
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
    setToastType(type);
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage('');
    }, 3200);
  };

  const setFieldError = (field: FieldErrorKey, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearFieldError = (field: FieldErrorKey) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const shouldRetrySignUp = (message?: string) => {
    if (!message) return false;
    return /rate limit|too many requests|network|timeout|temporar|fetch/i.test(message);
  };

  const signUpWithRetry = async (emailNormalizado: string, senhaUsuario: string, nomeUsuario: string) => {
    let lastResult: Awaited<ReturnType<typeof supabase.auth.signUp>> | null = null;

    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      const result = await supabase.auth.signUp({
        email: emailNormalizado,
        password: senhaUsuario,
        options: {
          data: {
            nome: nomeUsuario,
          },
        },
      });

      lastResult = result;

      if (!result.error) {
        return result;
      }

      if (!shouldRetrySignUp(result.error.message) || tentativa === 3) {
        return result;
      }

      const backoffMs = 400 * Math.pow(2, tentativa - 1);
      logger.warn('SignUp com erro temporÃ¡rio, tentando novamente...', {
        tentativa,
        backoffMs,
        mensagem: result.error.message,
      });
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }

    return lastResult as Awaited<ReturnType<typeof supabase.auth.signUp>>;
  };

  const validateForm = () => {
    const errors: FieldErrors = {};
    const emailNormalizado = email.trim().toLowerCase();

    if (!nomeEstabelecimento.trim()) errors.nomeEstabelecimento = 'Informe o nome do estabelecimento';
    if (!numeroDocumento.trim()) errors.numeroDocumento = `Informe o ${tipoDocumento}`;
    if (!telefone.trim()) errors.telefone = 'Informe o celular com WhatsApp';
    if (!segmento) errors.segmento = 'Selecione o segmento';
    if (!nomeCompleto.trim()) errors.nomeCompleto = 'Informe o nome completo';
    if (!emailNormalizado) errors.email = 'Informe o e-mail';
    if (!senha) errors.senha = 'Informe a senha';
    if (!confirmarSenha) errors.confirmarSenha = 'Confirme a senha';

    if (emailNormalizado && !validarEmail(emailNormalizado)) {
      errors.email = 'Email invÃ¡lido. Verifique o formato e tente novamente.';
    }

    if (tipoDocumento === 'CPF' && numeroDocumento && !validarCPF(numeroDocumento)) {
      errors.numeroDocumento = 'CPF invÃ¡lido';
    }

    if (tipoDocumento === 'CNPJ' && numeroDocumento && !validarCNPJ(numeroDocumento)) {
      errors.numeroDocumento = 'CNPJ invÃ¡lido';
    }

    if (telefone && !validarCelular(telefone)) {
      errors.telefone = 'Celular invÃ¡lido';
    }

    if (senha && senha.length < 8) {
      errors.senha = 'A senha deve ter no mÃ­nimo 8 caracteres';
    }

    if (senha && confirmarSenha && senha !== confirmarSenha) {
      errors.confirmarSenha = 'As senhas nÃ£o coincidem';
    }

    if (!aceitaTermos) {
      errors.aceitaTermos = 'VocÃª precisa aceitar os Termos de Uso e PolÃ­tica de Privacidade';
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      showToast('Revise os campos obrigatÃ³rios para continuar.', 'error');
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    try {
      const emailNormalizado = email.trim().toLowerCase();

      if (!validateForm()) {
        return;
      }

      setSaving(true);

      const { data: emailJaExiste, error: emailJaExisteError } = await supabase.rpc('email_ja_cadastrado', {
        p_email: emailNormalizado,
      });

      if (!emailJaExisteError && emailJaExiste === true) {
        setFieldError('email', 'Este email jÃ¡ estÃ¡ cadastrado');
        showToast('Este email jÃ¡ estÃ¡ cadastrado. Tente fazer login ou recuperar a senha.', 'warning');
        return;
      }

      if (emailJaExisteError) {
        logger.warn('NÃ£o foi possÃ­vel validar duplicidade de email antes do signUp:', emailJaExisteError);
      }

      // Criar usuÃ¡rio no Auth com retry inteligente para erros transitÃ³rios
      const { data: authData, error: authError } = await signUpWithRetry(
        emailNormalizado,
        senha,
        nomeCompleto
      );

      if (authError) {
        logger.error('Erro no cadastro:', authError);
        
        // Mensagens de erro mais especÃ­ficas
        let mensagemErro = 'NÃ£o foi possÃ­vel criar o usuÃ¡rio. Tente novamente.';
        
        if (authError.message?.includes('Email') || authError.message?.includes('email')) {
          mensagemErro = 'Email invÃ¡lido. Verifique o formato (ex: usuario@email.com) e tente novamente.';
        } else if (authError.message?.includes('already')) {
          mensagemErro = 'Este email jÃ¡ estÃ¡ cadastrado. Tente fazer login ou use outro email.';
        } else if (authError.message?.includes('password')) {
          mensagemErro = 'Senha fraca. Use pelo menos 6 caracteres com letras e nÃºmeros.';
        }
        
        setFieldError('email', mensagemErro.toLowerCase().includes('email') ? mensagemErro : '');
        showToast(mensagemErro, 'error');
        return;
      }

      if (!authData.user) {
        showToast('UsuÃ¡rio nÃ£o foi criado corretamente.', 'error');
        return;
      }

      if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
        setFieldError('email', 'Este email jÃ¡ estÃ¡ cadastrado');
        showToast('Este email jÃ¡ estÃ¡ cadastrado. Tente fazer login ou recuperar a senha.', 'warning');
        return;
      }

      const userId = authData.user.id;
      let authUserExiste = false;
      for (let tentativa = 1; tentativa <= 20; tentativa++) {
        const { data: authExiste, error: authExisteError } = await supabase.rpc('auth_user_exists', {
          p_user_id: userId,
        });

        if (!authExisteError && authExiste === true) {
          authUserExiste = true;
          break;
        }

        if (authExisteError) {
          logger.warn('Erro ao checar auth_user_exists:', {
            tentativa,
            userId,
            authExisteError,
          });
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!authUserExiste) {
        logger.error('UsuÃ¡rio Auth ainda nÃ£o disponÃ­vel para FK:', { userId });
        showToast('Conta criada, mas ainda sincronizando. Aguarde alguns segundos e tente novamente.', 'warning');
        return;
      }

      // Usar RPC com SECURITY DEFINER (evita RLS)
      const { error: contaError } = await supabase.rpc('criar_nova_conta', {
        p_nome_estabelecimento: nomeEstabelecimento,
        p_tipo_documento: tipoDocumento,
        p_numero_documento: numeroDocumento,
        p_telefone: telefone,
        p_segmento: segmento || null,
        p_nome_usuario: nomeCompleto,
        p_email: emailNormalizado,
        p_usuario_id: userId
      });

      if (contaError) {
        logger.error('Erro ao criar conta:', contaError);
        
        // ============================================================
        // CLEANUP: Tentar remover usuÃ¡rio Ã³rfÃ£o de auth.users
        // Se a RPC falhou, nÃ£o queremos deixar um usuÃ¡rio sem dados
        // ============================================================
        try {
          const { error: cleanError } = await supabase.rpc('limpar_usuario_orfao', {
            p_user_id: userId,
          });
          
          if (!cleanError) {
            logger.info('âœ… UsuÃ¡rio Ã³rfÃ£o removido de auth.users apÃ³s falha na RPC');
          } else {
            logger.warn('NÃ£o foi possÃ­vel remover usuÃ¡rio Ã³rfÃ£o:', cleanError);
          }
        } catch (cleanupError) {
          logger.warn('Erro ao tentar fazer cleanup de usuÃ¡rio Ã³rfÃ£o:', cleanupError);
        }
        
        showToast('NÃ£o foi possÃ­vel criar a conta. Tente novamente.', 'error');
        return;
      }

      // VerificaÃ§Ã£o pÃ³s-RPC (best effort): em alguns cenÃ¡rios de confirmaÃ§Ã£o de e-mail,
      // a sessÃ£o pode estar nula e a leitura direta pode retornar falso-negativo por RLS.
      // NÃ£o deve bloquear o sucesso quando a RPC jÃ¡ concluiu sem erro.
      const { data: usuarioCriado, error: usuarioVerificacaoError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (usuarioVerificacaoError || !usuarioCriado) {
        logger.warn('VerificaÃ§Ã£o pÃ³s-RPC inconclusiva (nÃ£o bloqueante):', {
          usuarioVerificacaoError,
          userId,
          usuarioCriado: !!usuarioCriado,
        });
      }

      showToast('Cadastro realizado com sucesso! Verifique seu e-mail para ativar a conta.', 'success');
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 1200);
    } catch (error) {
      logger.error('Erro no cadastro:', error);
      showToast('Ocorreu um erro durante o cadastro. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.gradient}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View 
              entering={FadeInDown.duration(1000).springify()}
              style={styles.header}
            >
          <Text style={styles.title}>Cadastre seu Estabelecimento</Text>
          <Text style={styles.subtitle}>Comece sua jornada com o AppBusiness</Text>
            </Animated.View>

          <Animated.View 
            entering={FadeInUp.duration(1000).springify()}
            style={[styles.form, { backgroundColor: colors.surface }]}
          >
        {toastMessage ? (
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.toastContainer,
              {
                backgroundColor:
                  toastType === 'success'
                    ? colors.success
                    : toastType === 'warning'
                      ? colors.warning
                      : colors.error,
              },
            ]}
          >
            <Ionicons
              name={toastType === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
              size={16}
              color="#fff"
            />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        ) : null}

        <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Dados do Estabelecimento</Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Nome do Estabelecimento*</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.borderLight, color: colors.text }, fieldErrors.nomeEstabelecimento && { borderColor: colors.error }]}
              placeholder="Nome da sua empresa"
              value={nomeEstabelecimento}
              onChangeText={(text) => {
                setNomeEstabelecimento(capitalizarPrimeiraLetraPalavras(text));
                clearFieldError('nomeEstabelecimento');
              }}
              autoCapitalize={Platform.OS === 'android' ? 'characters' : 'words'}
              keyboardType="default"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={() => numeroDocumentoRef.current?.focus()}
              accessibilityLabel="Nome do estabelecimento"
              accessibilityHint="Digite o nome da empresa"
                />
              {fieldErrors.nomeEstabelecimento ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{fieldErrors.nomeEstabelecimento}</Text>
              ) : null}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Tipo de Documento*</Text>
                <Dropdown
                  style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.borderLight }]}
                  placeholderStyle={[styles.placeholderStyle, { color: colors.textTertiary }]}
                  selectedTextStyle={[styles.selectedTextStyle, { color: colors.text }]}
                  data={[
                    { label: 'CPF', value: 'CPF' },
                    { label: 'CNPJ', value: 'CNPJ' }
                  ]}
                  maxHeight={300}
                  labelField="label"
                  valueField="value"
                  placeholder="Selecione o tipo de documento"
                  value={tipoDocumento}
                  onChange={item => {
                    setTipoDocumento(item.value);
                    setNumeroDocumento('');
                  }}
                  renderRightIcon={() => (
                    <Ionicons name="chevron-down" size={20} color={colors.textTertiary} />
                  )}
            />
          </View>

          <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>{tipoDocumento}*</Text>
            <TextInput
              ref={numeroDocumentoRef}
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.borderLight, color: colors.text }, fieldErrors.numeroDocumento && { borderColor: colors.error }]}
                  placeholder={tipoDocumento === 'CPF' ? "000.000.000-00" : "00.000.000/0000-00"}
                  value={numeroDocumento}
                  onChangeText={(text) => {
                    const formatted = tipoDocumento === 'CPF' ? formatarCPF(text) : formatarCNPJ(text);
                    setNumeroDocumento(formatted);
                    clearFieldError('numeroDocumento');
                  }}
              keyboardType="numeric"
                  maxLength={tipoDocumento === 'CPF' ? 14 : 18}
                  placeholderTextColor={colors.textTertiary}
                  returnKeyType="next"
                  onSubmitEditing={() => telefoneRef.current?.focus()}
                  accessibilityLabel={`Campo de ${tipoDocumento}`}
            />
            {fieldErrors.numeroDocumento ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{fieldErrors.numeroDocumento}</Text>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Celular (Com Whatsapp)*</Text>
            <TextInput
              ref={telefoneRef}
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.borderLight, color: colors.text }, fieldErrors.telefone && { borderColor: colors.error }]}
              placeholder="(00) 0 0000-0000"
              value={telefone}
                  onChangeText={(text) => {
                    const formatted = formatarCelular(text);
                    setTelefone(formatted);
                    clearFieldError('telefone');
                  }}
              keyboardType="phone-pad"
                  maxLength={15}
                  placeholderTextColor={colors.textTertiary}
                  returnKeyType="next"
                  onSubmitEditing={() => nomeCompletoRef.current?.focus()}
                  accessibilityLabel="Celular com WhatsApp"
            />
            {fieldErrors.telefone ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{fieldErrors.telefone}</Text>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Segmento*</Text>
            <Dropdown
              style={[styles.dropdown, { backgroundColor: colors.background, borderColor: fieldErrors.segmento ? colors.error : colors.borderLight }]}
              placeholderStyle={[styles.placeholderStyle, { color: colors.textTertiary }]}
              selectedTextStyle={[styles.selectedTextStyle, { color: colors.text }]}
              data={segmentos}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Selecione o segmento"
              value={segmento}
              onChange={item => {
                setSegmento(item.value);
                clearFieldError('segmento');
              }}
              renderRightIcon={() => (
                <Ionicons name="chevron-down" size={20} color={colors.textTertiary} />
              )}
            />
            {fieldErrors.segmento ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{fieldErrors.segmento}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Dados do ResponsÃ¡vel</Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Nome Completo*</Text>
            <TextInput
              ref={nomeCompletoRef}
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.borderLight, color: colors.text }, fieldErrors.nomeCompleto && { borderColor: colors.error }]}
              placeholder="Seu nome completo"
              value={nomeCompleto}
              onChangeText={(text) => {
                setNomeCompleto(capitalizarPrimeiraLetraPalavras(text));
                clearFieldError('nomeCompleto');
              }}
                autoCapitalize={Platform.OS === 'android' ? 'characters' : 'words'}
                keyboardType="default"
                placeholderTextColor={colors.textTertiary}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                accessibilityLabel="Nome completo do responsÃ¡vel"
            />
            {fieldErrors.nomeCompleto ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{fieldErrors.nomeCompleto}</Text>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>E-mail*</Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                ref={emailRef}
                style={[styles.input, { flex: 1, paddingRight: 40, backgroundColor: colors.background, borderColor: colors.borderLight, color: colors.text }, fieldErrors.email && { borderColor: colors.error }]}
                placeholder="seu@email.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  clearFieldError('email');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textTertiary}
                returnKeyType="next"
                onSubmitEditing={() => senhaRef.current?.focus()}
                autoCorrect={false}
                accessibilityLabel="E-mail"
              />
              {email && (
                <Ionicons 
                  name={validarEmail(email) ? "checkmark-circle" : "close-circle"} 
                  size={20} 
                  color={validarEmail(email) ? "#10B981" : "#EF4444"}
                  style={styles.inputIcon}
                />
              )}
            </View>
            {(fieldErrors.email || (email && !validarEmail(email.trim().toLowerCase()))) && (
              <Text style={[styles.errorText, { color: colors.error }]}>{fieldErrors.email || 'Email invÃ¡lido'}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Senha*</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                ref={senhaRef}
                style={[styles.input, styles.passwordInput, { backgroundColor: colors.background, borderColor: colors.borderLight, color: colors.text }, fieldErrors.senha && { borderColor: colors.error }]}
                placeholder="MÃ­nimo 8 caracteres"
                value={senha}
                onChangeText={(text) => {
                  setSenha(text);
                  clearFieldError('senha');
                }}
                autoCapitalize="none"
                keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
                secureTextEntry={!showPassword}
                placeholderTextColor={colors.textTertiary}
                returnKeyType="next"
                onSubmitEditing={() => confirmarSenhaRef.current?.focus()}
                accessibilityLabel="Senha"
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={24} 
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
            {fieldErrors.senha ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{fieldErrors.senha}</Text>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Confirmar Senha*</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                ref={confirmarSenhaRef}
                style={[styles.input, styles.passwordInput, { backgroundColor: colors.background, borderColor: colors.borderLight, color: colors.text }, fieldErrors.confirmarSenha && { borderColor: colors.error }]}
                placeholder="Digite a senha novamente"
                value={confirmarSenha}
                onChangeText={(text) => {
                  setConfirmarSenha(text);
                  clearFieldError('confirmarSenha');
                }}
                autoCapitalize="none"
                keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
                secureTextEntry={!showConfirmPassword}
                placeholderTextColor={colors.textTertiary}
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
                accessibilityLabel="Confirmar senha"
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? 'Ocultar confirmaÃ§Ã£o de senha' : 'Mostrar confirmaÃ§Ã£o de senha'}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                  size={24} 
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
            {fieldErrors.confirmarSenha ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{fieldErrors.confirmarSenha}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity 
                style={[
                  styles.checkbox,
                  { borderColor: '#D1D5DB' },
                  aceitaTutorial && [styles.checkboxChecked, { backgroundColor: colors.primary, borderColor: colors.primary }],
                ]}
            onPress={() => setAceitaTutorial(!aceitaTutorial)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: aceitaTutorial }}
            accessibilityLabel="Receber tutorial no WhatsApp"
          >
                {aceitaTutorial && <Ionicons name="checkmark" size={16} color="#fff" />}
          </TouchableOpacity>
          <Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>
            Desejo receber um tutorial via WhatsApp sobre como utilizar o sistema
          </Text>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity 
                style={[
                  styles.checkbox,
                  { borderColor: fieldErrors.aceitaTermos ? colors.error : '#D1D5DB' },
                  aceitaTermos && [styles.checkboxChecked, { backgroundColor: colors.primary, borderColor: colors.primary }],
                ]}
            onPress={() => {
              setAceitaTermos(!aceitaTermos);
              clearFieldError('aceitaTermos');
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: aceitaTermos }}
            accessibilityLabel="Aceitar termos de uso e polÃ­tica de privacidade"
          >
                {aceitaTermos && <Ionicons name="checkmark" size={16} color="#fff" />}
          </TouchableOpacity>
          <Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>
            Li e aceito os{' '}
            <Text style={[styles.link, { color: colors.link }]}>Termos de Uso</Text> e a{' '}
            <Text style={[styles.link, { color: colors.link }]}>PolÃ­tica de Privacidade</Text>
          </Text>
        </View>
        {fieldErrors.aceitaTermos ? (
          <Text style={[styles.errorText, { color: colors.error, marginBottom: 12 }]}>{fieldErrors.aceitaTermos}</Text>
        ) : null}

        <Button
          variant="primary"
          size="large"
          onPress={handleSignUp}
          disabled={saving}
          loading={saving}
          fullWidth
          style={{ marginBottom: 16 }}
        >
          Criar Conta
        </Button>

        <View style={styles.loginContainer}>
          <Text style={[styles.loginText, { color: colors.textSecondary }]}>JÃ¡ tem uma conta? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ir para login">
              <Text style={[styles.loginLink, { color: colors.link }]}>Fazer login</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <TouchableOpacity style={styles.trialButton}>
          <Text style={[styles.trialText, { color: colors.successDark }]}>FaÃ§a o teste grÃ¡tis por 7 dias!</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.supportButton}>
          <Ionicons name="logo-whatsapp" size={20} color={colors.link} />
          <Text style={[styles.supportText, { color: colors.link }]}>Falar com o Suporte</Text>
        </TouchableOpacity>
            </Animated.View>
      </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textOnPrimarySecondary,
    textAlign: 'center',
  },
  form: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.background,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  inputWithIcon: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    right: 12,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  dropdown: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
  },
  placeholderStyle: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  selectedTextStyle: {
    fontSize: 16,
    color: colors.text,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    textDecorationLine: 'underline',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '500',
  },
  trialButton: {
    marginBottom: 16,
  },
  trialText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  supportText: {
    color: colors.info,
    fontSize: 14,
    fontWeight: '500',
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  toastText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
}); 

