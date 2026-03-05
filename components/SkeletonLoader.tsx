import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export const SkeletonCard = ({ width = '100%', height = 160 }: { width?: string | number; height?: number }) => {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    card: {
      width: width as any,
      height: height,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      justifyContent: 'space-between',
    } as ViewStyle,
    circle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.border,
      marginBottom: 12,
    } as ViewStyle,
    line: {
      height: 14,
      backgroundColor: colors.border,
      borderRadius: 4,
      marginBottom: 8,
    } as ViewStyle,
    lineWide: {
      height: 28,
      backgroundColor: colors.border,
      borderRadius: 4,
      marginBottom: 4,
      width: '60%' as any,
    } as ViewStyle,
  });

  return (
    <View style={styles.card as any}>
      <View style={styles.circle} />
      <View style={styles.line} />
      <View style={styles.lineWide} />
      <View style={[styles.line, { width: '40%' }]} />
    </View>
  );
};

export const SkeletonListItem = () => {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    container: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 8,
      backgroundColor: colors.surface,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
    } as ViewStyle,
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.border,
      marginRight: 12,
    } as ViewStyle,
    content: {
      flex: 1,
    } as ViewStyle,
    line1: {
      height: 14,
      backgroundColor: colors.border,
      borderRadius: 4,
      marginBottom: 8,
      width: '80%' as any,
    } as ViewStyle,
    line2: {
      height: 12,
      backgroundColor: colors.border,
      borderRadius: 4,
      width: '60%' as any,
    } as ViewStyle,
  });

  return (
    <View style={styles.container}>
      <View style={styles.avatar} />
      <View style={styles.content}>
        <View style={styles.line1} />
        <View style={styles.line2} />
      </View>
    </View>
  );
};

export const SkeletonAgendamento = () => {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      height: 80,
    } as ViewStyle,
    line1: {
      height: 12,
      backgroundColor: colors.border,
      borderRadius: 4,
      marginBottom: 8,
      width: '70%' as any,
    } as ViewStyle,
    line2: {
      height: 10,
      backgroundColor: colors.border,
      borderRadius: 4,
      width: '50%' as any,
    } as ViewStyle,
  });

  return (
    <View style={styles.container}>
      <View style={styles.line1} />
      <View style={styles.line2} />
    </View>
  );
};

export interface SkeletonGridProps {
  columns?: number;
  count?: number;
  cardHeight?: number;
  gap?: number;
}

export const SkeletonGrid = ({ 
  columns = 2, 
  count = 4, 
  cardHeight = 160,
  gap = 16 
}: SkeletonGridProps) => {
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap,
      paddingHorizontal: 16,
    } as ViewStyle,
    cardWrapper: {
      width: `${100 / columns}%` as any,
      paddingHorizontal: gap / 2,
    } as ViewStyle,
  });

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.cardWrapper}>
          <SkeletonCard height={cardHeight} width="100%" />
        </View>
      ))}
    </View>
  );
};

export interface SkeletonListProps {
  count?: number;
  gap?: number;
}

export const SkeletonList = ({ count = 5, gap = 8 }: SkeletonListProps) => {
  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      gap,
    } as ViewStyle,
  });

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonListItem key={index} />
      ))}
    </View>
  );
};
