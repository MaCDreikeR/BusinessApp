import { View, ViewProps, StyleSheet, useColorScheme } from 'react-native';

interface CardProps extends ViewProps {}

export function Card(props: CardProps) {
  const colorScheme = useColorScheme();
  const cardStyle = colorScheme === 'dark' ? styles.cardDark : styles.cardLight;
  
  return (
    <View {...props} style={[styles.card, cardStyle, props.style]} />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#2A2A2A',
    shadowColor: '#000000',
    elevation: 3,
    borderColor: '#404040',
  },
}); 