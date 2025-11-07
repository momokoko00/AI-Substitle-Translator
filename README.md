# AI Subtitle Translator

AI Subtitle Translator is a Next.js application for translating existing subtitles and generating brand-new subtitles directly from video files. It supports multiple AI providers, handles a variety of subtitle formats, and guides you through the process with an intuitive interface.

## Features

- **Translate existing subtitles**: Upload `.srt`, `.vtt`, or `.txt` subtitle files and translate them into any supported language.
- **Generate subtitles from video**: Upload a video file and let the app extract audio, transcribe it with AI, and return timestamped subtitles.
- **Multiple AI providers**: Bring your own API key for OpenAI, Google Gemini, DeepSeek, or Anthropic and pick the model that fits your workflow.
- **Progress feedback**: Follow every stage of the translation and generation pipelines with detailed status messages.
- **Downloadable output**: Preview the result and export translated or newly generated subtitles with a single click.

## Live Demo

Explore the hosted version at [ai-subtitle-translator.netlify.app](https://ai-subtitle-translator.netlify.app/).

## Getting Started

Follow the steps below to clone the repository, install dependencies, and start a local development server.

### Prerequisites

- Node.js 18 or later
- npm (bundled with Node.js), or yarn / pnpm if you prefer an alternative package manager

### Clone the repository

```bash
git clone https://github.com/<your-username>/AI-Substitle-Translator.git
cd AI-Substitle-Translator
```

> Replace `<your-username>` with the actual GitHub username or organization that hosts the repository.

### Install dependencies

Using npm:

```bash
npm install
```

Using yarn:

```bash
yarn install
```

Using pnpm:

```bash
pnpm install
```

### Configure environment variables

Create a `.env.local` file at the project root and add the API keys for the providers you intend to use. The variables below are illustrative—consult your provider documentation for the exact key names and scopes.

```bash
NEXT_PUBLIC_OPENAI_API_KEY=sk-...
NEXT_PUBLIC_GEMINI_API_KEY=...
NEXT_PUBLIC_DEEPSEEK_API_KEY=...
NEXT_PUBLIC_ANTHROPIC_API_KEY=...
```

You can include one or many keys; the interface allows you to select which provider to activate at runtime.

### Run the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to access the app.

## Usage Overview

1. Choose between the **Translate** or **Generate** tabs.
2. Select an AI provider and target language.
3. Paste your API key (or use the one from `.env.local` if you inject it into the client).
4. Upload the relevant subtitle or video file.
5. Start the process and monitor progress.
6. Preview the subtitles and download them when you are satisfied.

## Project Structure Highlights

- `src/app/page.tsx`: Entry point for the main interface.
- `src/components/subtitle-generator/SubtitleGenerator.tsx`: Core component that orchestrates translation and generation flows.
- `src/lib/subtitleParser.ts`: Helpers for parsing, chunking, and serializing subtitle data.
- `src/lib/videoProcessor.ts`: Utility functions for extracting audio from video and generating subtitles with Gemini.
- `public/`: Static assets and icons.

## Contributing

Contributions are welcome! Please open an issue to discuss changes or submit a pull request with your improvements.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
