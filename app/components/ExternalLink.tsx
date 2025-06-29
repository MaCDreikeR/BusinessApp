import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ExternalLinkProps extends TouchableOpacityProps {
  href: string;
  children: React.ReactNode;
}

export function ExternalLink({ href, children, ...props }: ExternalLinkProps) {
  return (
    <TouchableOpacity
      {...props}
      onPress={() => {
        // Aqui você pode adicionar a lógica para abrir o link externo
        console.log('Abrindo link:', href);
      }}
    >
      <MaterialIcons name="open-in-new" size={16} color="#0066cc" style={{ marginRight: 4 }} />
      {children}
    </TouchableOpacity>
  );
}

export default ExternalLink; 