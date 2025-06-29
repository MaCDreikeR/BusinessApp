import React from 'react';
import { ScrollView, View, ViewStyle, useColorScheme } from 'react-native';

interface ParallaxScrollViewProps {
  headerBackgroundColor: { light: string; dark: string };
  headerImage: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function ParallaxScrollView({
  headerBackgroundColor,
  headerImage,
  children,
  style,
}: ParallaxScrollViewProps) {
  const colorScheme = useColorScheme();

  return (
    <ScrollView style={[{ flex: 1 }, style]}>
      <View
        style={{
          backgroundColor: headerBackgroundColor[colorScheme ?? 'light'],
          padding: 20,
          alignItems: 'center',
        }}>
        {headerImage}
      </View>
      <View style={{ padding: 20 }}>{children}</View>
    </ScrollView>
  );
} 