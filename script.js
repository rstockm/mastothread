$(document).ready(function() {
    // Debounce function
    function debounce(func, wait = 500) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, wait);
        };
    }

    function escapeHTML(text) {
    return text.replace(/&/g, '&amp;')  // First, escape ampersands
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#39;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
    }

    function getCharacterLimit() {
        let limit = parseInt($('#charLimit').val(), 10);
        if (isNaN(limit) || limit <= 0) {
            limit = 500;
        }
        return limit;
    }

    function splitText(text) {
        const charLimit = getCharacterLimit();
        let chunks = [];

        // Split the text at manual split points first
        const manualChunks = text.split('===');
        manualChunks.forEach(manualChunk => {
            manualChunk = manualChunk.trim();
            while (manualChunk.length) {
                if (manualChunk.length <= charLimit) {
                    chunks.push(manualChunk);
                    break;
                }

                let chunk;
                let sliceEnd = charLimit;
                let lastPeriod = manualChunk.lastIndexOf('.', sliceEnd);
                let lastSpace = manualChunk.lastIndexOf(' ', sliceEnd);

                if (lastPeriod > charLimit - 100) {
                    sliceEnd = lastPeriod + 1;
                } else if (lastSpace !== -1) {
                    sliceEnd = lastSpace;
                }

                chunk = manualChunk.slice(0, sliceEnd);
                manualChunk = manualChunk.slice(sliceEnd).trim();

                chunks.push(chunk);
            }
        });

        return chunks;
    }

    function formatChunk(chunk) {
        // First, create a working copy of the chunk
        let workingChunk = chunk;
        
        // Normalize line breaks in the input to make processing consistent
        // Convert all line endings to '\n' for consistent processing
        workingChunk = workingChunk.replace(/\r\n|\r/g, '\n');
        
        // Split the text by newlines and process each line separately
        const lines = workingChunk.split('\n');
        const processedLines = [];
        
        for (let line of lines) {
            // Handle empty lines
            if (!line.trim()) {
                processedLines.push('');
                continue;
            }
            
            // Process the line
            let processedLine = processLine(line);
            processedLines.push(processedLine);
        }
        
        // Join the lines back with <br> tags
        return processedLines.join('<br>');
    }
    
    // Helper function to process a single line of text
    function processLine(line) {
        // Array to hold text parts
        const parts = [];
        let lastIndex = 0;
        
        // Track special regions to avoid processing twice
        let processedRegions = [];
        
        // First, identify URLs - we need to mark them to avoid conflicts with mentions inside URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let match;
        
        while ((match = urlRegex.exec(line)) !== null) {
            const url = match[0];
            const start = match.index;
            const end = start + url.length;
            
            processedRegions.push({
                start: start,
                end: end,
                type: 'url',
                content: url,
                html: `<a href="${url}" target="_blank">${url}</a>`
            });
        }
        
        // Find all @username@domain mentions that are NOT inside URLs
        const fullMentionRegex = /@(\w+)@([\w.-]+\.[a-z]{2,})/g;
        
        while ((match = fullMentionRegex.exec(line)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            
            // Check if this mention is inside a URL
            const isInsideProcessedRegion = processedRegions.some(
                region => start >= region.start && end <= region.end
            );
            
            if (!isInsideProcessedRegion) {
                processedRegions.push({
                    start: start,
                    end: end,
                    type: 'fullMention',
                    username: match[1],
                    domain: match[2],
                    content: match[0],
                    html: `<a href="https://${match[2]}/@${match[1]}" target="_blank">${match[0]}</a>`
                });
            }
        }
        
        // Find all simple @username mentions that are NOT inside URLs or full mentions
        const simpleMentionRegex = /@(\w+)(?!@)/g;
        
        while ((match = simpleMentionRegex.exec(line)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            
            // Check if this mention is inside another processed region
            const isInsideProcessedRegion = processedRegions.some(
                region => start >= region.start && end <= region.end
            );
            
            if (!isInsideProcessedRegion) {
                processedRegions.push({
                    start: start,
                    end: end,
                    type: 'simpleMention',
                    username: match[1],
                    content: match[0],
                    html: `<a href="https://mastodon.social/@${match[1]}" target="_blank">${match[0]}</a>`
                });
            }
        }
        
        // Find all hashtags that are NOT inside URLs
        const hashtagRegex = /#(\w+)/g;
        
        while ((match = hashtagRegex.exec(line)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            
            // Check if this hashtag is inside a URL
            const isInsideProcessedRegion = processedRegions.some(
                region => start >= region.start && end <= region.end
            );
            
            if (!isInsideProcessedRegion) {
                processedRegions.push({
                    start: start,
                    end: end,
                    type: 'hashtag',
                    tag: match[1],
                    content: match[0],
                    html: `<a href="https://mastodon.social/tags/${match[1]}" target="_blank">${match[0]}</a>`
                });
            }
        }
        
        // Sort all processed regions by start position
        processedRegions.sort((a, b) => a.start - b.start);
        
        // Rebuild the string with all replacements
        lastIndex = 0;
        for (const region of processedRegions) {
            // Add text before this region
            parts.push(line.substring(lastIndex, region.start));
            
            // Add the formatted HTML for this region
            parts.push(region.html);
            
            lastIndex = region.end;
        }
        
        // Add remaining text
        parts.push(line.substring(lastIndex));
        
        // Join all parts back together
        return parts.join('');
    }

    $('#inputText').on('input', debounce(function() {
        const text = $(this).val();
        const chunks = splitText(text) || [];
        const totalPosts = chunks.length;
        const paginationEnabled = $('#paginationCheckbox').prop('checked');

        $('#previewArea').empty();
        chunks.forEach((chunk, index) => {
            const charCount = chunk.length;
            const formattedChunk = formatChunk(chunk);
            
            let paginationText = "";
            if (paginationEnabled) {
                paginationText = `\n${index + 1}/${totalPosts}`;
            }

            $('#previewArea').append(`
                <div class="post-container">
                    <div class="alert alert-secondary">
                        <button class="btn btn-secondary btn-copy" data-text="${escapeHTML(chunk + paginationText)}">Copy</button>
                        <span class="char-count">${charCount} chars</span>
                        ${formattedChunk}
                        ${paginationText ? `<br><span class="post-number">${paginationText}</span>` : ''}
                    </div>
                </div>
            `);
        });
    }));

    $('#applyLimit').on('click', function() {
        // Trigger the input event to refresh the preview
        $('#inputText').trigger('input');
    });

    $(document).on('click', '.btn-copy', function() {
        const textToCopy = $(this).data('text');
        const textarea = $('<textarea>');
        textarea.text(textToCopy);
        $('body').append(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
    
        // Change the button text to "Copied"
        $(this).text('Copied');
        // Reset button text after 2 seconds
        setTimeout(() => {
            $(this).text('Copy');
        }, 2000);

        // Add the copied class to the button to change its color
        $(this).addClass('copied');

        // Add the copied-post class to the parent post-container to change its background
        $(this).closest('.post-container').addClass('copied-post');
    });
    
    


// Define an array of subtitles and a counter for tracking the current subtitle
const subtitles = [
    "Weaving Stories, One Post at a Time.",
    "Stitching Ideas into Threads.",
    "From Long Reads to Bitesize Posts!",
    "Unraveling Thoughts, Thread by Thread.",
    "Crafting Narratives, Mastodon Style!",
    "Divide, Post, Conquer!",
    "Your Ideas, Seamlessly Threaded.",
    "Transform Monologues into Dialogues!",
    "Empowering Lengthy Ideas on Mastodon!",
    "Compose, Split, Share!"
];

let currentSubtitleIndex = 0;

function changeSubtitle() {
    currentSubtitleIndex++;
    if (currentSubtitleIndex >= subtitles.length) {
        currentSubtitleIndex = 0; // Reset to the beginning
    }
    $(".subtitle").text(subtitles[currentSubtitleIndex]);
}

// Initially set the first subtitle and then change it every 10 seconds
$(".subtitle").text(subtitles[currentSubtitleIndex]);
setInterval(changeSubtitle, 10000);

$('#inputText').trigger('input');
    
});
