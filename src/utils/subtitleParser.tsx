export interface SubtitleBlock {
    index: number;
    timing: string;
    content: string[];
}

export function parseSubtitles(text: string): SubtitleBlock[] {
    // Normalize line endings to handle different formats
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const blocks = normalizedText.trim().split('\n\n');

    return blocks
        .filter(block => block.trim())
        .map((block, idx) => {
            const lines = block.split('\n');
            const index = parseInt(lines[0]) || (idx + 1);
            const timing = lines[1];
            const content = lines.slice(2);

            // Log each block for debugging
            console.log(`Parsed block ${index}:`, { timing, content });

            return { index, timing, content };
        });
}

export function chunkSubtitles(blocks: SubtitleBlock[], maxBlocksPerChunk: number = 100): SubtitleBlock[][] {
    const chunks: SubtitleBlock[][] = [];
    let currentChunk: SubtitleBlock[] = [];
    let currentSize = 0;

    for (const block of blocks) {
        // Calculate approximate size of current block
        const blockSize = block.content.join('\n').length;

        // If adding this block would exceed chunk size limit, start new chunk
        if (currentChunk.length >= maxBlocksPerChunk || currentSize + blockSize > 4000) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = [];
                currentSize = 0;
            }
        }

        currentChunk.push(block);
        currentSize += blockSize;
    }

    // Add the last chunk if it's not empty
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    console.log(`Created ${chunks.length} chunks from ${blocks.length} blocks`);
    return chunks;
}

export function blocksToString(blocks: SubtitleBlock[]): string {
    return blocks
        .map(block => `${block.index}\n${block.timing}\n${block.content.join('\n')}`)
        .join('\n\n');
}
