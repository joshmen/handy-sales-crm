import React, { useCallback, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { COLORS } from '@/theme/colors';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
}

export function SearchBar({
  placeholder = 'Buscar...',
  onSearch,
  debounceMs = 300,
}: SearchBarProps) {
  // Use ref for value to avoid re-renders on every keystroke
  const valueRef = useRef('');
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [displayValue, setDisplayValue] = React.useState('');

  const handleChange = useCallback(
    (text: string) => {
      valueRef.current = text;
      setDisplayValue(text);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onSearch(text);
      }, debounceMs);
    },
    [onSearch, debounceMs]
  );

  const handleClear = useCallback(() => {
    valueRef.current = '';
    setDisplayValue('');
    onSearch('');
    inputRef.current?.focus();
  }, [onSearch]);

  return (
    <View style={styles.container}>
      <Search size={18} color="#94a3b8" />
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={displayValue}
        onChangeText={handleChange}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {displayValue.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.clearButton}
        >
          <X size={16} color="#94a3b8" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  containerFocused: {
    backgroundColor: '#f8faff',
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#1e293b',
    paddingVertical: 0,
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});
