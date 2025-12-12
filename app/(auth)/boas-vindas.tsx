import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { logger } from '../../utils/logger';
import { theme } from '@utils/theme';

const { width, height } = Dimensions.get('window');

export default function BoasVindas() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const irParaLogin = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await AsyncStorage.setItem('@hasSeenWelcome', 'true');
      // Use o caminho absoluto com o grupo para evitar conflitos com o guardião do layout
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
        colors={[theme.colors.primary, theme.colors.primaryDark]}
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
            <Text style={styles.title}>AppBusiness</Text>
            <Text style={styles.subtitle}>
              Todo o seu negócio na palma da mão, Controle de estoque, agendamento de serviços, cadastro de clientes, venda de produtos e muito mais!
            </Text>
          </Animated.View>

          <Animated.View 
            entering={FadeInUp.duration(1000).springify()}
            style={styles.content}
          >
            <LottieView
              source={require('../../assets/animations/welcome.json')}
              style={styles.lottieAnimation}
              autoPlay
              loop
            />

            <View style={styles.cardsContainer}>
              <View style={styles.card}>
                <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>Agenda Inteligente</Text>
                  <Text style={styles.cardText}>
                    Organize seus horários de forma eficiente e evite conflitos
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <Ionicons name="people-outline" size={24} color={theme.colors.primary} />
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>Gestão de Clientes</Text>
                  <Text style={styles.cardText}>
                    Cadastre e acompanhe o histórico de seus clientes
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <Ionicons name="cash-outline" size={24} color={theme.colors.primary} />
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>Controle Financeiro</Text>
                  <Text style={styles.cardText}>
                    Acompanhe suas receitas e despesas em tempo real
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={irParaLogin}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Começar Agora</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Math.min(width * 0.04, 16),
    color: '#E9D5FF',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    paddingTop: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mockupImage: {
    width: width * 0.85,
    height: height * 0.25,
    marginBottom: 20,
    alignSelf: 'center',
  },
  gifImage: {
    width: width * 0.85,
    height: height * 0.3,
    marginBottom: 20,
    alignSelf: 'center',
  },
  lottieAnimation: {
    width: width * 0.85,
    height: height * 0.3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  videoContainer: {
    width: width * 0.9,
    height: width * 0.6,
    marginBottom: height * 0.03,
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  cardsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
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
    color: '#1A1A1A',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
}); 