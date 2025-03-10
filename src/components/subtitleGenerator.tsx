"use client"

import React, { useState } from 'react';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { parseSubtitles, chunkSubtitles, blocksToString, SubtitleBlock } from '../utils/subtitleParser';
import { extractAudioFromVideo, generateSubtitlesFromAudio, translateSubtitles } from '../utils/videoProcessor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CloudUpload, Github, Download, Loader2, Clapperboard, FileVideo } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Types for our application
type APIProvider = 'openai' | 'gemini' | 'deepseek' | 'anthropic';

interface TranslationState {
    isLoading: boolean;
    error: string | null;
    result: string | null;
    progress: number;
    total: number;
}

interface GenerationState {
    isLoading: boolean;
    error: string | null;
    result: string | null;
    progress?: number;
    total?: number;
    stage?: string;
}

function countSubtitleLines(text: string): number {
    // Split by double newline to get subtitle blocks
    const blocks = text.split('\n\n');
    return blocks.filter(block => block.trim()).length;
}

const SubtitleGenerator = () => {
    // Tab state
    const [activeTab, setActiveTab] = useState<string>("translate");

    // Translation state
    const [selectedProvider, setSelectedProvider] = useState<APIProvider>('openai');
    const [targetLanguage, setTargetLanguage] = useState<string>('en');
    const [apiKey, setApiKey] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [translation, setTranslation] = useState<TranslationState>({
        isLoading: false,
        error: null,
        result: null,
        progress: 0,
        total: 0,
    });

    // Generation state
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [generationLanguage, setGenerationLanguage] = useState<string>('en');
    const [generation, setGeneration] = useState<GenerationState>({
        isLoading: false,
        error: null,
        result: null,
    });

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ru', name: 'Russian' },
        { code: 'zh', name: 'Chinese' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'ar', name: 'Arabic' },
        { code: 'fa', name: 'Persian' },
        { code: 'hi', name: 'Hindi' },
        { code: 'tr', name: 'Turkish' },
        { code: 'nl', name: 'Dutch' },
        { code: 'pl', name: 'Polish' },
        { code: 'vi', name: 'Vietnamese' },
        { code: 'th', name: 'Thai' },
    ].sort((a, b) => a.name.localeCompare(b.name));

    // API translation functions for each provider
    const translateWithOpenAI = async (text: string, targetLang: string): Promise<string> => {
        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({
            model: "gpt-4o-latest",
            messages: [
                {
                    role: "system",
                    content: `Translate the following subtitle text to ${targetLang}. Maintain the original timing and formatting. Only return the translated subtitles without any additional text or explanations.`
                },
                {
                    role: "user",
                    content: text
                }
            ]
        });
        return response.choices[0]?.message?.content || '';
    };

    const translateWithGemini = async (text: string, targetLang: string): Promise<string> => {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `Translate the following subtitle text to ${targetLang}. Maintain the original timing and formatting. Only return the translated subtitles without any additional text or explanations:\n\n${text}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    };

    const translateWithAnthropic = async (text: string, targetLang: string): Promise<string> => {
        const anthropic = new Anthropic({ apiKey });
        const response = await anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219",
            max_tokens: 4096,
            messages: [{
                role: "user",
                content: `Translate the following subtitle text to ${targetLang}. Maintain the original timing and formatting. Only return the translated subtitles without any additional text or explanations:\n\n${text}`
            }]
        });

        // Extract text from content array
        const translatedText = response.content
            .filter(block => block.type === "text")
            .map(block => block.text)
            .join("\n");

        return translatedText.trim();
    };


    const translateWithDeepSeek = async (text: string, targetLang: string): Promise<string> => {
        // DeepSeek API implementation through OpenRouter
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-chat',
                messages: [
                    {
                        role: "system",
                        content: `Translate the following subtitle text to ${targetLang}. Maintain the original timing and formatting. Only return the translated subtitles without any additional text or explanations.`
                    },
                    {
                        role: "user",
                        content: text
                    }
                ]
            })
        });
        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    };

    // Handle translation based on selected provider
    const translateText = async (text: string, targetLang: string): Promise<string> => {
        switch (selectedProvider) {
            case 'openai':
                return await translateWithOpenAI(text, targetLang);
            case 'gemini':
                return await translateWithGemini(text, targetLang);
            case 'anthropic':
                return await translateWithAnthropic(text, targetLang);
            case 'deepseek':
                return await translateWithDeepSeek(text, targetLang);
            default:
                throw new Error('Invalid provider selected');
        }
    };

    // Handle translation
    const handleTranslate = async () => {
        if (!apiKey || !file) {
            setTranslation({
                isLoading: false,
                error: !apiKey ? 'Please enter an API key' : 'Please upload a subtitle file',
                result: null,
                progress: 0,
                total: 0
            });
            return;
        }

        try {
            setTranslation({
                isLoading: true,
                error: null,
                result: null,
                progress: 0,
                total: 0
            });

            const text = await file.text();
            const subtitleBlocks = parseSubtitles(text);

            // Use the countSubtitleLines function
            const lineCount = countSubtitleLines(text);
            console.log(`Number of subtitle lines: ${lineCount}`);

            const chunks = chunkSubtitles(subtitleBlocks, 100); // 100 subtitles per chunk
            const selectedLang = languages.find(lang => lang.code === targetLanguage)?.name || targetLanguage;

            let allTranslatedBlocks: SubtitleBlock[] = [];
            const failedChunks: number[] = [];

            // Add logging to track progress and identify issues
            console.log('Starting translation process');

            // Process chunks sequentially to maintain order
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const chunkText = blocksToString(chunk);

                try {
                    console.log(`Translating chunk ${i + 1} of ${chunks.length}`);
                    const translatedText = await translateText(chunkText, selectedLang);

                    // Log the translated text for debugging
                    console.log(`Translated text for chunk ${i + 1}:`, translatedText);

                    const translatedChunkBlocks = parseSubtitles(translatedText);

                    // Maintain original timing and index
                    translatedChunkBlocks.forEach((block, idx) => {
                        block.index = chunk[idx].index;
                        block.timing = chunk[idx].timing;
                    });

                    allTranslatedBlocks = [...allTranslatedBlocks, ...translatedChunkBlocks];

                    // Update progress
                    setTranslation(prev => ({
                        ...prev,
                        progress: i + 1,
                        total: chunks.length
                    }));
                } catch (error) {
                    console.error(`Failed to translate chunk ${i + 1}:`, error);
                    failedChunks.push(i + 1);

                    // Add original blocks as placeholder if translation fails
                    allTranslatedBlocks = [...allTranslatedBlocks, ...chunk];
                }

                // Add a small delay between chunks to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const finalText = blocksToString(allTranslatedBlocks);

            setTranslation({
                isLoading: false,
                error: failedChunks.length > 0
                    ? `Translation completed with errors in chunks: ${failedChunks.join(', ')}`
                    : null,
                result: finalText,
                progress: chunks.length,
                total: chunks.length
            });

            // Add logging to track completion
            console.log('Translation process completed');

        } catch (error) {
            setTranslation({
                isLoading: false,
                error: error instanceof Error ? error.message : 'An error occurred during translation',
                result: null,
                progress: 0,
                total: 0
            });
        }
    };

    // Loading message for translation button
    const loadingMessage = translation.isLoading && translation.total > 0 ? (
        <span>
            Translating... ({translation.progress}/{translation.total} chunks)
        </span>
    ) : (
        'Translate Subtitle'
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validExtensions = ['.srt', '.vvt', '.txt'];
            const fileExtension = file.name.split('.').pop();
            if (!validExtensions.includes(`.${fileExtension}`)) {
                setTranslation({
                    isLoading: false,
                    error: 'Please upload a valid subtitle file (.srt, .vvt, .txt)',
                    result: null,
                    progress: 0,
                    total: 0
                });
                return;
            }
            setFile(file);
            setTranslation({
                isLoading: false,
                error: null,
                result: null,
                progress: 0,
                total: 0
            });
        }
    };

    // Handle video file change for subtitle generation
    const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check if file is an MP4
            if (!file.type.includes('video/mp4') && !file.name.toLowerCase().endsWith('.mp4')) {
                setGeneration({
                    isLoading: false,
                    error: 'Please upload a valid MP4 video file',
                    result: null,
                });
                return;
            }
            setVideoFile(file);
            setGeneration({
                isLoading: false,
                error: null,
                result: null,
            });
        }
    };

    // Function to extract audio from video and generate subtitles
    const handleGenerateSubtitles = async () => {
        if (!videoFile) {
            setGeneration({
                isLoading: false,
                error: 'Please upload a video file first',
                result: null,
                progress: 0,
                total: 100,
                stage: 'error'
            });
            return;
        }

        if (!geminiApiKey) {
            setGeneration({
                isLoading: false,
                error: 'Please enter your Gemini API key',
                result: null,
                progress: 0,
                total: 100,
                stage: 'error'
            });
            return;
        }

        try {
            setGeneration({
                isLoading: true,
                error: null,
                result: null,
                progress: 0,
                total: 100,
                stage: 'preparing'
            });

            // Step 1: Generate subtitles in original language
            setGeneration(prev => ({
                ...prev,
                stage: 'extracting audio',
                progress: 10,
                total: 100
            }));

            const audioBlob = await extractAudioFromVideo(videoFile);
            console.log('Audio extracted successfully');

            setGeneration(prev => ({
                ...prev,
                stage: 'generating subtitles',
                progress: 30,
                total: 100
            }));

            const subtitles = await generateSubtitlesFromAudio(audioBlob, geminiApiKey);
            console.log('Subtitles generated successfully:', subtitles.substring(0, 100) + '...');

            // Step 2: Translate subtitles if needed
            // Always translate regardless of the target language
            console.log('Starting translation to', generationLanguage);
            setGeneration(prev => ({
                ...prev,
                stage: 'translating subtitles',
                progress: 60,
                total: 100
            }));

            try {
                console.log('Calling translateSubtitles function');
                const translatedSubtitles = await translateSubtitles(subtitles, geminiApiKey, generationLanguage);
                console.log('Translation successful:', translatedSubtitles.substring(0, 100) + '...');

                setGeneration({
                    isLoading: false,
                    error: null,
                    result: translatedSubtitles,
                    progress: 100,
                    total: 100,
                    stage: 'complete'
                });
            } catch (translationError) {
                console.error('Translation error:', translationError);
                // If translation fails, still show the original subtitles
                setGeneration({
                    isLoading: false,
                    error: 'Translation failed: ' + (translationError instanceof Error ? translationError.message : String(translationError)),
                    result: subtitles, // Use original subtitles
                    progress: 100,
                    total: 100,
                    stage: 'complete'
                });
            }
        } catch (error) {
            console.error('Error generating subtitles:', error);
            setGeneration({
                isLoading: false,
                error: error instanceof Error ? error.message : 'An error occurred during subtitle generation',
                result: null,
                progress: 100,
                total: 100,
                stage: 'error'
            });
        }
    };

    // Helper to get loading message based on stage
    const generationLoadingMessage = () => {
        const progress = generation.progress || 0;
        const total = generation.total || 100;
        const percentage = Math.floor((progress / total) * 100);

        let stageText = '';
        switch (generation.stage) {
            case 'extracting audio':
                stageText = 'Extracting audio';
                break;
            case 'generating subtitles':
                stageText = 'Generating subtitles';
                break;
            case 'translating subtitles':
                stageText = 'Translating subtitles';
                break;
            case 'complete':
                stageText = 'Completed';
                break;
            default:
                stageText = 'Processing';
        }

        return `${stageText}... ${percentage}%`;
    };

    // Translate Tab Content
    const TranslateTabContent = () => (
        <div className="flex flex-col p-2 h-full">
            <label className="mb-2 font-semibold text-sm">API Provider</label>
            <Select value={selectedProvider} onValueChange={(value: APIProvider) => setSelectedProvider(value)}>
                <SelectTrigger className="mb-4">
                    <SelectValue placeholder="Select API Provider" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="openai">OpenAI (ChatGPT-4O)</SelectItem>
                    <SelectItem value="gemini">Google (Gemini 2.0 Flash)</SelectItem>
                    <SelectItem value="deepseek">DeepSeek (V3)</SelectItem>
                    <SelectItem value="anthropic">Anthropic (Claude 3.7 Sonnet)</SelectItem>
                </SelectContent>
            </Select>

            <label className="mb-2 font-semibold text-sm">Target Language</label>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger className="mb-4">
                    <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent>
                    {languages.map((language) => (
                        <SelectItem key={language.code} value={language.code}>
                            {language.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <label className="mb-2 font-semibold text-sm">API KEY</label>
            <Input
                type="password"
                placeholder="Enter API Key ..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mb-4"
            />

            <label className="border-dashed border-[1px] p-4 mt-4 flex gap-4 flex-col items-center text-center cursor-pointer w-[100%]">
                <CloudUpload className="w-7 h-7 mb-2 text-gray-900" />
                <p className="text-sm font-semibold">Upload a subtitle or drag and drop</p>
                {file && (
                    <p className="text-sm text-blue-500 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                        Selected: {file.name}
                    </p>
                )}
                <p className="text-gray-500 text-xs">SRT, VVT or TXT files are allowed.</p>
                <input
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                />
            </label>

            {/* Translation Button */}
            <div className="flex flex-col mt-auto">
                <Button
                    className="text-white mt-4 p-2 rounded cursor-pointer"
                    onClick={handleTranslate}
                    disabled={translation.isLoading}
                >
                    {translation.isLoading ? (
                        <>
                            <Loader2 className="animate-spin mr-2 h-4 w-4" />
                            {loadingMessage}
                        </>
                    ) : (
                        'Translate Subtitle'
                    )}
                </Button>

                <Button variant="outline" className="text-black mt-4 p-2 rounded cursor-pointer" onClick={() => window.open('https://github.com/momokoko00/AI-Substitle-Translator', '_blank')}>
                    <Github className="w-4 h-4 mr-2" /> Github
                </Button>

                <p className="text-sm text-black mt-4 text-center">
                    Get your API key for Gemini from <a href="https://aistudio.google.com/apikey" target="_blank" className="text-blue-500 underline">aistudio.google.com/apikey</a>.
                </p>
            </div>

            {/* Error Message */}
            {translation.error && (
                <div className="mt-4 p-3 bg-red-50 rounded-md">
                    <p className="text-sm text-red-700">{translation.error}</p>
                </div>
            )}
        </div>
    );

    // Generate Tab Content
    const GenerateTabContent = () => (
        <div className="flex flex-col p-2 h-full">
            <div className="mb-6 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">
                    <strong>Subtitle Generator</strong> - Currently using Gemini 2.0 Pro Experimental to generate subtitles from video files. It&apos;s a work in progress and may not work as expected.
                </p>
            </div>

            <label className="mb-2 font-semibold text-sm">Gemini API Key</label>
            <Input
                type="password"
                placeholder="Enter your Gemini API key"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="border p-2 rounded mb-4"
            />

            <label className="mb-2 font-semibold text-sm">Output Language</label>
            <Select value={generationLanguage} onValueChange={setGenerationLanguage}>
                <SelectTrigger className="mb-4">
                    <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent>
                    {languages.map((language) => (
                        <SelectItem key={language.code} value={language.code}>
                            {language.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <label className="border-dashed border-[1px] p-4 mt-4 flex gap-4 flex-col items-center text-center cursor-pointer w-[100%]">
                <FileVideo className="w-7 h-7 mb-2 text-gray-900" />
                <p className="text-sm font-semibold">Upload a video file or drag and drop</p>
                {videoFile && (
                    <p className="text-sm text-blue-500 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                        Selected: {videoFile.name}
                    </p>
                )}
                <p className="text-gray-500 text-xs">Only MP4 video files are allowed.</p>
                <input
                    type="file"
                    accept="video/mp4"
                    className="sr-only"
                    onChange={handleVideoFileChange}
                />
            </label>

            {/* Generation Button */}
            <div className="flex flex-col mt-auto">
                <Button
                    className="text-white mt-4 p-2 rounded cursor-pointer"
                    onClick={handleGenerateSubtitles}
                    disabled={generation.isLoading}
                >
                    {generation.isLoading ? (
                        <>
                            <Loader2 className="animate-spin mr-2 h-4 w-4" />
                            {generationLoadingMessage()}
                        </>
                    ) : (
                        'Generate Subtitles'
                    )}
                </Button>

                <p className="text-sm text-black mt-4 text-center">
                    Get your API key for Gemini from <a href="https://aistudio.google.com/apikey" target="_blank" className="text-blue-500 underline">aistudio.google.com/apikey</a>.
                </p>
            </div>

            {/* Error Message */}
            {generation.error && (
                <div className="mt-4 p-3 bg-red-50 rounded-md">
                    <p className="text-sm text-red-700">{generation.error}</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-10 gap-8 h-full">
            <div className="col-span-1 md:col-span-3 h-full">
                <div className="flex flex-col p-2 h-full">
                    <div className="flex items-center mb-8">
                        <Clapperboard className="w-6 h-6 mr-2" />
                        <h1 className="text-xl font-bold">AI Subtitle Generator</h1>
                    </div>

                    <Tabs value={activeTab} onValueChange={(value) => {
                        setActiveTab(value);
                        // Clear previews when switching tabs
                        if (value === "translate") {
                            setGeneration({
                                isLoading: false,
                                error: null,
                                result: null
                            });
                        } else if (value === "generate") {
                            setTranslation({
                                isLoading: false,
                                error: null,
                                result: null,
                                progress: 0,
                                total: 0
                            });
                        }
                    }} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="translate">Translate</TabsTrigger>
                            <TabsTrigger value="generate">Generate</TabsTrigger>
                        </TabsList>
                        <TabsContent value="translate">
                            <TranslateTabContent />
                        </TabsContent>
                        <TabsContent value="generate">
                            <GenerateTabContent />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
            <div className="col-span-1 md:col-span-7 h-[99vh] md:overflow-hidden flex flex-col">
                {activeTab === "translate" && translation.result ? (
                    <div className="flex-grow md:overflow-hidden bg-gray-100 p-4 mt-4 rounded flex flex-col h-full">
                        <h2 className="text-m font-semibold mb-4">Preview Subtitle:</h2>
                        <div className="flex justify-end w-full mb-4">
                            <Button
                                variant="outline"
                                className="text-black p-2 rounded flex items-center w-[100%]"
                                onClick={() => {
                                    const blob = new Blob([translation.result || ''], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `translated_subtitles_${targetLanguage}.srt`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download Subtitle
                            </Button>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            <pre className="whitespace-pre-wrap text-sm text-gray-700">
                                {translation.result}
                            </pre>
                        </div>
                    </div>
                ) : activeTab === "generate" && generation.result ? (
                    <div className="flex-grow md:overflow-hidden bg-gray-100 p-4 mt-4 rounded flex flex-col h-full">
                        <h2 className="text-m font-semibold mb-4">Generated Subtitle{generationLanguage !== 'en' ? ` (${languages.find(l => l.code === generationLanguage)?.name || generationLanguage})` : ''}:</h2>
                        <div className="flex justify-end w-full mb-4">
                            <Button
                                variant="outline"
                                className="text-black p-2 rounded flex items-center w-[100%]"
                                onClick={() => {
                                    const blob = new Blob([generation.result || ''], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `generated_subtitles${generationLanguage !== 'en' ? `_${generationLanguage}` : ''}.srt`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download Subtitle
                            </Button>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            <pre className="whitespace-pre-wrap text-sm text-gray-700">
                                {generation.result}
                            </pre>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center items-center bg-gray-100 p-4 mt-4 rounded h-full">
                        <p className="text-gray-500">Translated or generated subtitles will appear here</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubtitleGenerator;