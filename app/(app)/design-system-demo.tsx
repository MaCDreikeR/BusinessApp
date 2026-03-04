/**
 * Design System Demo - Exemplo de uso dos componentes v2
 * 
 * Esta tela demonstra o uso dos novos componentes:
 * - Button (com variantes e tamanhos)
 * - Card (com variantes)
 * - DESIGN_TOKENS (spacing, typography, radius)
 * 
 * Para acessar: adicione esta rota em app/(app)/_layout.tsx
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../../components/Button2';
import { Card } from '../../components/Card2';
import { DESIGN_TOKENS, useCreateStyles, ColorTheme } from '../../utils/accentTheme';

export default function DesignSystemDemo() {
  const { colors } = useTheme();
  const styles = useCreateStyles(({ colors, design }) => createStyles(colors, design));
  
  const [loading, setLoading] = useState(false);
  
  const handleButtonPress = (label: string) => {
    Alert.alert('Botão Clicado', `Você clicou em: ${label}`);
  };
  
  const handleLoadingButton = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.title}>Design System v2</Text>
      <Text style={styles.subtitle}>
        Componentes reutilizáveis usando COMPONENT_TOKENS
      </Text>
      
      {/* Seção: Botões - Variantes */}
      <Card variant="elevated" style={styles.section}>
        <Text style={styles.sectionTitle}>Botões - Variantes</Text>
        <Text style={styles.sectionDescription}>
          Diferentes estilos visuais para diferentes ações
        </Text>
        
        <View style={styles.buttonGroup}>
          <Button 
            variant="primary" 
            onPress={() => handleButtonPress('Primary')}
          >
            Primary
          </Button>
          
          <Button 
            variant="secondary" 
            onPress={() => handleButtonPress('Secondary')}
          >
            Secondary
          </Button>
          
          <Button 
            variant="outline" 
            onPress={() => handleButtonPress('Outline')}
          >
            Outline
          </Button>
          
          <Button 
            variant="ghost" 
            onPress={() => handleButtonPress('Ghost')}
          >
            Ghost
          </Button>
          
          <Button 
            variant="danger" 
            onPress={() => handleButtonPress('Danger')}
          >
            Danger
          </Button>
        </View>
      </Card>
      
      {/* Seção: Botões - Tamanhos */}
      <Card variant="elevated" style={styles.section}>
        <Text style={styles.sectionTitle}>Botões - Tamanhos</Text>
        <Text style={styles.sectionDescription}>
          Large, Medium e Small
        </Text>
        
        <View style={styles.buttonGroup}>
          <Button 
            size="large" 
            variant="primary"
            onPress={() => handleButtonPress('Large')}
          >
            Large Button
          </Button>
          
          <Button 
            size="medium" 
            variant="primary"
            onPress={() => handleButtonPress('Medium')}
          >
            Medium Button
          </Button>
          
          <Button 
            size="small" 
            variant="primary"
            onPress={() => handleButtonPress('Small')}
          >
            Small Button
          </Button>
        </View>
      </Card>
      
      {/* Seção: Botões - Com Ícones */}
      <Card variant="elevated" style={styles.section}>
        <Text style={styles.sectionTitle}>Botões - Com Ícones</Text>
        
        <View style={styles.buttonGroup}>
          <Button 
            icon="save" 
            variant="primary"
            onPress={() => handleButtonPress('Save')}
          >
            Salvar
          </Button>
          
          <Button 
            icon="trash" 
            variant="danger"
            size="small"
            onPress={() => handleButtonPress('Delete')}
          >
            Excluir
          </Button>
          
          <Button 
            icon="share-social" 
            variant="outline"
            onPress={() => handleButtonPress('Share')}
          >
            Compartilhar
          </Button>
        </View>
      </Card>
      
      {/* Seção: Botões - Estados */}
      <Card variant="elevated" style={styles.section}>
        <Text style={styles.sectionTitle}>Botões - Estados</Text>
        
        <View style={styles.buttonGroup}>
          <Button 
            variant="primary"
            loading={loading}
            onPress={handleLoadingButton}
          >
            {loading ? 'Carregando...' : 'Simular Loading'}
          </Button>
          
          <Button 
            variant="secondary"
            disabled
            onPress={() => {}}
          >
            Disabled
          </Button>
          
          <Button 
            variant="primary"
            fullWidth
            onPress={() => handleButtonPress('Full Width')}
          >
            Full Width Button
          </Button>
        </View>
      </Card>
      
      {/* Seção: Cards - Variantes */}
      <Card variant="elevated" style={styles.section}>
        <Text style={styles.sectionTitle}>Cards - Variantes</Text>
        
        <Card variant="default" style={styles.cardExample}>
          <Text style={styles.cardTitle}>Card Default</Text>
          <Text style={styles.cardDescription}>
            Sombra suave, padding médio
          </Text>
        </Card>
        
        <Card variant="elevated" style={styles.cardExample}>
          <Text style={styles.cardTitle}>Card Elevated</Text>
          <Text style={styles.cardDescription}>
            Sombra maior, padding grande
          </Text>
        </Card>
        
        <Card variant="flat" style={styles.cardExample}>
          <Text style={styles.cardTitle}>Card Flat</Text>
          <Text style={styles.cardDescription}>
            Sem sombra, com borda
          </Text>
        </Card>
        
        <Card 
          variant="default" 
          style={styles.cardExample}
          onPress={() => Alert.alert('Card Clicado', 'Este card é clicável!')}
        >
          <Text style={styles.cardTitle}>Card Clicável</Text>
          <Text style={styles.cardDescription}>
            Toque para testar 👆
          </Text>
        </Card>
      </Card>
      
      {/* Seção: Design Tokens */}
      <Card variant="elevated" style={styles.section}>
        <Text style={styles.sectionTitle}>Design Tokens</Text>
        <Text style={styles.sectionDescription}>
          Spacing, Typography e Border Radius centralizados
        </Text>
        
        <View style={styles.tokenExample}>
          <Text style={styles.tokenLabel}>spacing.xs (4px):</Text>
          <View style={[styles.tokenBox, { width: DESIGN_TOKENS.spacing.xs * 10 }]} />
        </View>
        
        <View style={styles.tokenExample}>
          <Text style={styles.tokenLabel}>spacing.md (12px):</Text>
          <View style={[styles.tokenBox, { width: DESIGN_TOKENS.spacing.md * 10 }]} />
        </View>
        
        <View style={styles.tokenExample}>
          <Text style={styles.tokenLabel}>spacing.xl (20px):</Text>
          <View style={[styles.tokenBox, { width: DESIGN_TOKENS.spacing.xl * 10 }]} />
        </View>
        
        <View style={styles.tokenExample}>
          <Text style={[styles.tokenLabel, { fontSize: DESIGN_TOKENS.typography.xs }]}>
            typography.xs (12px)
          </Text>
        </View>
        
        <View style={styles.tokenExample}>
          <Text style={[styles.tokenLabel, { fontSize: DESIGN_TOKENS.typography.base }]}>
            typography.base (16px)
          </Text>
        </View>
        
        <View style={styles.tokenExample}>
          <Text style={[styles.tokenLabel, { fontSize: DESIGN_TOKENS.typography.xl }]}>
            typography.xl (20px)
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

