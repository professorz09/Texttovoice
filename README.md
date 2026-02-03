# VoiceForge TTS

Professional Text-to-Speech app powered by Google Gemini 2.5 Pro and Chirp 3 HD.

## Features

### 🎙️ Text-to-Speech
- **30+ Gemini Voices** - High-quality AI voices with natural intonation
- **Chirp 3 HD Support** - Google Cloud's premium TTS engine
- **Multi-Speaker Mode** - Generate conversations with 2 different voices
- **Long Text Processing** - Auto-split texts over 500 words into chunks

### 📚 Library Management
- Store up to **100 audio clips** (50MB limit)
- Auto-cleanup when storage limit reached
- Upload external audio files
- Edit file names inline
- Download audio files (mobile & web)

### 📖 Teleprompter
- Real-time word highlighting during playback
- Speech-to-Text sync for precise timing
- Adjustable font size and playback speed
- Auto-scroll with highlighted words

### 📱 Mobile Optimized
- Native Android APK
- Safe area support for navigation bars
- Touch-friendly UI (44px minimum tap targets)
- File download with native share dialog
- Offline storage with localStorage

### 🌐 Web & Mobile
- Works on web browsers
- Native Android app via Capacitor
- Responsive design for all screen sizes

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Mobile**: Capacitor (Android)
- **APIs**: Google Gemini 2.5 Pro, Google Cloud TTS & STT
- **Storage**: localStorage (client-side)

## Setup

### Prerequisites
- Node.js 22+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Build Android APK
npm run cap:build
cd android
./gradlew assembleDebug
```

### API Keys

Add your API keys in the app Settings:

1. **Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/apikey)
2. **Google Cloud API Key**: Get from [Google Cloud Console](https://console.cloud.google.com/)

Keys are stored locally in your browser (localStorage).

## Deployment

### Web (Vercel)
```bash
vercel
```

### Android APK
GitHub Actions automatically builds APK on push to main branch.

Download from: Actions → Build Android APK → Artifacts

## Version History

### v1.1.0 (Current)
- ✅ Mobile file download with native share
- ✅ Inline edit for audio file names
- ✅ Storage management (100 clips, 50MB limit)
- ✅ Safe area support for navigation bars
- ✅ Mobile-optimized UI

### v1.0.0
- Initial release
- Gemini & Chirp TTS
- Teleprompter with word sync
- Library management

## License

MIT

## Author

Built with ❤️ by professorz09
