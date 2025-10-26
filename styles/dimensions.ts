// styles/dimensions.ts
import { Dimensions, PixelRatio } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const getResponsiveDimension = {
  width: (percentage: number) => {
    const dimension = (percentage * screenWidth) / 100;
    return Math.round(PixelRatio.roundToNearestPixel(dimension));
  },
  height: (percentage: number) => {
    const dimension = (percentage * screenHeight) / 100;
    return Math.round(PixelRatio.roundToNearestPixel(dimension));
  },
  fontSize: (size: number) => {
    const scale = screenWidth / 375; // Base width (iPhone X)
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
};

export const screenDimensions = {
  width: screenWidth,
  height: screenHeight,
  isTablet: screenWidth >= 768,
  pixelRatio: PixelRatio.get(),
  fontScale: PixelRatio.getFontScale()
};