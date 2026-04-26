// we always make sure 'react-native' gets included first
// eslint-disable-next-line no-restricted-imports
import * as ReactNative from "react-native"

import mockFile from "./mockFile"

// libraries to mock
jest.doMock("react-native", () => {
  // Extend ReactNative
  return Object.setPrototypeOf(
    {
      Image: {
        ...ReactNative.Image,
        resolveAssetSource: jest.fn((_source) => mockFile), // eslint-disable-line @typescript-eslint/no-unused-vars
        getSize: jest.fn(
          (
            uri: string, // eslint-disable-line @typescript-eslint/no-unused-vars
            success: (width: number, height: number) => void,
            failure?: (_error: any) => void, // eslint-disable-line @typescript-eslint/no-unused-vars
          ) => success(100, 100),
        ),
      },
    },
    ReactNative,
  )
})

jest.mock("expo-system-ui", () => ({
  setBackgroundColorAsync: jest.fn(),
  getBackgroundColorAsync: jest.fn(() => Promise.resolve("#ffffff")),
}))

jest.mock("i18next", () => ({
  currentLocale: "en",
  t: (key: string, params: Record<string, string>) => {
    return `${key} ${JSON.stringify(params)}`
  },
  translate: (key: string, params: Record<string, string>) => {
    return `${key} ${JSON.stringify(params)}`
  },
}))

jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", textDirection: "ltr" }],
}))

jest.mock("../app/i18n/index.ts", () => ({
  i18n: {
    isInitialized: true,
    language: "en",
    t: (key: string, params: Record<string, string>) => {
      return `${key} ${JSON.stringify(params)}`
    },
    numberToCurrency: jest.fn(),
  },
}))

jest.mock("react-native-keyboard-controller", () => ({
  KeyboardProvider: ({ children }: { children: React.ReactNode }) => children,
  useKeyboardAnimation: () => ({ height: { value: 0 } }),
  useKeyboardState: () => ({ isVisible: false }),
}))

// Mock Reanimated for RSVP engine tests
jest.mock("react-native-reanimated", () => {
  return {
    __esModule: true,
    default: {
      View: ({ children, style }: { children: React.ReactNode; style?: any }) => children,
      Text: ({ children }: { children: React.ReactNode }) => children,
    },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (callback: () => any) => callback(),
    withTiming: (value: number, _config?: any) => value,
    withSpring: (value: number, _config?: any) => value,
    Easing: {
      ease: { value: "ease" },
    },
    withSequence: (...animations: any[]) => animations,
    withDelay: (_delay: number, animation: any) => animation,
    runOnJS: (fn: Function) => fn,
    runOnUI: (fn: Function) => fn,
    createAnimatedPropAdapter: (adapter: Function) => adapter,
    makeMutable: (initial: number) => ({ value: initial }),
    makeRemote: (initial: any) => initial,
    isSharedValue: (value: any) => value && typeof value.value === "number",
    isReanimated3: () => true,
    enableLayoutAnimations: () => {},
    configureLayoutAnimations: () => {},
    configureProps: () => {},
    addWhitelistedNativeProps: () => {},
    addWhitelistedUIProps: () => {},
    getViewProp: () => {},
    measure: () => ({ x: 0, y: 0, width: 0, height: 0, pageX: 0, pageY: 0 }),
    dispatchCommand: () => {},
    scrollTo: () => {},
    setGestureState: () => {},
    setNativeProps: () => {},
    useAnimatedGestureHandler: () => ({}),
    useAnimatedProps: () => ({}),
    useAnimatedReaction: () => {},
    useAnimatedRef: () => ({ current: null }),
    useAnimatedScrollHandler: () => ({}),
    useDerivedValue: (callback: () => any) => ({ value: callback() }),
    useWorkletCallback: (callback: Function) => callback,
  }
})

// Global test utilities for RSVP engine
global.__TEST__ = true

declare const tron // eslint-disable-line @typescript-eslint/no-unused-vars

declare global {
  let __TEST__: boolean
}
