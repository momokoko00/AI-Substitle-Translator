# AI Subtitle Generator

This project is a Next.js application that allows users to translate subtitle files using various AI providers and generate subtitles directly from video files. It supports multiple subtitle formats and provides a user-friendly interface for uploading files and selecting translation options.

**Update: You can now upload your video file directly to generate subtitles for it!**

![Desktop](https://github.com/user-attachments/assets/7d329b87-6039-4ad2-ad2a-518024a90a38)


Check the live demo: https://ai-subtitle-translator.netlify.app/

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

### Subtitle Translation
1. Navigate to the "Translate" tab.
2. Select the API provider you wish to use for translation (OpenAI, Google Gemini, DeepSeek, or Anthropic).
3. Choose the target language for translation.
4. Enter your API key for the selected provider.
5. Upload a subtitle file (SRT, VTT, or TXT).
6. Click the "Translate Subtitle" button to start the translation process.
7. The translated subtitles will appear in the preview area, and you can download them as a new subtitle file.

### Video Subtitle Generation
1. Navigate to the "Generate" tab.
2. Enter your Gemini API key.
3. Choose the language for the generated subtitles.
4. Upload a video file.
5. Click the "Generate Subtitles" button to start the process.
6. The application will extract audio from the video, process it with Gemini AI, and generate subtitles.
7. Once complete, you can preview and download the generated subtitles.

## Components

### Subtitle Generator

The `SubtitleGenerator` component is responsible for handling the user interface and the translation/generation logic. It allows users to select an API provider, target language, and upload subtitle or video files. The component manages the translation and generation processes, including error handling and progress tracking.

Key functionalities:
- API provider selection
- Language selection
- File upload (subtitle files and video files)
- Translation handling with progress updates
- Video subtitle generation
- Error messaging

### Subtitle Parser

The `subtitleParser.tsx` file contains utility functions for parsing subtitle files. It defines the `SubtitleBlock` interface and provides functions to parse subtitles, chunk them into manageable sizes, and convert them back to string format.

Key functionalities:
- `parseSubtitles(text: string): SubtitleBlock[]`: Parses subtitle text into structured blocks.
- `chunkSubtitles(blocks: SubtitleBlock[], maxBlocksPerChunk: number)`: Chunks subtitle blocks for processing.
- `blocksToString(blocks: SubtitleBlock[]): string`: Converts structured subtitle blocks back into string format.

### Video Processor

The `videoProcessor.tsx` file contains utilities for processing video files and generating subtitles from them.

Key functionalities:
- `extractAudioFromVideo(videoFile: File): Promise<Blob>`: Extracts audio from video files using FFmpeg.
- `generateSubtitlesFromAudio(audioBlob: Blob, apiKey: string): Promise<string>`: Generates subtitles from audio using Gemini AI.
- `translateSubtitles(subtitles: string, apiKey: string, targetLanguage: string): Promise<string>`: Translates generated subtitles to the target language.

## API Providers

The application supports the following API providers for translation:
- **OpenAI**: Uses the GPT-4O model for translation.
- **Google Gemini**: Utilizes Google's generative AI for subtitle translation and video subtitle generation.
- **DeepSeek**: Integrates with the DeepSeek API for translation services.
- **Anthropic**: Leverages Claude 3.7 Sonnet for subtitle translation.

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
