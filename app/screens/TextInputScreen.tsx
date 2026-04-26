import { FC, useCallback, useState } from "react"
import { TextInput as RNTextInput, TextStyle, View, ViewStyle } from "react-native"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useReader } from "@/context/ReaderContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { $styles } from "@/theme/styles"
import type { ThemedStyle } from "@/theme/types"

interface TextInputScreenProps extends AppStackScreenProps<"TextInput"> {}

export const TextInputScreen: FC<TextInputScreenProps> = function TextInputScreen({ navigation }) {
  const { text, setText } = useReader()
  const [inputText, setInputText] = useState(text)

  const handleStartReading = useCallback(() => {
    setText(inputText)
    navigation.navigate("Reader")
  }, [inputText, setText, navigation])

  return (
    <Screen preset="fixed" contentContainerStyle={$styles.flex1}>
      <View style={themed($container)}>
        <Text preset="heading" tx="textInput:title" style={themed($title)} />
        <Text tx="textInput:subtitle" style={themed($subtitle)} />

        <View style={themed($inputContainer)}>
          <RNTextInput
            testID="text-input-field"
            style={themed($textInput)}
            multiline
            numberOfLines={10}
            placeholder="Paste or type your text here..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            textAlignVertical="top"
            accessibilityLabel="Text input for reading"
          />
        </View>

        <View style={themed($buttonContainer)}>
          <Button
            testID="start-reading-button"
            tx="textInput:startReading"
            preset="default"
            onPress={handleStartReading}
            disabled={!inputText.trim()}
          />
        </View>
      </View>
    </Screen>
  )
}

const themed = <T,>(style: ThemedStyle<T>) => style

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  padding: spacing.lg,
})

const $title: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $subtitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
  opacity: 0.7,
})

const $inputContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  borderRadius: 8,
  padding: spacing.sm,
  marginBottom: spacing.lg,
  backgroundColor: colors.palette.neutral100,
})

const $textInput: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  fontSize: 16,
  lineHeight: 24,
  color: colors.text,
  textAlignVertical: "top",
})

const $buttonContainer: ThemedStyle<ViewStyle> = () => ({
  marginTop: "auto",
})
