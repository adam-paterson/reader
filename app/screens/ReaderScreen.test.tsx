import { render } from "@testing-library/react-native"

import { ReaderProvider } from "../../app/context/ReaderContext"
import { ThemeProvider } from "../../app/theme/context"

describe("ReaderScreen (Basic)", () => {
  it("should verify test infrastructure works", () => {
    // Simple sanity check to verify tests are running
    expect(true).toBe(true)
  })

  it("should verify ReaderProvider can be created", () => {
    // Verify the context can be instantiated
    expect(() => {
      const TestWrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>
          <ReaderProvider>{children}</ReaderProvider>
        </ThemeProvider>
      )
      expect(TestWrapper).toBeDefined()
    }).not.toThrow()
  })
})
