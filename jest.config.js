/** @type {import('@jest/types').Config.ProjectConfig} */
module.exports = {
  preset: "react-native",
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|@react-navigation|expo.*|@expo.*|react-native-mmkv|react-native-reanimated|react-native-worklets)/)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/app/$1",
    "^@assets/(.*)$": "<rootDir>/assets/$1",
    "^react-native-mmkv$": "<rootDir>/test/__mocks__/react-native-mmkv.ts",
    "\\.(ttf|otf|woff|woff2|eot)$": "<rootDir>/test/mockFile.ts",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  collectCoverageFrom: [
    "app/rsvp/**/*.ts",
    "app/rsvp/**/*.tsx",
    "!app/rsvp/**/*.d.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
  ],
}
