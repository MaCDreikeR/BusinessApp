// Debug Logger - Captura logs em memória para visualização in-app
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: any;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 200; // Mantém últimos 200 logs
  private listeners: Array<(logs: LogEntry[]) => void> = [];

  constructor() {
    this.loadLogsFromStorage();
  }

  private async loadLogsFromStorage() {
    try {
      const stored = await AsyncStorage.getItem('@debugLogs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Erro ao carregar logs do storage:', error);
    }
  }

  private async saveLogsToStorage() {
    try {
      await AsyncStorage.setItem('@debugLogs', JSON.stringify(this.logs.slice(-50))); // Salva últimos 50
    } catch (error) {
      console.error('Erro ao salvar logs no storage:', error);
    }
  }

  private formatTimestamp(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
  }

  private addLog(level: LogEntry['level'], category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      category,
      message,
      data,
    };

    this.logs.push(entry);

    // Limita tamanho do array
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Envia para console nativo
    const consoleMsg = `[${entry.timestamp}] [${category}] ${message}`;
    switch (level) {
      case 'error':
        console.error(consoleMsg, data);
        break;
      case 'warn':
        console.warn(consoleMsg, data);
        break;
      case 'info':
        console.info(consoleMsg, data);
        break;
      default:
        console.log(consoleMsg, data);
    }

    // Notifica listeners
    this.listeners.forEach(listener => listener(this.logs));

    // Persiste periodicamente
    if (this.logs.length % 10 === 0) {
      this.saveLogsToStorage();
    }
  }

  debug(category: string, message: string, data?: any) {
    this.addLog('debug', category, message, data);
  }

  info(category: string, message: string, data?: any) {
    this.addLog('info', category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.addLog('warn', category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.addLog('error', category, message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    AsyncStorage.removeItem('@debugLogs');
    this.listeners.forEach(listener => listener(this.logs));
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    // Retorna função de cleanup
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const debugLogger = new DebugLogger();
