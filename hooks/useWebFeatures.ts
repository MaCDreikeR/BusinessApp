import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useWebFeatures = () => {
  const isWeb = Platform.OS === 'web';

  // Hook para storage unificado (AsyncStorage mobile / localStorage web)
  const getStorageItem = async (key: string): Promise<string | null> => {
    if (isWeb && typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  };

  const setStorageItem = async (key: string, value: string): Promise<void> => {
    if (isWeb && typeof window !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
    return AsyncStorage.setItem(key, value);
  };

  const removeStorageItem = async (key: string): Promise<void> => {
    if (isWeb && typeof window !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
    return AsyncStorage.removeItem(key);
  };

  // Hook para notificações web
  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!isWeb || typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const showWebNotification = (title: string, options?: NotificationOptions) => {
    if (!isWeb || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      return new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...options,
      });
    }
  };

  // Hook para detectar se está instalado como PWA
  const isPWAInstalled = (): boolean => {
    if (!isWeb || typeof window === 'undefined') {
      return false;
    }

    return (window.navigator as any).standalone || 
           window.matchMedia('(display-mode: standalone)').matches;
  };

  // Hook para compartilhamento web
  const shareContent = async (shareData: {
    title?: string;
    text?: string;
    url?: string;
  }): Promise<boolean> => {
    if (!isWeb || typeof window === 'undefined') {
      return false;
    }

    if ('share' in navigator) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (error) {
        console.error('Erro ao compartilhar:', error);
        return false;
      }
    }

    // Fallback: copiar para clipboard
    if ('clipboard' in navigator && shareData.url) {
      try {
        await navigator.clipboard.writeText(shareData.url);
        return true;
      } catch (error) {
        console.error('Erro ao copiar para clipboard:', error);
        return false;
      }
    }

    return false;
  };

  return {
    isWeb,
    getStorageItem,
    setStorageItem,
    removeStorageItem,
    requestNotificationPermission,
    showWebNotification,
    isPWAInstalled,
    shareContent,
  };
};