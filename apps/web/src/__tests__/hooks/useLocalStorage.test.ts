/// <reference path="../jest.d.ts" />

import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'default'));

    expect(result.current[0]).toBe('default');
  });

  it('should read existing value from localStorage', () => {
    localStorage.setItem('existingKey', JSON.stringify('stored value'));

    const { result } = renderHook(() => useLocalStorage('existingKey', 'default'));

    expect(result.current[0]).toBe('stored value');
  });

  it('should update value and persist to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initial'));

    act(() => {
      result.current[1]('new value');
    });

    expect(result.current[0]).toBe('new value');
    expect(localStorage.getItem('testKey')).toBe(JSON.stringify('new value'));
  });

  it('should support function updater', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1]((prev) => prev + 5);
    });

    expect(result.current[0]).toBe(6);
    expect(localStorage.getItem('counter')).toBe('6');
  });

  it('should work with objects', () => {
    const initialObject = { name: 'John', age: 30 };
    const { result } = renderHook(() => useLocalStorage('user', initialObject));

    expect(result.current[0]).toEqual({ name: 'John', age: 30 });

    act(() => {
      result.current[1]({ name: 'Jane', age: 25 });
    });

    expect(result.current[0]).toEqual({ name: 'Jane', age: 25 });
    expect(JSON.parse(localStorage.getItem('user') || '{}')).toEqual({
      name: 'Jane',
      age: 25,
    });
  });

  it('should work with arrays', () => {
    const { result } = renderHook(() => useLocalStorage<string[]>('items', []));

    act(() => {
      result.current[1](['item1', 'item2']);
    });

    expect(result.current[0]).toEqual(['item1', 'item2']);

    act(() => {
      result.current[1]((prev) => [...prev, 'item3']);
    });

    expect(result.current[0]).toEqual(['item1', 'item2', 'item3']);
  });

  it('should work with boolean values', () => {
    const { result } = renderHook(() => useLocalStorage('darkMode', false));

    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem('darkMode')).toBe('true');
  });

  it('should work with null values', () => {
    const { result } = renderHook(() =>
      useLocalStorage<string | null>('nullableKey', null)
    );

    expect(result.current[0]).toBeNull();

    act(() => {
      result.current[1]('not null');
    });

    expect(result.current[0]).toBe('not null');

    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toBeNull();
  });

  it('should handle corrupted localStorage data gracefully', () => {
    // Simulate corrupted JSON in localStorage
    localStorage.setItem('corrupted', 'not valid json{');

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const { result } = renderHook(() => useLocalStorage('corrupted', 'fallback'));

    // Should fall back to initial value
    expect(result.current[0]).toBe('fallback');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should handle localStorage write errors', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() => useLocalStorage('errorKey', 'initial'));

    // Attempt to update should not throw
    act(() => {
      result.current[1]('new value');
    });

    // State should still update in memory even if storage fails
    expect(result.current[0]).toBe('new value');
    expect(consoleSpy).toHaveBeenCalled();

    setItemSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should use different keys independently', () => {
    const { result: result1 } = renderHook(() => useLocalStorage('key1', 'value1'));
    const { result: result2 } = renderHook(() => useLocalStorage('key2', 'value2'));

    expect(result1.current[0]).toBe('value1');
    expect(result2.current[0]).toBe('value2');

    act(() => {
      result1.current[1]('updated1');
    });

    expect(result1.current[0]).toBe('updated1');
    expect(result2.current[0]).toBe('value2');
  });

  it('should persist number zero correctly', () => {
    const { result } = renderHook(() => useLocalStorage('zero', 0));

    expect(result.current[0]).toBe(0);

    // Initial value is not persisted until setValue is called
    act(() => {
      result.current[1](0);
    });

    expect(localStorage.getItem('zero')).toBe('0');
  });

  it('should persist empty string correctly', () => {
    const { result } = renderHook(() => useLocalStorage('empty', ''));

    expect(result.current[0]).toBe('');

    act(() => {
      result.current[1]('not empty');
    });

    expect(result.current[0]).toBe('not empty');

    act(() => {
      result.current[1]('');
    });

    expect(result.current[0]).toBe('');
  });

  it('should persist empty array correctly', () => {
    const { result } = renderHook(() => useLocalStorage<number[]>('emptyArray', []));

    expect(result.current[0]).toEqual([]);

    // Initial value is not persisted until setValue is called
    act(() => {
      result.current[1]([]);
    });

    expect(localStorage.getItem('emptyArray')).toBe('[]');
  });

  it('should read pre-existing localStorage data on mount', () => {
    // Set data before hook runs
    localStorage.setItem('preexisting', JSON.stringify({ saved: true }));

    const { result } = renderHook(() =>
      useLocalStorage('preexisting', { saved: false })
    );

    // Should read stored value, not initial
    expect(result.current[0]).toEqual({ saved: true });
  });
});
