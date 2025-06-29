import React from 'react';
import { View, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface IconSymbolProps {
  name: string;
  size: number;
  color: string;
  style?: ViewStyle;
}

export function IconSymbol({ name, size, color, style }: IconSymbolProps) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <MaterialIcons name={name} size={size} color={color} />
    </View>
  );
}

export default IconSymbol; 