import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import type { FFmpeg as FFmpegType } from '@ffmpeg/ffmpeg';

// Initialize FFmpeg - only in browser environment
let ffmpeg: FFmpegType | null = null;
let ffmpegLoaded = false;

// Load FFmpeg
const loadFFmpeg = async () => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
        throw new Error('FFmpeg can only be run in a browser environment');
    }

    if (!ffmpegLoaded) {
        // Dynamically import FFmpeg modules
        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
        const { toBlobURL } = await import('@ffmpeg/util');

        // Initialize FFmpeg
        ffmpeg = new FFmpeg();

        // Load ffmpeg core
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
        await ffmpeg!.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        ffmpegLoaded = true;
    }
};

/**
 * Extract audio from a video file
 * @param videoFile The video file to extract audio from
 * @returns A Blob containing the extracted audio in MP3 format
 */
export const extractAudioFromVideo = async (videoFile: File): Promise<Blob> => {
    try {
        // Load FFmpeg if not already loaded
        await loadFFmpeg();

        // Dynamically import fetchFile
        const { fetchFile } = await import('@ffmpeg/util');

        // Write the video file to FFmpeg's virtual file system
        await ffmpeg!.writeFile('input.mp4', await fetchFile(videoFile));

        // Extract audio from the video with optimized settings for AI processing
        await ffmpeg!.exec([
            '-i', 'input.mp4',
            '-vn', // No video
            '-acodec', 'libmp3lame', // MP3 codec
            '-ar', '16000', // Lower sample rate (16kHz) - better for speech recognition
            '-ac', '1', // Mono audio - better for speech recognition
            '-b:a', '64k', // Lower bitrate - smaller file size
            '-compression_level', '0', // Fastest compression
            'output.mp3'
        ]);

        // Read the output file
        const data = await ffmpeg!.readFile('output.mp3');

        // Clean up
        await ffmpeg!.deleteFile('input.mp4');
        await ffmpeg!.deleteFile('output.mp3');

        // Create a Blob from the output data
        return new Blob([data], { type: 'audio/mp3' });
    } catch (error) {
        console.error('Error extracting audio:', error);
        throw new Error('Failed to extract audio from video');
    }
};

/**
 * Convert audio blob to base64
 * @param audioBlob The audio blob to convert
 * @returns A Promise that resolves to the base64 string
 */
export const audioToBase64 = (audioBlob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Remove the data URL prefix (e.g., "data:audio/mp3;base64,")
            const base64 = base64String.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
    });
};

/**
 * Generate subtitles directly from audio using Gemini API
 * @param audioBlob The audio blob to generate subtitles from
 * @param apiKey The Gemini API key
 * @returns A Promise that resolves to the generated subtitles
 */
export const generateSubtitlesFromAudio = async (
    audioBlob: Blob,
    apiKey: string
): Promise<string> => {
    try {
        // Convert audio to base64
        const audioBase64 = await audioToBase64(audioBlob);

        // Initialize Gemini API
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-pro-exp-02-05",
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.1, // Lower temperature for more deterministic results
                topP: 0.8,        // More focused sampling
                topK: 40          // Standard value for focused generation
            }
        });

        // Create a binary part for the audio data
        const audioPart: Part = {
            inlineData: {
                data: audioBase64,
                mimeType: "audio/mp3",
            },
        };

        // Create a text part with instructions - simplified to match AI Studio style
        const promptPart: Part = {
            text: `Create accurate SRT format subtitles for this audio.

Important requirements:
1. Maintain precise timing - each subtitle should match the exact moment when words are spoken
2. Format as standard SRT with sequential numbering, timecodes (HH:MM:SS,MS format), and text
3. Keep each subtitle to 1-2 lines and roughly 7 words per line maximum
4. Include all spoken content
5. Maintain proper sentence structure
6. Do not add any explanatory text or notes
7. Return ONLY the SRT content, nothing else

Example format:
1
00:00:01,000 --> 00:00:04,000
This is the first subtitle

2
00:00:04,500 --> 00:00:08,000
This is the second subtitle
Split across two lines`
        };

        // Generate content
        const result = await model.generateContent([promptPart, audioPart]);
        const response = await result.response;
        const text = response.text();

        // Process the response to ensure it's in proper SRT format
        // Remove any markdown code blocks if present
        const formattedSubtitles = text.replace(/```srt|```/g, '').trim();

        return formattedSubtitles;
    } catch (error) {
        console.error('Error generating subtitles:', error);
        throw new Error('Failed to generate subtitles: ' + (error instanceof Error ? error.message : String(error)));
    }
};

/**
 * Translate subtitles to a target language using Gemini API
 * @param subtitles The SRT format subtitles to translate
 * @param apiKey The Gemini API key
 * @param targetLanguage The target language code
 * @returns A Promise that resolves to the translated subtitles
 */
export const translateSubtitles = async (
    subtitles: string,
    apiKey: string,
    targetLanguage: string
): Promise<string> => {
    try {
        // Initialize Gemini API
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.1,
                topP: 0.8,
                topK: 40
            }
        });

        // Create a prompt for translation
        const prompt = `Translate the following subtitles to ${getLanguageName(targetLanguage)}. 
Keep the SRT format intact, including all timing information and subtitle numbers.
Only translate the actual subtitle text content, not the timestamps or numbers.

Here are the subtitles to translate:

${subtitles}`;

        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const translatedText = response.text();

        // Process the response to ensure it's in proper SRT format
        // Remove any markdown code blocks if present
        const formattedSubtitles = translatedText.replace(/```srt|```/g, '').trim();

        return formattedSubtitles;
    } catch (error) {
        console.error('Error translating subtitles:', error);
        throw new Error('Failed to translate subtitles: ' + (error instanceof Error ? error.message : String(error)));
    }
};

/**
 * Process a video file and generate subtitles
 * This is the simplified main function that converts video to audio and generates subtitles
 * @param videoFile The video file to process
 * @param apiKey The Gemini API key
 * @param onProgress Optional callback for progress updates
 * @returns A Promise that resolves to the generated subtitles
 */
export const processVideoAndGenerateSubtitles = async (
    videoFile: File,
    apiKey: string,
    onProgress?: (progress: number, total: number, stage?: string) => void
): Promise<string> => {
    try {
        // Update progress - Extracting audio
        if (onProgress) {
            onProgress(0, 100, 'extracting audio');
        }

        // Step 1: Extract audio from video
        const audioBlob = await extractAudioFromVideo(videoFile);

        // Update progress - Generating subtitles
        if (onProgress) {
            onProgress(50, 100, 'generating subtitles');
        }

        // Step 2: Generate subtitles directly from the audio
        const subtitles = await generateSubtitlesFromAudio(audioBlob, apiKey);

        // Final progress update
        if (onProgress) {
            onProgress(100, 100, 'complete');
        }

        return subtitles;
    } catch (error) {
        console.error('Error processing video:', error);

        // Update progress to show error state
        if (onProgress) {
            onProgress(100, 100, 'error');
        }

        throw error;
    }
};

// Helper function to get language name from code
const getLanguageName = (code: string): string => {
    const languages: Record<string, string> = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'nl': 'Dutch',
        'ru': 'Russian',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ar': 'Arabic',
        'fa': 'Persian',
        'hi': 'Hindi',
        'bn': 'Bengali',
        'tr': 'Turkish',
        'pl': 'Polish',
        'vi': 'Vietnamese',
        'th': 'Thai',
        'id': 'Indonesian',
        'ms': 'Malay',
    };

    return languages[code] || code;
};