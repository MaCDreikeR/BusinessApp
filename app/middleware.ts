import { checkSession } from '@lib/supabase';
import { router } from 'expo-router';

export default async function middleware() {
  try {
    console.log('Verificando sessão no middleware...');
    const session = await checkSession();

    // Rotas públicas que não precisam de autenticação
    const publicRoutes = ['/(auth)/login', '/(auth)/cadastro', '/(auth)/boas-vindas'];
    const currentPath = router.pathname;

    console.log('Rota atual:', currentPath);

    // Se o usuário não está autenticado e tenta acessar uma rota protegida
    if (!session && !publicRoutes.includes(currentPath)) {
      console.log('Usuário não autenticado, redirecionando para login...');
      router.replace('/(auth)/login');
      return;
    }

    // Se o usuário está autenticado e tenta acessar uma rota pública
    if (session && publicRoutes.includes(currentPath)) {
      console.log('Usuário autenticado, redirecionando para app...');
      router.replace('/(app)');
      return;
    }
  } catch (error) {
    console.error('Erro no middleware:', error);
    router.replace('/(auth)/login');
  }
} 