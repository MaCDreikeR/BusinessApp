import { View, Text, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, ScrollView, DeviceEventEmitter, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../../utils/logger';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../../components/Button';

const { width, height } = Dimensions.get('window');

export default function BoasVindas() {
  const router = useRouter();
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  
  const styles = useMemo(() => createStyles(colors), [colors]);

  const irParaLogin = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await AsyncStorage.setItem('@hasSeenWelcome', 'true');
      DeviceEventEmitter.emit('welcomeCompleted');
      router.replace('/(auth)/login');
    } catch (error) {
      logger.error('Erro ao salvar estado de boas-vindas:', error);
      router.replace('/(auth)/login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="light" />
      
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            entering={FadeInDown.duration(1000).springify()}
            style={styles.header}
          >
            <Text style={styles.title}>BusinessApp</Text>
            <Text style={styles.subtitle}>
              Todo o seu negócio na palma da mão. Controle de estoque, agendamento de serviços, cadastro de clientes, venda de produtos e muito mais!
            </Text>
          </Animated.View>

          <Animated.View 
            entering={FadeInUp.duration(1000).springify()}
            style={[styles.content, { backgroundColor: colors.surface }]}
          >
            <View style={styles.imageContainer}>
              <Image 
                source={require('../../assets/images/icon.png')}
                style={styles.welcomeImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.cardsContainer}>
              <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
                <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Agenda Inteligente</Text>
                  <Text style={[styles.cardText, { color: colors.textSecondary }]}>
                    Organize seus horários de forma eficiente e evite conflitos
                  </Text>
                </View>
              </View>

              <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
                <Ionicons name="people-outline" size={24} color={colors.primary} />
                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Gestão de Clientes</Text>
                  <Text style={[styles.cardText, { color: colors.textSecondary }]}>
                    Cadastre e acompanhe o histórico de seus clientes
                  </Text>
                </View>
              </View>

              <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
                <Ionicons name="cash-outline" size={24} color={colors.primary} />
                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Controle Financeiro</Text>
                  <Text style={[styles.cardText, { color: colors.textSecondary }]}>
                    Acompanhe suas receitas e despesas em tempo real
                  </Text>
                </View>
              </View>
            </View>

            <Button
              variant="primary"
              size="large"
              onPress={irParaLogin}
              loading={isLoading}
              icon="arrow-forward"
              fullWidth
              style={{ marginTop: 8 }}
            >
              Começar Agora
            </Button>
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: height * 0.06,
    marginBottom: height * 0.02,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: Math.min(width * 0.1, 42),
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Math.min(width * 0.04, 16),
    color: colors.textOnPrimarySecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    paddingTop: 24,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imageContainer: {
    width: width * 0.4,
    height: width * 0.4,
    alignSelf: 'center',
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeImage: {
    width: '60%',
    height: '60%',
  },
  cardsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHighlight,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});