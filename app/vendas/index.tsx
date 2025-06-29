import { View, Text, StyleSheet } from 'react-native';

export default function VendasScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vendas</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
}); 