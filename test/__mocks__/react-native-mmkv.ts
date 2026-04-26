// Mock for react-native-mmkv
// This maintains a persistent mock storage across tests

// Global storage that persists across all mock instances
const globalMockStorage = new Map<string, string | number | boolean>()

// Simple mock implementations
export const MMKV = jest.fn(() => ({
  getString: jest.fn((key: string) => globalMockStorage.get(key) as string | undefined),
  set: jest.fn((key: string, value: string | number | boolean) => {
    globalMockStorage.set(key, value)
  }),
  getNumber: jest.fn((key: string) => globalMockStorage.get(key) as number | undefined),
  getBoolean: jest.fn((key: string) => globalMockStorage.get(key) as boolean | undefined),
  delete: jest.fn((key: string) => globalMockStorage.delete(key)),
  getAllKeys: jest.fn(() => Array.from(globalMockStorage.keys())),
  contains: jest.fn((key: string) => globalMockStorage.has(key)),
  clearAll: jest.fn(() => globalMockStorage.clear()),
  recrypt: jest.fn(),
}))

// State hooks that simulate MMKV hooks using local state
export function useMMKVString(key: string): [string, (value: string | undefined) => void] {
  const [value, setValue] = require("react").useState<string>(
    () => (globalMockStorage.get(key) as string) || "",
  )
  const setStoredValue = require("react").useCallback(
    (newValue: string | undefined) => {
      if (newValue === undefined) {
        globalMockStorage.delete(key)
      } else {
        globalMockStorage.set(key, newValue)
      }
      setValue(newValue || "")
    },
    [key],
  )
  return [value, setStoredValue]
}

export function useMMKVNumber(key: string): [number, (value: number | undefined) => void] {
  const [value, setValue] = require("react").useState<number>(
    () => (globalMockStorage.get(key) as number) || 0,
  )
  const setStoredValue = require("react").useCallback(
    (newValue: number | undefined) => {
      if (newValue === undefined) {
        globalMockStorage.delete(key)
      } else {
        globalMockStorage.set(key, newValue)
      }
      setValue(newValue || 0)
    },
    [key],
  )
  return [value, setStoredValue]
}

// Export for test access
export const __mockStorage = globalMockStorage
