import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { fireEvent, render } from "@testing-library/react-native"

import { ReaderProvider } from "../../app/context/ReaderContext"
import { TextInputScreen } from "../../app/screens/TextInputScreen"
import { ThemeProvider } from "../../app/theme/context"

const Stack = createNativeStackNavigator()

const TestNavigator = () => (
  <ThemeProvider>
    <ReaderProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="TextInput" component={TextInputScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ReaderProvider>
  </ThemeProvider>
)

describe("TextInputScreen", () => {
  it("should render the screen", () => {
    const { getByTestId, getByPlaceholderText } = render(<TestNavigator />)

    expect(getByTestId("text-input-field")).toBeDefined()
    expect(getByPlaceholderText("Paste or type your text here...")).toBeDefined()
  })

  it("should have disabled start button when text is empty", () => {
    const { getByTestId } = render(<TestNavigator />)

    const startButton = getByTestId("start-reading-button")
    expect(startButton.props.accessibilityState?.disabled || startButton.props.disabled).toBe(true)
  })

  it("should enable start button when text is entered", () => {
    const { getByTestId, getByPlaceholderText } = render(<TestNavigator />)

    const textInput = getByPlaceholderText("Paste or type your text here...")
    fireEvent.changeText(textInput, "Test text to read")

    const startButton = getByTestId("start-reading-button")
    expect(startButton.props.accessibilityState?.disabled || startButton.props.disabled).toBeFalsy()
  })

  it("should accept text input", () => {
    const { getByPlaceholderText } = render(<TestNavigator />)

    const textInput = getByPlaceholderText("Paste or type your text here...")
    fireEvent.changeText(textInput, "Hello world this is a test")

    expect(textInput.props.value).toBe("Hello world this is a test")
  })

  it("should update text when typing multiple times", () => {
    const { getByPlaceholderText } = render(<TestNavigator />)

    const textInput = getByPlaceholderText("Paste or type your text here...")

    fireEvent.changeText(textInput, "First text")
    expect(textInput.props.value).toBe("First text")

    fireEvent.changeText(textInput, "Second text")
    expect(textInput.props.value).toBe("Second text")
  })
})
