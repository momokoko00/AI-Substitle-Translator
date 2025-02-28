# AI Subtitle Generator

This project is a Next.js application that allows users to translate subtitle files using various AI providers. It supports multiple subtitle formats and provides a user-friendly interface for uploading files and selecting translation options.

## Getting Started

To get started with the AI Subtitle Generator, follow these steps:

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ai-subtitle-generator
   ```

2. Install the dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application in action.

## Usage

1. Select the API provider you wish to use for translation (OpenAI, Google Gemini, DeepSeek, or Anthropic).
2. Choose the target language for translation.
3. Enter your API key for the selected provider.
4. Upload a subtitle file (SRT, VTT, or TXT).
5. Click the "Translate Subtitle" button to start the translation process.
6. The translated subtitles will appear in the preview area, and you can download them as a new subtitle file.

## Components

### Subtitle Generator

The `SubtitleGenerator` component is responsible for handling the user interface and the translation logic. It allows users to select an API provider, target language, and upload subtitle files. The component manages the translation process, including error handling and progress tracking.

Key functionalities:
- API provider selection
- Language selection
- File upload
- Translation handling with progress updates
- Error messaging

### Subtitle Parser

The `subtitleParser.tsx` file contains utility functions for parsing subtitle files. It defines the `SubtitleBlock` interface and provides functions to parse subtitles, chunk them into manageable sizes, and convert them back to string format.

Key functionalities:
- `parseSubtitles(text: string): SubtitleBlock[]`: Parses subtitle text into structured blocks.
- `chunkSubtitles(blocks: SubtitleBlock[], maxBlocksPerChunk: number)`: Chunks subtitle blocks for processing.
- `blocksToString(blocks: SubtitleBlock[]): string`: Converts structured subtitle blocks back into string format.

## API Providers

The application supports the following API providers for translation:
- **OpenAI**: Uses the GPT-4O model for translation.
- **Google Gemini**: Utilizes Google's generative AI for subtitle translation.
- **DeepSeek**: Integrates with the DeepSeek API for translation services.
- **Anthropic**: Leverages Claude 3.7 Sonnet for subtitle translation.

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
