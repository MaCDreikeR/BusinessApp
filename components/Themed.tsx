import { Text, TextProps } from 'react-native';
import { useColorScheme } from 'react-native';

export function ThemedText(props: TextProps) {
  const colorScheme = useColorScheme();
  const color = colorScheme === 'dark' ? '#FFFFFF' : '#1A1A1A';

  return (
    <Text {...props} style={[{ color }, props.style]} />
  );
} 