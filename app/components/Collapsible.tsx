import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Collapsible({ title, children, style }: CollapsibleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <MaterialIcons
          name={isExpanded ? 'expand-less' : 'expand-more'}
          size={24}
          color="#000"
        />
        <View style={styles.titleContainer}>
          <MaterialIcons name="folder" size={20} color="#666" />
          <Text style={styles.title}>{title}</Text>
        </View>
      </TouchableOpacity>
      {isExpanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    color: '#333',
  },
  content: {
    padding: 12,
  },
});

export default Collapsible; 