// Estilos usando design tokens
const createStyles = (colors: ColorTheme, design: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: design.spacing.lg,
  },
  title: {
    fontSize: design.typography.xxxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: design.spacing.sm,
  },
  subtitle: {
    fontSize: design.typography.base,
    color: colors.textSecondary,
    marginBottom: design.spacing.xl,
  },
  section: {
    marginBottom: design.spacing.lg,
  },
  sectionTitle: {
    fontSize: design.typography.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: design.spacing.xs,
  },
  sectionDescription: {
    fontSize: design.typography.sm,
    color: colors.textSecondary,
    marginBottom: design.spacing.lg,
  },
  buttonGroup: {
    gap: design.spacing.md,
  },
  cardExample: {
    marginBottom: design.spacing.md,
  },
  cardTitle: {
    fontSize: design.typography.base,
    fontWeight: '600',
    color: colors.text,
    marginBottom: design.spacing.xs,
  },
  cardDescription: {
    fontSize: design.typography.sm,
    color: colors.textSecondary,
  },
  tokenExample: {
    marginBottom: design.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: design.spacing.sm,
  },
  tokenLabel: {
    fontSize: design.typography.sm,
    color: colors.text,
    fontWeight: '500',
    minWidth: 140,
  },
  tokenBox: {
    height: 24,
    backgroundColor: colors.primary,
    borderRadius: design.radius.sm,
  },
});
