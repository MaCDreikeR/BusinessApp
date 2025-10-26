// hooks/useScreenDensity.ts
import { useEffect, useState } from 'react';
import { Dimensions, PixelRatio, StatusBar, Platform } from 'react-native';

export interface ScreenInfo {
  width: number;
  height: number;
  density: number;
  fontScale: number;
  isNonStandardDensity: boolean;
  scaleFactor: number;
}

export const useScreenDensity = (): ScreenInfo => {
  const [screenInfo, setScreenInfo] = useState<ScreenInfo>(() => {
    const { width, height } = Dimensions.get('window');
    const density = PixelRatio.get();
    const fontScale = PixelRatio.getFontScale();
    
    // Detecta se a densidade não é padrão (320 DPI = density 2.0)
    const standardDensities = [1.0, 1.33, 1.5, 2.0, 3.0, 4.0]; // ldpi, mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi
    const isNonStandardDensity = !standardDensities.some(std => Math.abs(density - std) < 0.1);
    
    // Fator de escala para compensar densidades não-padrão
    let scaleFactor = 1.0;
    if (isNonStandardDensity) {
      // Para 274 DPI (~1.7 density), ajusta para se comportar como HDPI (1.5) ou XHDPI (2.0)
      if (density >= 1.6 && density < 2.2) {
        scaleFactor = 2.0 / density; // Força comportamento como XHDPI
      }
    }
    
    return {
      width,
      height,
      density,
      fontScale,
      isNonStandardDensity,
      scaleFactor
    };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const density = PixelRatio.get();
      const fontScale = PixelRatio.getFontScale();
      
      const standardDensities = [1.0, 1.33, 1.5, 2.0, 3.0, 4.0];
      const isNonStandardDensity = !standardDensities.some(std => Math.abs(density - std) < 0.1);
      
      let scaleFactor = 1.0;
      if (isNonStandardDensity) {
        if (density >= 1.6 && density < 2.2) {
          scaleFactor = 2.0 / density;
        }
      }
      
      setScreenInfo({
        width: window.width,
        height: window.height,
        density,
        fontScale,
        isNonStandardDensity,
        scaleFactor
      });
    });

    return () => subscription?.remove();
  }, []);

  return screenInfo;
};

// Hook para aplicar estilos compensados
export const useCompensatedStyles = () => {
  const screenInfo = useScreenDensity();
  
  return {
    container: {
      flex: 1,
      width: '100%',
      height: '100%',
      ...(screenInfo.isNonStandardDensity && {
        transform: [{ scale: screenInfo.scaleFactor }],
        alignSelf: 'center',
      }),
    },
    
    fullScreen: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      ...(Platform.OS === 'android' && {
        paddingTop: StatusBar.currentHeight || 0,
      }),
    },
    
    screenInfo,
  };
};