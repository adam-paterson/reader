export const EventEmitter = jest.fn(() => ({
  addListener: jest.fn(),
  removeListener: jest.fn(),
  emit: jest.fn(),
}))

export const NativeModulesProxy = {}

export const requireNativeModule = jest.fn(() => ({}))
export const requireOptionalNativeModule = jest.fn()
export const requireNativeViewManager = jest.fn()

export default {
  EventEmitter,
  NativeModulesProxy,
  requireNativeModule,
  requireOptionalNativeModule,
  requireNativeViewManager,
}
