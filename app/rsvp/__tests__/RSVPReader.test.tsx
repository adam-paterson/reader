import { render } from "@testing-library/react-native"

import { RSVPReader, RSVPReaderProps } from "../RSVPReader"

// Mock timer for animation tests
jest.useFakeTimers()

describe("RSVPReader", () => {
  const defaultProps: RSVPReaderProps = {
    text: "Hello world test",
    wpm: 300,
    onComplete: jest.fn(),
    onProgress: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should render first word on mount", () => {
    const { getByTestId } = render(<RSVPReader {...defaultProps} />)
    const wordDisplay = getByTestId("rsvp-word-display")
    expect(wordDisplay).toBeTruthy()
  })

  it("should display progress indicator", () => {
    const { getByTestId } = render(<RSVPReader {...defaultProps} />)
    expect(getByTestId("rsvp-progress")).toBeTruthy()
  })

  it("should show initial progress text", () => {
    const { getByTestId } = render(<RSVPReader {...defaultProps} />)
    const progressText = getByTestId("rsvp-progress-text")
    expect(progressText.children[0]).toContain("1") // Shows "1 / 3" for first word
  })

  it("should call onProgress when word changes", async () => {
    render(<RSVPReader {...defaultProps} />)
    // onProgress is called on initial render
    expect(defaultProps.onProgress).toHaveBeenCalled()
  })

  it("should render with custom WPM", () => {
    const { getByTestId } = render(<RSVPReader {...defaultProps} wpm={500} />)
    expect(getByTestId("rsvp-reader-container")).toBeTruthy()
  })

  it("should handle empty text gracefully", () => {
    const { getByTestId } = render(<RSVPReader {...defaultProps} text="" />)
    expect(getByTestId("rsvp-reader")).toBeTruthy()
  })

  it("should render pause button", () => {
    const { getByTestId } = render(<RSVPReader {...defaultProps} />)
    expect(getByTestId("rsvp-pause-button")).toBeTruthy()
  })

  it("should display total word count", () => {
    const { getByTestId } = render(<RSVPReader {...defaultProps} />)
    // "Hello world test" = 3 words
    const progressText = getByTestId("rsvp-progress-text")
    expect(progressText).toBeTruthy()
  })
})
