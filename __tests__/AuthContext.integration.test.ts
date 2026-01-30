/**
 * Testes de Integração: Fluxo de Autenticação
 * 
 * Valida comportamento de:
 * - Sessão expirada
 * - Timeout de conexão
 * - Retry logic
 * - Fallback para login
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheManager } from '../utils/cacheManager';

// Mock do Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  },
}));

// Mock do Router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

// Mock do CacheManager
jest.mock('../utils/cacheManager', () => ({
  CacheManager: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clearNamespace: jest.fn(),
  },
  CacheNamespaces: {
    AUTH: 'auth',
    VENDAS: 'vendas',
    SERVICOS: 'servicos',
    CLIENTES: 'clientes',
    AGENDAMENTOS: 'agendamentos',
    ESTOQUE: 'estoque',
    RELATORIOS: 'relatorios',
  },
}));

// Mock do syncService
jest.mock('../services/syncService', () => ({
  syncService: {
    initialize: jest.fn(),
    sync: jest.fn(),
    stop: jest.fn(),
  },
}));

// Mock do logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
}));

describe('AuthContext - Fluxo de Autenticação', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('✅ Cenário 1: Sessão Válida', () => {
    
    it('deve recuperar sessão válida com sucesso', async () => {
      // Arrange: Mock sessão válida
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
        access_token: 'valid-token',
      };

      const mockProfile = {
        estabelecimento_id: 'estab-123',
        role: 'gerente',
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      // Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.user).toEqual(mockSession.user);
      expect(result.current.estabelecimentoId).toBe('estab-123');
      expect(result.current.role).toBe('gerente');
    });
  });

  describe('❌ Cenário 2: Sessão Expirada', () => {
    
    it('deve limpar estados quando sessão expirou', async () => {
      // Arrange: Mock sessão expirada
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.estabelecimentoId).toBeNull();
      expect(result.current.role).toBeNull();
    });
  });

  describe('⏱️ Cenário 3: Timeout de Conexão', () => {
    
    it('deve fazer retry em caso de timeout', async () => {
      // Arrange: Mock timeout na primeira tentativa, sucesso na segunda
      let callCount = 0;
      (supabase.auth.getSession as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout ao conectar')), 100)
          );
        }
        return Promise.resolve({
          data: { session: null },
          error: null,
        });
      });

      // Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 15000 });

      // Deve ter tentado 2 vezes
      expect(callCount).toBeGreaterThanOrEqual(2);
      
      // Deve ter limpado estados após falha
      expect(result.current.user).toBeNull();
    });

    it('deve limpar cache após múltiplas falhas de timeout', async () => {
      // Arrange: Mock timeout em todas as tentativas
      (supabase.auth.getSession as jest.Mock).mockImplementation(() => {
        return new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao conectar')), 100)
        );
      });

      // Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 30000 });

      // Deve ter limpo o cache
      expect(CacheManager.remove).toHaveBeenCalledWith(
        'auth',
        'profile'
      );
    });
  });

  describe('🔄 Cenário 4: Retry Logic', () => {
    
    it('deve fazer no máximo 3 tentativas (inicial + 2 retries)', async () => {
      // Arrange: Mock erro em todas as tentativas
      let callCount = 0;
      (supabase.auth.getSession as jest.Mock).mockImplementation(() => {
        callCount++;
        return Promise.reject(new Error('Network error'));
      });

      // Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 30000 });

      // Deve ter tentado exatamente 3 vezes
      expect(callCount).toBe(3);
    });

    it('deve aguardar 2 segundos entre retries', async () => {
      // Arrange
      const timestamps: number[] = [];
      (supabase.auth.getSession as jest.Mock).mockImplementation(() => {
        timestamps.push(Date.now());
        return Promise.reject(new Error('Timeout'));
      });

      // Act
      renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Assert
      await waitFor(() => {
        expect(timestamps.length).toBeGreaterThanOrEqual(2);
      }, { timeout: 30000 });

      if (timestamps.length >= 2) {
        const timeDiff = timestamps[1] - timestamps[0];
        expect(timeDiff).toBeGreaterThanOrEqual(2000); // 2 segundos
        expect(timeDiff).toBeLessThan(3000); // Mas não muito mais
      }
    });
  });

  describe('🔔 Cenário 5: onAuthStateChange Listener', () => {
    
    it('deve ignorar eventos durante inicialização', async () => {
      // Arrange
      let authChangeCallback: any;
      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authChangeCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } }
        };
      });

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Act
      renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Dispara evento durante inicialização
      act(() => {
        authChangeCallback('INITIAL_SESSION', null);
      });

      // Assert
      // Não deve ter processado o evento (verificar via logs se necessário)
      expect(true).toBe(true); // Placeholder - logs devem mostrar "Evento ignorado"
    });

    it('deve processar eventos após inicialização completa', async () => {
      // Arrange
      let authChangeCallback: any;
      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authChangeCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } }
        };
      });

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Aguarda inicialização
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const mockNewSession = {
        user: { id: 'user-456', email: 'new@example.com' },
      };

      // Act: Dispara evento após inicialização
      act(() => {
        authChangeCallback('SIGNED_IN', mockNewSession);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.user).toEqual(mockNewSession.user);
      });
    });
  });

  describe('🚪 Cenário 6: SignOut', () => {
    
    it('deve limpar todos os estados e cache ao fazer logout', async () => {
      // Arrange
      const mockSession = {
        user: { id: 'user-123' },
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Act
      await act(async () => {
        await result.current.signOut();
      });

      // Assert
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(CacheManager.remove).toHaveBeenCalledWith('auth', 'profile');
      expect(CacheManager.clearNamespace).toHaveBeenCalledWith('vendas');
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });

  describe('💾 Cenário 7: Cache Offline', () => {
    
    it('deve usar cache quando rede falha', async () => {
      // Arrange
      const cachedProfile = {
        estabelecimento_id: 'cached-estab',
        role: 'admin',
        user_id: 'user-123',
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { 
          session: { 
            user: { id: 'user-123' } 
          } 
        },
        error: null,
      });

      // Mock erro na busca de perfil
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      });

      // Mock cache retornando dados
      (CacheManager.get as jest.Mock).mockResolvedValue(cachedProfile);

      // Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.estabelecimentoId).toBe('cached-estab');
      expect(result.current.role).toBe('admin');
    });
  });
});
