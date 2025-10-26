import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BeforeInstallPromptEvent extends Event {
  platforms: string[];
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

export function PWAInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Detectar se já está em modo standalone (já instalado)
    const standalone = (window.navigator as any).standalone || 
                      window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Verificar se já foi dismissado pelo usuário
    checkIfDismissed();

    // Listener para Android install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Para iOS, mostrar banner se não estiver instalado
    if (iOS && !standalone) {
      setTimeout(() => {
        checkIfDismissed().then((dismissed) => {
          if (!dismissed) {
            setShowBanner(true);
          }
        });
      }, 3000); // Mostrar após 3 segundos
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const checkIfDismissed = async () => {
    try {
      const dismissed = await AsyncStorage.getItem('@pwa_install_dismissed');
      return dismissed === 'true';
    } catch {
      return false;
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android - usar prompt nativo
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      
      if (result.outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      // iOS - não fechar banner, apenas mostrar instruções
      return;
    }
  };

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem('@pwa_install_dismissed', 'true');
      setShowBanner(false);
    } catch (error) {
      console.error('Erro ao salvar dismiss state:', error);
      setShowBanner(false);
    }
  };

  if (!showBanner || isStandalone || Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="download-outline" size={24} color="#8B5CF6" />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {isIOS ? 'Adicionar à Tela Inicial' : 'Instalar BusinessApp'}
          </Text>
          <Text style={styles.description}>
            {isIOS 
              ? 'Toque em ⎋ abaixo e depois "Adicionar à Tela de Início"'
              : 'Obtenha acesso rápido e experiência melhorada'
            }
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          {!isIOS && (
            <TouchableOpacity
              style={styles.installButton}
              onPress={handleInstallClick}
            >
              <Text style={styles.installButtonText}>Instalar</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
          >
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  installButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  installButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 8,
  },
});