// Configuração de ambiente para Supabase
// Use este arquivo para alternar facilmente entre desenvolvimento local e produção

export const SUPABASE_CONFIG = {
  local: {
    url: 'http://127.0.0.1:54321',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IlN1cGFiYXNlTG9jYWwiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTQzNzkwMCwiZXhwIjoxOTYwOTkzOTAwfQ.wNe5blfAa8_HlJLvOZjLy9lm1P7LcQQXcLpPPa_CJ9o',
    serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IlN1cGFiYXNlTG9jYWwiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQ1NDM3OTAwLCJleHAiOjE5NjA5OTM5MDB9.YFsJDiLdGsOWgSaS-BrvgZIfm9oQAQ5Rr-jsFUwDcDw',
    databaseUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  },
  production: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  }
};

export const SUPABASE_URLS = {
  api: 'http://127.0.0.1:54321',
  studio: 'http://127.0.0.1:54323',
  inbucket: 'http://127.0.0.1:54324', // Para visualizar emails de teste
  storage: 'http://127.0.0.1:54321/storage/v1/s3',
  graphql: 'http://127.0.0.1:54321/graphql/v1',
};

// Função helper para detectar ambiente
export function isLocalEnvironment(): boolean {
  return process.env.NODE_ENV === 'development' || 
         process.env.EXPO_PUBLIC_SUPABASE_URL?.includes('127.0.0.1') ||
         false;
}

// Função para obter configuração atual
export function getCurrentConfig() {
  return isLocalEnvironment() ? SUPABASE_CONFIG.local : SUPABASE_CONFIG.production;
}