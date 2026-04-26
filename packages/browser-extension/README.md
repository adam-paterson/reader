# Readrrr Browser Extension

A Chrome/Firefox browser extension (Manifest V3) for one-click RSVP reading with Mercury Parser integration.

## Features

- **One-click RSVP reading**: Extract article content and read with RSVP (Rapid Serial Visual Presentation)
- **Mercury Parser integration**: Clean article extraction from any URL
- **Save for later**: Queue articles to read later in Readrrr
- **Cross-browser support**: Works with Chrome, Firefox, and Edge

## Installation

### Development

```bash
cd packages/browser-extension
npm install
npm run dev
```

### Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `packages/browser-extension/dist` folder

### Load in Firefox

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `packages/browser-extension/dist/manifest.json` file

## Usage

1. Visit any article webpage
2. Click the Readrrr extension icon
3. Choose "Read Now" for immediate RSVP reading or "Save for Later" to queue

## Architecture

- `manifest.json` - Extension configuration (Manifest V3)
- `popup.html/js` - Extension popup UI
- `content.js` - Content script for page extraction
- `background.js` - Service worker for API calls
- `mercury-parser.js` - Mercury Parser wrapper for article extraction

## API Integration

The extension communicates with the Readrrr backend API:

- `POST /api/v1/documents` - Save extracted content
- `POST /api/v1/read` - Start RSVP reading session

Configure API endpoint in extension settings.
