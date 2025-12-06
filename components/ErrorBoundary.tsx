import React, { Component, ReactNode } from 'react';
import { logger } from '@utils/logger';
import ErrorScreen from './ErrorScreen';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 * 
 * Captura erros não tratados em componentes React e previne que o app crashe.
 * 
 * Recursos:
 * - Captura erros em componentDidCatch
 * - Log automático de erros via logger
 * - Tela de fallback customizável
 * - Função para resetar o erro (try again)
 * - Preserva informações de stack trace
 * 
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 * 
 * @example Com fallback customizado
 * ```tsx
 * <ErrorBoundary fallback={(error, reset) => (
 *   <CustomErrorScreen error={error} onReset={reset} />
 * )}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Método estático chamado quando um erro é lançado
   * Atualiza o estado para mostrar a UI de erro
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Método de lifecycle chamado após um erro ser capturado
   * Usado para logging e relatórios de erro
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log detalhado do erro
    logger.error('ErrorBoundary capturou um erro:', {
      error: error.toString(),
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Atualiza o estado com informações completas do erro
    this.setState({
      errorInfo,
    });

    // Aqui você pode adicionar integração com serviços de monitoramento
    // como Sentry, Crashlytics, etc.
    // Example: Sentry.captureException(error);
  }

  /**
   * Reseta o estado de erro e tenta renderizar novamente
   */
  resetError = (): void => {
    logger.info('ErrorBoundary: Usuário tentou resetar o erro');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Se foi fornecido um fallback customizado, use-o
      if (fallback) {
        return fallback(error, this.resetError);
      }

      // Caso contrário, use a tela de erro padrão
      return <ErrorScreen error={error} onReset={this.resetError} />;
    }

    // Se não há erro, renderiza os children normalmente
    return children;
  }
}
