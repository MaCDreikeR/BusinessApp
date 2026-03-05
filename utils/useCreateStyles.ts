import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { DESIGN_TOKENS, ColorTheme } from './accentTheme';

/**
 * Hook customizado para criar estilos dinâmicos com suporte a tema
 * 
 * Eliminado o ciclo de dependência ao estar em arquivo separado.
 * Combina `useTheme()` + `useMemo()` em uma única chamada.
 * 
 * @param createStylesFn - Função que recebe `{ colors, design }` e retorna StyleSheet
 * @returns Objeto de estilos reativo ao tema
 * 
 * @example
 * // Antes (repetitivo):
 * const { colors } = useTheme();
 * const styles = useMemo(() => createStyles(colors), [colors]);
 * const createStyles = (colors: ColorTheme) => StyleSheet.create({...});
 * 
 * // Depois (com hook):
 * const styles = useCreateStyles((c) => StyleSheet.create({
 *   container: { backgroundColor: c.colors.surface },
 *   text: { color: c.colors.text, fontSize: c.design.typography.base },
 * }));
 */
export function useCreateStyles<T extends Record<string, any>>(
  createStylesFn: (context: { colors: ColorTheme; design: typeof DESIGN_TOKENS }) => T
): T {
  const { colors } = useTheme();
  
  return useMemo(
    () => createStylesFn({ colors, design: DESIGN_TOKENS }),
    [colors]
  );
}
