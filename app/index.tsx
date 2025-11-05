import { Redirect } from 'expo-router';

export default function Index() {
  // Redireciona para tela de boas-vindas (fluxo de primeira execução)
  return <Redirect href="/(auth)/boas-vindas" />;
}