# Reader - Rapid Serial Visual Presentation (RSVP) App

A React Native app built with [Infinite Red Ignite](https://github.com/infinitered/ignite) for speed reading using the Rapid Serial Visual Presentation (RSVP) technique.

## What is RSVP?

RSVP is a speed reading technique that displays words one at a time (or in small chunks) at a fixed location on the screen. This eliminates the need for eye movement (saccades) between words, allowing for faster reading speeds.

## Features

- **Text Input**: Paste or type any text you want to read
- **Adjustable Speed**: Control reading speed from 100 to 1000 WPM (words per minute)
- **Chunk Size**: Display 1-3 words at a time for improved comprehension
- **Progress Tracking**: Visual progress bar and word counter
- **Play/Pause Controls**: Start, stop, and restart reading at any time
- **Cross-Platform**: Works on both Android and iOS

## Getting Started

### Prerequisites

- Node.js
- npm or yarn
- iOS: Xcode (for iOS simulator or device)
- Android: Android Studio (for Android emulator or device)

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm run start
```

### Running on Device/Simulator

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android
```

To build for physical devices, first run EAS build:

```bash
# Build for iOS simulator
npm run build:ios:sim

# Build for iOS device
npm run build:ios:device

# Build for iOS production
npm run build:ios:prod
```

## Project Structure

This project follows the [Ignite boilerplate structure](https://github.com/infinitered/ignite/blob/master/docs/boilerplate/Boilerplate.md):

```
app/
├── components/       # Reusable UI components
├── context/          # React Context providers
│   ├── AuthContext.tsx
│   └── ReaderContext.tsx    # RSVP reading state management
├── i18n/             # Internationalization
├── navigators/       # Navigation configuration
├── screens/          # Screen components
│   ├── ReaderScreen.tsx     # RSVP reading display
│   ├── TextInputScreen.tsx # Text input screen
│   └── WelcomeScreen.tsx
├── services/         # API and external services
├── theme/            # Styling and theming
└── utils/            # Utility functions
```

## How to Use

1. **Launch the app** - You'll see the welcome screen
2. **Enter text** - Tap "Let's go!" to reach the text input screen
3. **Paste or type** your content
4. **Start reading** - Tap "Start Reading" to begin
5. **Adjust settings**:
   - Use the +/- buttons to adjust WPM (reading speed)
   - Change "Words" setting to show 1-3 words at a time
6. **Control playback** - Tap the play/pause button to control reading
7. **Restart** - Tap "Restart" to begin again from the first word

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:ci
```

The app includes unit tests for:
- ReaderContext state management
- TextInputScreen component
- ReaderScreen component

## Technical Details

### State Management
- Uses React Context with `useMMKVString`/`useMMKVNumber` from react-native-mmkv for persistent storage
- Reading state (text, speed, chunk size) persists across app restarts

### Navigation
- React Navigation v6 with native stack navigator
- Screens: Welcome → TextInput → Reader

### Theming
- Ignite's themed component system
- Dark/light mode support via ThemeProvider

## Learn More

- [Ignite Documentation](https://github.com/infinitered/ignite/blob/master/docs/README.md)
- [Ignite Cookbook](https://ignitecookbook.com/)
- [React Native](https://reactnative.dev/)

## License

MIT
