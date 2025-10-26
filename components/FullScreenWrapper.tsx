// components/FullScreenWrapper.tsx
import React from 'react';
import { View, StatusBar, Platform, StyleSheet, Text } from 'react-native';
import { useCompensatedStyles } from '../hooks/useScreenDensity';

interface FullScreenWrapperProps {
  children: React.ReactNode;
  backgroundColor?: string;
  statusBarStyle?: 'default' | 'light-content' | 'dark-content';
}

export const FullScreenWrapper: React.FC<FullScreenWrapperProps> = ({
  children,
  backgroundColor = '#ffffff',
  statusBarStyle = 'dark-content',
}) => {
  const { container, fullScreen, screenInfo } = useCompensatedStyles();

  return (
    <>
      <StatusBar 
        barStyle={statusBarStyle}
        backgroundColor={backgroundColor}
        translucent={true}
      />
      <View style={[styles.wrapper, { backgroundColor }]}>
        <View style={[styles.content, container]}>
          {children}
        </View>
        {__DEV__ && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>
              {`Density: ${screenInfo.density.toFixed(2)}\nNon-std: ${screenInfo.isNonStandardDensity}\nScale: ${screenInfo.scaleFactor.toFixed(2)}`}
            </Text>
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
  debugInfo: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 5,
    borderRadius: 3,
    maxWidth: 150,
  },
  debugText: {
    fontSize: 10,
    color: 'white',
  },
});