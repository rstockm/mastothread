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
        const manualChunks = text.split('---');
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
        chunk = chunk.replace(/\n/g, '<br>');  // Respect newlines
        chunk = chunk.replace(/(http[s]?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
        chunk = chunk.replace(/#(\w+)/g, '<a href="https://mastodon.social/tags/$1" target="_blank">#$1</a>');
        chunk = chunk.replace(/@(\w+)/g, '<a href="https://mastodon.social/@$1" target="_blank">@$1</a>');
        return chunk;
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
                    <span class="char-count">${charCount} chars</span>
                    <button class="btn btn-secondary btn-copy" data-text="${chunk}${paginationText}">Copy</button>
                    <div class="alert alert-secondary">
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
    
        // Add the copied class to the button to change its color
        $(this).addClass('copied');
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


});