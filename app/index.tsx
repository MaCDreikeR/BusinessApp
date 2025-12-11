import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Deixa o guardião do _layout.tsx decidir para onde ir
    // Não redireciona aqui para evitar conflito
  }, []);

  // Mostra loading enquanto o guardião decide
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#7C3AED" />
    </View>
  );
}