const SHARP_SCALE = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
const FLAT_SCALE =  ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'];
const LOCAL_STORAGE_KEY = 'myDigitalSongbookData';
const SETLIST_STORAGE_KEY = 'myDigitalSongbookSetlist';
const THEME_STORAGE_KEY = 'myDigitalSongbookTheme';
const DEFAULT_TUNING = 'Whole Step Down';
const FEATURED_ARTISTS = ['Miranda Smart', 'CLAW MACHINE', 'Appalachian Rejects'];
const CHORD_TOKEN_REGEX = /[A-G][#b]?[^/\s]*(?:\/[A-G][#b]?)?/g;
const INLINE_CHORD_REGEX = /\[([^\]]+)\]/g;
let scrollInterval = null; // To hold the auto-scroll interval

const CHORD_DIAGRAMS = {
    C: 'e|--0--\nB|--1--\nG|--0--\nD|--2--\nA|--3--\nE|--x--',
    Cm: 'e|--3--\nB|--4--\nG|--5--\nD|--5--\nA|--3--\nE|--x--',
    C7: 'e|--0--\nB|--1--\nG|--3--\nD|--2--\nA|--3--\nE|--x--',
    D: 'e|--2--\nB|--3--\nG|--2--\nD|--0--\nA|--x--\nE|--x--',
    Dm: 'e|--1--\nB|--3--\nG|--2--\nD|--0--\nA|--x--\nE|--x--',
    D7: 'e|--2--\nB|--1--\nG|--2--\nD|--0--\nA|--x--\nE|--x--',
    E: 'e|--0--\nB|--0--\nG|--1--\nD|--2--\nA|--2--\nE|--0--',
    Em: 'e|--0--\nB|--0--\nG|--0--\nD|--2--\nA|--2--\nE|--0--',
    E7: 'e|--0--\nB|--0--\nG|--1--\nD|--0--\nA|--2--\nE|--0--',
    F: 'e|--1--\nB|--1--\nG|--2--\nD|--3--\nA|--3--\nE|--1--',
    Fm: 'e|--1--\nB|--1--\nG|--1--\nD|--3--\nA|--3--\nE|--1--',
    G: 'e|--3--\nB|--0--\nG|--0--\nD|--0--\nA|--2--\nE|--3--',
    Gm: 'e|--3--\nB|--3--\nG|--3--\nD|--5--\nA|--5--\nE|--3--',
    G7: 'e|--1--\nB|--0--\nG|--0--\nD|--0--\nA|--2--\nE|--3--',
    A: 'e|--0--\nB|--2--\nG|--2--\nD|--2--\nA|--0--\nE|--x--',
    Am: 'e|--0--\nB|--1--\nG|--2--\nD|--2--\nA|--0--\nE|--x--',
    A7: 'e|--0--\nB|--2--\nG|--0--\nD|--2--\nA|--0--\nE|--x--',
    B: 'e|--2--\nB|--4--\nG|--4--\nD|--4--\nA|--2--\nE|--x--',
    Bm: 'e|--2--\nB|--3--\nG|--4--\nD|--4--\nA|--2--\nE|--x--',
    B7: 'e|--2--\nB|--0--\nG|--2--\nD|--1--\nA|--2--\nE|--x--',
    Bb: 'e|--1--\nB|--3--\nG|--3--\nD|--3--\nA|--1--\nE|--x--',
    'Bb7': 'e|--1--\nB|--3--\nG|--1--\nD|--3--\nA|--1--\nE|--x--',
    'F#': 'e|--2--\nB|--2--\nG|--3--\nD|--4--\nA|--4--\nE|--2--',
    'F#m': 'e|--2--\nB|--2--\nG|--2--\nD|--4--\nA|--4--\nE|--2--',
    'C#': 'e|--4--\nB|--6--\nG|--6--\nD|--6--\nA|--4--\nE|--x--',
    'C#m': 'e|--4--\nB|--5--\nG|--6--\nD|--6--\nA|--4--\nE|--x--'
};

/**
 * Transposes a single "chord word" (e.g., "Am", "G7", "C/G") by a given amount of semitones.
 * @param {string} chord The chord to transpose.
 * @param {number} amount The number of semitones to transpose (can be positive or negative).
 * @returns {string} The transposed chord.
 */
function transposeChord(chord, amount) {
    // Handles slash chords by splitting them and transposing each part.
    const [chordPart, bassPart] = chord.split('/');
    const transposedChord = transposeSingleRoot(chordPart, amount);

    if (bassPart) {
        const transposedBass = transposeSingleRoot(bassPart, amount);
        return `${transposedChord}/${transposedBass}`;
    }
    return transposedChord;
}

function transposeSingleRoot(fullChord, amount) {
    const rootMatch = fullChord.match(/^[A-G][#b]?/);
    if (!rootMatch) return fullChord; // Not a valid chord structure

    const root = rootMatch[0];
    const suffix = fullChord.substring(root.length);

    // Find the note's position in the chromatic scale (0-11)
    let pitchIndex = SHARP_SCALE.indexOf(root);
    if (pitchIndex === -1) {
        pitchIndex = FLAT_SCALE.indexOf(root);
    }
    if (pitchIndex === -1) return fullChord;

    const newPitchIndex = (pitchIndex + amount % 12 + 12) % 12;
    const newRoot = SHARP_SCALE[newPitchIndex]; // Prefers sharp notation for simplicity
    return newRoot + suffix;
}

function sanitizeCapo(value) {
    if (value === '' || value === null || value === undefined) return '';
    const capo = parseInt(value, 10);
    if (Number.isNaN(capo) || capo < 0) return '';
    return capo;
}

function normalizeSong(song) {
    const recordings = Array.isArray(song.recordings)
        ? song.recordings
            .filter(recording => recording && typeof recording.dataUrl === 'string' && recording.dataUrl.startsWith('data:'))
            .map(recording => ({
                id: recording.id || createTakeId(),
                dataUrl: recording.dataUrl,
                durationSec: Number.isFinite(recording.durationSec) ? Math.max(1, Math.round(recording.durationSec)) : 1,
                mimeType: typeof recording.mimeType === 'string' ? recording.mimeType : 'audio/webm',
                createdAt: typeof recording.createdAt === 'string' ? recording.createdAt : new Date().toISOString()
            }))
        : [];

    return {
        ...song,
        tuning: typeof song.tuning === 'string' && song.tuning.trim() ? song.tuning.trim() : DEFAULT_TUNING,
        capo: sanitizeCapo(song.capo),
        recordings
    };
}

function formatRecordingDuration(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

function createTakeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }
    return `take-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function getDiagramKey(chord) {
    const chordPart = chord.split('/')[0];
    const match = chordPart.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return null;

    const root = match[1];
    const rawSuffix = (match[2] || '').trim();
    const tokenizedSuffix = rawSuffix.toLowerCase().replace(/[^a-z0-9#+-]+/g, ' ').trim();
    const hasBarre = /\bbarre\b|\bbar\b/.test(tokenizedSuffix);
    const compactSuffix = rawSuffix
        .toLowerCase()
        .replace(/barre|bar/g, '')
        .replace(/[^a-z0-9#+-]/g, '');

    const suffix = compactSuffix;
    let quality = 'unknown';
    if (!suffix || suffix === 'maj') quality = 'major';
    else if (suffix === 'm' || suffix === 'min' || suffix === '-') quality = 'minor';
    else if (suffix === '7') quality = '7';
    else if (suffix === 'm7' || suffix === 'min7' || suffix === '-7') quality = 'm7';
    else if (suffix === 'maj7' || suffix === 'ma7' || suffix === 'm7+') quality = 'maj7';

    return `${root}:${quality}:${hasBarre ? 'barre' : 'auto'}`;
}

function normalizeRootToSharp(root) {
    const enharmonic = {
        Bb: 'A#',
        Db: 'C#',
        Eb: 'D#',
        Gb: 'F#',
        Ab: 'G#'
    };
    return enharmonic[root] || root;
}

function buildMovableAShapeDiagram(root, quality) {
    const shapeOffsets = {
        major: ['x', 0, 2, 2, 2, 0],
        minor: ['x', 0, 2, 2, 1, 0],
        '7': ['x', 0, 2, 0, 2, 0],
        maj7: ['x', 0, 2, 1, 2, 0],
        m7: ['x', 0, 2, 0, 1, 0]
    };

    const offsets = shapeOffsets[quality];
    if (!offsets) return null;

    const chromatic = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
    const normalizedRoot = normalizeRootToSharp(root);
    const rootFret = chromatic.indexOf(normalizedRoot);
    if (rootFret === -1) return null;

    const frets = offsets.map(offset => (offset === 'x' ? 'x' : String(rootFret + offset)));
    const strings = ['e', 'B', 'G', 'D', 'A', 'E'];

    // Frets are generated in EADGBe order, so reverse when printing.
    const printable = [
        frets[5], frets[4], frets[3], frets[2], frets[1], frets[0]
    ];

    return strings.map((s, i) => `${s}|--${printable[i]}--`).join('\n');
}

function buildMovableEShapeDiagram(root, quality) {
    const shapeOffsets = {
        major: [0, 2, 2, 1, 0, 0],
        minor: [0, 2, 2, 0, 0, 0],
        '7': [0, 2, 0, 1, 0, 0],
        maj7: [0, 2, 1, 1, 0, 0],
        m7: [0, 2, 0, 0, 0, 0]
    };

    const offsets = shapeOffsets[quality];
    if (!offsets) return null;

    const chromatic = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
    const normalizedRoot = normalizeRootToSharp(root);
    const rootIndex = chromatic.indexOf(normalizedRoot);
    const openEIndex = chromatic.indexOf('E');
    if (rootIndex === -1 || openEIndex === -1) return null;

    const rootFret = (rootIndex - openEIndex + 12) % 12;
    const frets = offsets.map(offset => String(rootFret + offset));
    const strings = ['e', 'B', 'G', 'D', 'A', 'E'];

    // Frets are generated in EADGBe order, so reverse when printing.
    const printable = [
        frets[5], frets[4], frets[3], frets[2], frets[1], frets[0]
    ];

    return strings.map((s, i) => `${s}|--${printable[i]}--`).join('\n');
}

function getChordDiagram(chord) {
    const key = getDiagramKey(chord);
    if (!key) return null;

    const [root, quality, shapeMode] = key.split(':');
    const wantsBarre = shapeMode === 'barre';
    const legacyKey =
        quality === 'major' ? root :
        quality === 'minor' ? `${root}m` :
        quality === '7' ? `${root}7` :
        quality === 'm7' ? `${root}m7` :
        quality === 'maj7' ? `${root}maj7` :
        null;

    if (!wantsBarre && legacyKey && CHORD_DIAGRAMS[legacyKey]) {
        return {
            label: legacyKey,
            diagram: CHORD_DIAGRAMS[legacyKey]
        };
    }

    const generated = wantsBarre
        ? buildMovableEShapeDiagram(root, quality)
        : buildMovableAShapeDiagram(root, quality);
    if (!generated) return null;

    const baseLabel =
        quality === 'major' ? root :
        quality === 'minor' ? `${root}m` :
        `${root}${quality}`;
    const label = wantsBarre ? `${baseLabel} (barre)` : baseLabel;

    return {
        label,
        diagram: generated
    };
}

function renderChordLine(chordEl, originalChordLine, transpositionAmount) {
    const source = originalChordLine || ' ';
    chordEl.textContent = '';

    if (source.trim() === '') {
        chordEl.textContent = ' ';
        return;
    }

    let lastIndex = 0;
    source.replace(CHORD_TOKEN_REGEX, (match, offset) => {
        if (offset > lastIndex) {
            chordEl.appendChild(document.createTextNode(source.slice(lastIndex, offset)));
        }

        const transposedChord = transposeChord(match, transpositionAmount);
        const chordToken = document.createElement('span');
        chordToken.className = 'chord-token';
        chordToken.textContent = transposedChord;

        const diagramInfo = getChordDiagram(transposedChord);
        if (diagramInfo) {
            const tooltip = document.createElement('span');
            tooltip.className = 'chord-tooltip';
            tooltip.textContent = `${diagramInfo.label}\n${diagramInfo.diagram}`;
            chordToken.appendChild(tooltip);
        }

        chordEl.appendChild(chordToken);
        lastIndex = offset + match.length;
        return match;
    });

    if (lastIndex < source.length) {
        chordEl.appendChild(document.createTextNode(source.slice(lastIndex)));
    }
}

function isChordToken(token) {
    return /^[A-G][#b]?(?:[a-zA-Z0-9()+-]*)(?:\/[A-G][#b]?)?$/.test(token);
}

function isChordLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;
    const tokens = trimmed.split(/\s+/);
    if (tokens.length === 0) return false;
    return tokens.every(isChordToken);
}

function parseInlineChordLyricLine(line) {
    let match;
    let lastIndex = 0;
    let lyric = '';
    const chordPlacements = [];

    while ((match = INLINE_CHORD_REGEX.exec(line)) !== null) {
        const chunk = line.slice(lastIndex, match.index);
        lyric += chunk;
        const chord = match[1].trim();
        if (chord) {
            chordPlacements.push({ chord, position: lyric.length });
        }
        lastIndex = INLINE_CHORD_REGEX.lastIndex;
    }
    lyric += line.slice(lastIndex);

    if (chordPlacements.length === 0) {
        return { chords: '', text: lyric };
    }

    const chordChars = Array(Math.max(lyric.length + 16, 32)).fill(' ');
    chordPlacements.forEach(({ chord, position }) => {
        const start = Math.max(0, position);
        for (let i = 0; i < chord.length; i++) {
            chordChars[start + i] = chord[i];
        }
    });

    return {
        chords: chordChars.join('').trimEnd(),
        text: lyric
    };
}

function cleanUltimateGuitarPaste(rawText) {
    const removableLinePatterns = [
        /^ultimate[-\s]?guitar/i,
        /^ug\b/i,
        /^add to favorites/i,
        /^difficulty:/i,
        /^artist:/i,
        /^song:/i,
        /^album:/i,
        /^author:/i,
        /^submitted by/i,
        /^tabs? .*by/i,
        /^strumming/i,
        /^tempo:/i,
        /^bpm:/i,
        /^url:/i,
        /^https?:\/\//i,
        /^advertisement$/i,
        /^report bad tab/i,
        /^to suggest a correction/i,
        /^learn how to play/i,
        /^capo:\s*\d+/i,
        /^tuning:\s*/i,
        /^key:\s*/i
    ];

    const lines = rawText.replace(/\r/g, '').split('\n');
    const cleanedLines = [];
    let previousWasBlank = false;

    lines.forEach((line) => {
        const trimmed = line.trim();

        if (trimmed === '') {
            if (!previousWasBlank) {
                cleanedLines.push('');
            }
            previousWasBlank = true;
            return;
        }

        const shouldRemove = removableLinePatterns.some(pattern => pattern.test(trimmed));
        if (shouldRemove) {
            return;
        }

        cleanedLines.push(line);
        previousWasBlank = false;
    });

    while (cleanedLines.length > 0 && cleanedLines[0].trim() === '') {
        cleanedLines.shift();
    }
    while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].trim() === '') {
        cleanedLines.pop();
    }

    return cleanedLines.join('\n');
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch((error) => {
            console.error('Service worker registration failed:', error);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();

    const tocContainer = document.getElementById('table-of-contents');
    const setlistContainer = document.getElementById('setlist-contents');
    const songDisplayContainer = document.getElementById('song-display');
    let songsData = [];
    let setlistSongIds = loadSetlist();
    let activeRecorder = null;

    // New elements for the "Add Song" modal
    const addSongModal = document.getElementById('add-song-modal');
    const addSongBtn = document.getElementById('add-song-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const songForm = document.getElementById('song-form');
    const searchBar = document.getElementById('search-bar');
    const modalTitle = document.getElementById('modal-title');
    const songFormSubmitBtn = document.getElementById('song-form-submit-btn');
    const importSongsBtn = document.getElementById('import-songs-btn');
    const songFileInput = document.getElementById('song-file-input');
    const exportSongsBtn = document.getElementById('export-songs-btn');
    const openOcrBtn = document.getElementById('open-ocr-btn');
    const pasteUgBtn = document.getElementById('paste-ug-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const coverArtistContainer = document.getElementById('cover-artist-container');
    const coverArtistNameInput = document.getElementById('cover-artist-name');
    const ocrModal = document.getElementById('ocr-modal');
    const closeOcrModalBtn = document.getElementById('close-ocr-modal-btn');
    const ocrImageInput = document.getElementById('ocr-image-input');
    const ocrCameraBtn = document.getElementById('ocr-camera-btn');
    const ocrProcessBtn = document.getElementById('ocr-process-btn');
    const ocrVideoStream = document.getElementById('ocr-video-stream');
    const ocrCameraView = document.getElementById('ocr-camera-view');
    const ocrCaptureBtn = document.getElementById('ocr-capture-btn');
    const ocrCloseCameraBtn = document.getElementById('ocr-close-camera-btn');
    const ocrCaptureCanvas = document.getElementById('ocr-capture-canvas');
    const ocrStatusText = document.getElementById('ocr-status-text');
    const ocrPreviewContainer = document.getElementById('ocr-preview-container');
    const ocrPreviewCanvas = document.getElementById('ocr-preview-canvas');
    const ocrClosePreviewBtn = document.getElementById('ocr-close-preview-btn');
    const ocrOutputArea = document.getElementById('ocr-output-area');
    const ocrAutoCorrectBtn = document.getElementById('ocr-auto-correct-btn');
    const ocrCopyBtn = document.getElementById('ocr-copy-btn');
    const ocrDownloadBtn = document.getElementById('ocr-download-btn');
    const ocrUseInSongBtn = document.getElementById('ocr-use-in-song-btn');
    let ocrCameraStream = null;

    function applyTheme(theme) {
        const isDark = theme === 'dark';
        document.body.classList.toggle('dark-mode', isDark);
        themeToggleBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        themeToggleBtn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        return savedTheme === 'dark' ? 'dark' : 'light';
    }

    function saveTheme(theme) {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }

    applyTheme(loadTheme());

    // 1. Fetch song data from the JSON file
    loadInitialData();

    // Handle search bar input
    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredSongs = songsData.filter(song => 
            song.title.toLowerCase().includes(searchTerm) ||
            song.artist.toLowerCase().includes(searchTerm)
        );
        generateTableOfContents(filteredSongs);
    });

    // Handle Import Songs button click
    importSongsBtn.addEventListener('click', () => {
        songFileInput.click(); // Programmatically click the hidden file input
    });

    // Handle file selection for import
    songFileInput.addEventListener('change', (event) => {
        handleFileImport(event);
    });

    // Handle Export Songs button click
    exportSongsBtn.addEventListener('click', () => {
        exportSongs();
    });

    themeToggleBtn.addEventListener('click', () => {
        const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
        applyTheme(nextTheme);
        saveTheme(nextTheme);
    });

    pasteUgBtn.addEventListener('click', async () => {
        let rawText = '';
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                rawText = await navigator.clipboard.readText();
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch (error) {
            const manualPaste = window.prompt('Clipboard access is blocked in this browser context. Paste your Ultimate Guitar text below:');
            rawText = manualPaste || '';
        }

        if (!rawText.trim()) {
            alert('No text found to paste.');
            return;
        }

        const cleaned = cleanUltimateGuitarPaste(rawText);
        if (!cleaned.trim()) {
            alert('Nothing usable was found after cleanup.');
            return;
        }

        const current = songForm.lyrics.value.trim();
        if (current && !confirm('Replace current lyrics/chords with the imported Ultimate Guitar content?')) {
            return;
        }

        songForm.lyrics.value = cleaned;
    });

    function setOcrStatus(message) {
        ocrStatusText.textContent = message;
    }

    function autoCorrectOcrText(text) {
        if (!text) return text;
        let corrected = text;
        const corrections = [
            { regex: /\|/g, replace: 'l' },
            { regex: /\b0\b/g, replace: 'o' },
            { regex: /\b1\b/g, replace: 'i' },
            { regex: /\btne\b/gi, replace: 'the' },
            { regex: /\bot\b/gi, replace: 'of' },
            { regex: /\bwha\b/gi, replace: 'what' },
            { regex: /\bii\b/gi, replace: 'u' },
            { regex: /\brn\b/gi, replace: 'm' },
            { regex: /\bvv\b/gi, replace: 'w' },
            { regex: /\bcl\b/gi, replace: 'd' },
            { regex: /\bbein\b/gi, replace: 'being' },
            { regex: /\bl0\b/gi, replace: 'lo' }
        ];
        corrections.forEach(({ regex, replace }) => {
            corrected = corrected.replace(regex, replace);
        });
        return corrected;
    }

    function closeOcrCamera() {
        if (ocrCameraStream) {
            ocrCameraStream.getTracks().forEach(track => track.stop());
            ocrCameraStream = null;
        }
        ocrVideoStream.srcObject = null;
        ocrCameraView.style.display = 'none';
    }

    function closeOcrModal() {
        closeOcrCamera();
        ocrModal.style.display = 'none';
    }

    function preprocessOcrImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    ocrPreviewCanvas.width = canvas.width;
                    ocrPreviewCanvas.height = canvas.height;
                    const previewCtx = ocrPreviewCanvas.getContext('2d');
                    previewCtx.drawImage(canvas, 0, 0);
                    ocrPreviewContainer.style.display = 'block';

                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('Failed to process image.'));
                            return;
                        }
                        resolve(new File([blob], file.name, { type: 'image/png' }));
                    }, 'image/png');
                };
                img.onerror = () => reject(new Error('Invalid image file.'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read image.'));
            reader.readAsDataURL(file);
        });
    }

    openOcrBtn.addEventListener('click', () => {
        ocrModal.style.display = 'flex';
    });

    closeOcrModalBtn.addEventListener('click', closeOcrModal);
    ocrModal.addEventListener('click', (event) => {
        if (event.target === ocrModal) {
            closeOcrModal();
        }
    });

    ocrClosePreviewBtn.addEventListener('click', () => {
        ocrPreviewContainer.style.display = 'none';
    });

    ocrCameraBtn.addEventListener('click', async () => {
        try {
            ocrCameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            ocrVideoStream.srcObject = ocrCameraStream;
            ocrCameraView.style.display = 'block';
            setOcrStatus('Camera ready. Capture a photo.');
        } catch (error) {
            console.error('Camera error:', error);
            setOcrStatus('Camera unavailable or permission denied.');
        }
    });

    ocrCaptureBtn.addEventListener('click', () => {
        if (!ocrVideoStream.videoWidth || !ocrVideoStream.videoHeight) {
            setOcrStatus('Camera not ready yet.');
            return;
        }
        ocrCaptureCanvas.width = ocrVideoStream.videoWidth;
        ocrCaptureCanvas.height = ocrVideoStream.videoHeight;
        const ctx = ocrCaptureCanvas.getContext('2d');
        ctx.drawImage(ocrVideoStream, 0, 0);

        ocrCaptureCanvas.toBlob((blob) => {
            if (!blob) {
                setOcrStatus('Failed to capture photo.');
                return;
            }
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            const dt = new DataTransfer();
            dt.items.add(file);
            ocrImageInput.files = dt.files;
            closeOcrCamera();
            setOcrStatus('Photo captured. Click Transcribe.');
        }, 'image/jpeg', 0.95);
    });

    ocrCloseCameraBtn.addEventListener('click', () => {
        closeOcrCamera();
        setOcrStatus('Camera closed.');
    });

    ocrProcessBtn.addEventListener('click', async () => {
        const file = ocrImageInput.files[0];
        if (!file) {
            alert('Select an image first.');
            return;
        }
        if (!window.Tesseract) {
            setOcrStatus('OCR engine is unavailable.');
            return;
        }

        ocrProcessBtn.disabled = true;
        try {
            setOcrStatus('Preparing image...');
            const processedFile = await preprocessOcrImage(file);

            setOcrStatus('Running OCR...');
            const result = await Tesseract.recognize(processedFile, 'eng', {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        setOcrStatus(`Transcribing: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });

            const rawText = (result.data && result.data.text) ? result.data.text.trim() : '';
            const corrected = autoCorrectOcrText(rawText);
            ocrOutputArea.value = corrected;
            setOcrStatus('Transcription complete.');
        } catch (error) {
            console.error('OCR error:', error);
            setOcrStatus(`OCR failed: ${error.message || 'unknown error'}`);
        } finally {
            ocrProcessBtn.disabled = false;
        }
    });

    ocrAutoCorrectBtn.addEventListener('click', () => {
        if (!ocrOutputArea.value.trim()) {
            setOcrStatus('No text to correct.');
            return;
        }
        ocrOutputArea.value = autoCorrectOcrText(ocrOutputArea.value);
        setOcrStatus('Auto-corrected.');
    });

    ocrCopyBtn.addEventListener('click', async () => {
        if (!ocrOutputArea.value.trim()) {
            setOcrStatus('No text to copy.');
            return;
        }
        try {
            await navigator.clipboard.writeText(ocrOutputArea.value);
            setOcrStatus('Copied to clipboard.');
        } catch (error) {
            ocrOutputArea.select();
            document.execCommand('copy');
            setOcrStatus('Copied to clipboard.');
        }
    });

    ocrDownloadBtn.addEventListener('click', () => {
        const text = ocrOutputArea.value;
        if (!text.trim()) {
            setOcrStatus('No text to download.');
            return;
        }
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcribed_lyrics.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setOcrStatus('Downloaded text file.');
    });

    ocrUseInSongBtn.addEventListener('click', () => {
        if (!ocrOutputArea.value.trim()) {
            setOcrStatus('No text to import into song form.');
            return;
        }
        addSongModal.style.display = 'flex';
        songForm.lyrics.value = ocrOutputArea.value;
        closeOcrModal();
    });

    // Handle artist dropdown change
    songForm.artist.addEventListener('change', (e) => {
        if (e.target.value === 'Cover') {
            coverArtistContainer.style.display = 'block';
            coverArtistNameInput.required = true;
        } else {
            coverArtistContainer.style.display = 'none';
            coverArtistNameInput.required = false;
        }
    });

    // 2. Generate the list of songs in the sidebar
    function generateTableOfContents(songs) {
        tocContainer.innerHTML = ''; // Clear existing content

        const createSongListItem = (song) => {
            const listItem = document.createElement('li');
            const row = document.createElement('div');
            row.className = 'toc-row';

            const link = document.createElement('a');
            link.href = `#${song.id}`;
            link.textContent = song.title;
            link.dataset.songId = song.id;
            link.addEventListener('click', (event) => {
                event.preventDefault();
                displaySong(song.id);
            });

            const copyToSetlistButton = document.createElement('button');
            copyToSetlistButton.type = 'button';
            copyToSetlistButton.className = 'toc-copy-button';
            copyToSetlistButton.textContent = '+';
            copyToSetlistButton.title = 'Copy to setlist';
            copyToSetlistButton.addEventListener('click', () => {
                addSongToSetlist(song.id);
            });

            row.appendChild(link);
            row.appendChild(copyToSetlistButton);
            listItem.appendChild(row);
            return listItem;
        };

        const renderGroupSection = (title, groupSongs) => {
            if (groupSongs.length === 0) return;

            const sectionItem = document.createElement('li');
            sectionItem.className = 'toc-group';

            const sectionTitle = document.createElement('h3');
            sectionTitle.className = 'toc-group-title';
            sectionTitle.textContent = title;
            sectionItem.appendChild(sectionTitle);

            const songList = document.createElement('ul');
            songList.className = 'toc-sublist';
            groupSongs.forEach(song => {
                songList.appendChild(createSongListItem(song));
            });

            sectionItem.appendChild(songList);
            tocContainer.appendChild(sectionItem);
        };

        FEATURED_ARTISTS.forEach(artist => {
            const artistSongs = songs.filter(song => song.artist === artist);
            renderGroupSection(artist, artistSongs);
        });

        const coverSongs = songs.filter(song => !FEATURED_ARTISTS.includes(song.artist));
        if (coverSongs.length > 0) {
            const coverSectionItem = document.createElement('li');
            coverSectionItem.className = 'toc-group';

            const coverTitle = document.createElement('h3');
            coverTitle.className = 'toc-group-title';
            coverTitle.textContent = 'Cover';
            coverSectionItem.appendChild(coverTitle);

            const coverArtistTree = document.createElement('div');
            coverArtistTree.className = 'cover-artist-tree';

            const songsByCoverArtist = new Map();
            coverSongs.forEach(song => {
                if (!songsByCoverArtist.has(song.artist)) {
                    songsByCoverArtist.set(song.artist, []);
                }
                songsByCoverArtist.get(song.artist).push(song);
            });

            [...songsByCoverArtist.keys()].sort((a, b) => a.localeCompare(b)).forEach(artist => {
                const artistGroup = document.createElement('details');
                artistGroup.className = 'cover-artist-group';
                artistGroup.open = true;

                const summary = document.createElement('summary');
                summary.textContent = artist;
                artistGroup.appendChild(summary);

                const songList = document.createElement('ul');
                songList.className = 'toc-sublist';
                songsByCoverArtist.get(artist).forEach(song => {
                    songList.appendChild(createSongListItem(song));
                });

                artistGroup.appendChild(songList);
                coverArtistTree.appendChild(artistGroup);
            });

            coverSectionItem.appendChild(coverArtistTree);
            tocContainer.appendChild(coverSectionItem);
        }

        if (tocContainer.children.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'setlist-empty';
            emptyItem.textContent = 'No songs found.';
            tocContainer.appendChild(emptyItem);
        }
    }

    function renderSetlist() {
        setlistContainer.innerHTML = '';

        if (setlistSongIds.length === 0) {
            const emptyState = document.createElement('li');
            emptyState.className = 'setlist-empty';
            emptyState.textContent = 'No setlist songs yet.';
            setlistContainer.appendChild(emptyState);
            return;
        }

        setlistSongIds.forEach(songId => {
            const song = songsData.find(item => item.id === songId);
            if (!song) return;

            const listItem = document.createElement('li');
            const row = document.createElement('div');
            row.className = 'toc-row';

            const link = document.createElement('a');
            link.href = `#${song.id}`;
            link.textContent = song.title;
            link.dataset.songId = song.id;
            link.addEventListener('click', (event) => {
                event.preventDefault();
                displaySong(song.id);
            });

            const removeFromSetlistButton = document.createElement('button');
            removeFromSetlistButton.type = 'button';
            removeFromSetlistButton.className = 'setlist-remove-button';
            removeFromSetlistButton.textContent = 'Remove';
            removeFromSetlistButton.title = 'Remove from setlist';
            removeFromSetlistButton.addEventListener('click', () => {
                removeSongFromSetlist(song.id);
            });

            row.appendChild(link);
            row.appendChild(removeFromSetlistButton);
            listItem.appendChild(row);
            setlistContainer.appendChild(listItem);
        });
    }

    function addSongToSetlist(songId) {
        if (!setlistSongIds.includes(songId)) {
            setlistSongIds.push(songId);
            saveSetlist();
            renderSetlist();
        }
    }

    function removeSongFromSetlist(songId) {
        const nextSetlist = setlistSongIds.filter(id => id !== songId);
        if (nextSetlist.length !== setlistSongIds.length) {
            setlistSongIds = nextSetlist;
            saveSetlist();
            renderSetlist();
        }
    }

    // 3. Display the selected song in the main area
    function displaySong(songId) {
        if (activeRecorder) {
            alert('Stop the current recording before changing views.');
            return;
        }

        const song = songsData.find(s => s.id === songId);
        if (!song) return;

        // Clear any active scroll from a previous song
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }

        // Clear previous song and reset scroll position
        songDisplayContainer.innerHTML = '';
        songDisplayContainer.scrollTop = 0;

        let currentTransposition = 0;

        // --- Create Controls ---
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'song-controls-container';

        // Create and add transpose controls
        const transposeControls = document.createElement('div');
        transposeControls.className = 'transpose-controls';
        transposeControls.innerHTML = `
            <button id="transpose-down" title="Transpose Down">-</button>
            <span>Transpose: <strong id="transpose-level">0</strong></span>
            <button id="transpose-up" title="Transpose Up">+</button>
        `;
        controlsContainer.appendChild(transposeControls);

        // Create and add auto-scroll controls
        const scrollControls = document.createElement('div');
        scrollControls.className = 'scroll-controls';
        scrollControls.innerHTML = `
            <button id="scroll-toggle" title="Start/Stop Scrolling">▶ Play</button>
            <span>Speed:</span>
            <button id="scroll-slower" title="Scroll Slower">-</button>
            <strong id="scroll-speed-display">5</strong>
            <button id="scroll-faster" title="Scroll Faster">+</button>
        `;
        controlsContainer.appendChild(scrollControls);

        // Create and add Edit Song button
        const editSongButton = document.createElement('button');
        editSongButton.className = 'edit-song-button';
        editSongButton.textContent = 'Edit Song';
        editSongButton.title = 'Edit this song';
        editSongButton.addEventListener('click', () => {
            openEditModal(song.id);
        });
        controlsContainer.appendChild(editSongButton);

        // Create and add Setlist toggle button
        const setlistToggleButton = document.createElement('button');
        setlistToggleButton.className = 'setlist-toggle-button';
        const isInSetlist = () => setlistSongIds.includes(song.id);
        const setSetlistButtonText = () => {
            setlistToggleButton.textContent = isInSetlist() ? 'Remove from Setlist' : 'Add to Setlist';
        };
        setSetlistButtonText();
        setlistToggleButton.addEventListener('click', () => {
            if (isInSetlist()) {
                removeSongFromSetlist(song.id);
            } else {
                addSongToSetlist(song.id);
            }
            setSetlistButtonText();
        });
        controlsContainer.appendChild(setlistToggleButton);

        // Create song header (title, artist)
        const songHeader = document.createElement('div');
        songHeader.className = 'song-header';
        const titleEl = document.createElement('h1');
        titleEl.textContent = song.title;

        const artistEl = document.createElement('h3');
        artistEl.textContent = `By ${song.artist}`;

        songHeader.appendChild(titleEl);
        songHeader.appendChild(artistEl);

        const metadata = [];
        if (song.tuning && song.tuning.trim()) {
            metadata.push(`Tuning: ${song.tuning.trim()}`);
        }
        if (song.capo !== '') {
            metadata.push(`Capo: ${song.capo}`);
        }
        if (metadata.length > 0) {
            const metadataEl = document.createElement('p');
            metadataEl.className = 'song-meta';
            metadataEl.textContent = metadata.join(' | ');
            songHeader.appendChild(metadataEl);
        }
        songDisplayContainer.appendChild(songHeader);

        // Add the container for all controls to the DOM
        songDisplayContainer.appendChild(controlsContainer);

        const audioSection = document.createElement('div');
        audioSection.className = 'audio-section';

        // Create audio player if an audio file is specified
        if (song.audioFile) {
            const audioPlayer = document.createElement('audio');
            audioPlayer.controls = true;
            audioPlayer.src = song.audioFile;
            audioSection.appendChild(audioPlayer);
        }

        const recordingPanel = document.createElement('div');
        recordingPanel.className = 'recording-panel';

        const recordingTitle = document.createElement('h4');
        recordingTitle.textContent = 'Record On The Fly';
        recordingPanel.appendChild(recordingTitle);

        const recordingHint = document.createElement('p');
        recordingHint.className = 'recording-hint';
        recordingHint.textContent = 'Record full takes or short partials. Press stop whenever you want to save a take.';
        recordingPanel.appendChild(recordingHint);

        const recordingControls = document.createElement('div');
        recordingControls.className = 'recording-controls';

        const recordButton = document.createElement('button');
        recordButton.type = 'button';
        recordButton.className = 'record-button';
        recordButton.textContent = 'Record';

        const pauseResumeButton = document.createElement('button');
        pauseResumeButton.type = 'button';
        pauseResumeButton.className = 'pause-record-button';
        pauseResumeButton.textContent = 'Pause';
        pauseResumeButton.disabled = true;

        const stopRecordButton = document.createElement('button');
        stopRecordButton.type = 'button';
        stopRecordButton.className = 'stop-record-button';
        stopRecordButton.textContent = 'Stop';
        stopRecordButton.disabled = true;

        const recordStatus = document.createElement('span');
        recordStatus.className = 'record-status';
        recordStatus.textContent = 'Ready';

        const recordTimer = document.createElement('strong');
        recordTimer.className = 'record-timer';
        recordTimer.textContent = '0:00';

        recordingControls.appendChild(recordButton);
        recordingControls.appendChild(pauseResumeButton);
        recordingControls.appendChild(stopRecordButton);
        recordingControls.appendChild(recordStatus);
        recordingControls.appendChild(recordTimer);
        recordingPanel.appendChild(recordingControls);

        const takesList = document.createElement('div');
        takesList.className = 'takes-list';
        recordingPanel.appendChild(takesList);

        audioSection.appendChild(recordingPanel);
        songDisplayContainer.appendChild(audioSection);

        const recordingsForSong = Array.isArray(song.recordings) ? song.recordings : (song.recordings = []);

        const isRecorderSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
        if (!isRecorderSupported) {
            recordStatus.textContent = 'Recording not supported in this browser.';
            recordButton.disabled = true;
        }

        const setRecordControlsState = ({ canRecord, canPause, canStop, pauseLabel, statusText }) => {
            recordButton.disabled = !canRecord;
            pauseResumeButton.disabled = !canPause;
            stopRecordButton.disabled = !canStop;
            pauseResumeButton.textContent = pauseLabel;
            recordStatus.textContent = statusText;
        };

        const renderTakes = () => {
            takesList.innerHTML = '';

            if (recordingsForSong.length === 0) {
                const emptyState = document.createElement('p');
                emptyState.className = 'takes-empty';
                emptyState.textContent = 'No takes yet.';
                takesList.appendChild(emptyState);
                return;
            }

            recordingsForSong.forEach((take, index) => {
                const takeRow = document.createElement('div');
                takeRow.className = 'take-row';

                const takeLabel = document.createElement('span');
                takeLabel.className = 'take-label';
                takeLabel.textContent = `Take ${index + 1} (${formatRecordingDuration(take.durationSec)})`;

                const takeAudio = document.createElement('audio');
                takeAudio.controls = true;
                takeAudio.src = take.dataUrl;

                const takeActions = document.createElement('div');
                takeActions.className = 'take-actions';

                const restartTakeButton = document.createElement('button');
                restartTakeButton.type = 'button';
                restartTakeButton.textContent = 'Restart';
                restartTakeButton.addEventListener('click', () => {
                    takeAudio.currentTime = 0;
                    takeAudio.play().catch(() => {});
                });

                const downloadTakeButton = document.createElement('button');
                downloadTakeButton.type = 'button';
                downloadTakeButton.textContent = 'Download';
                downloadTakeButton.addEventListener('click', () => {
                    const link = document.createElement('a');
                    link.href = take.dataUrl;
                    const extension = take.mimeType.includes('ogg') ? 'ogg' : 'webm';
                    link.download = `${song.id}-take-${index + 1}.${extension}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                });

                const deleteTakeButton = document.createElement('button');
                deleteTakeButton.type = 'button';
                deleteTakeButton.textContent = 'Delete';
                deleteTakeButton.addEventListener('click', () => {
                    const takeIndex = recordingsForSong.findIndex(item => item.id === take.id);
                    if (takeIndex > -1) {
                        recordingsForSong.splice(takeIndex, 1);
                    }
                    saveData();
                    renderTakes();
                });

                takeActions.appendChild(restartTakeButton);
                takeActions.appendChild(downloadTakeButton);
                takeActions.appendChild(deleteTakeButton);
                takeRow.appendChild(takeLabel);
                takeRow.appendChild(takeAudio);
                takeRow.appendChild(takeActions);
                takesList.appendChild(takeRow);
            });
        };

        const updateTimer = () => {
            if (!activeRecorder || activeRecorder.songId !== song.id) {
                return;
            }
            const now = Date.now();
            let pausedDuration = activeRecorder.pausedDurationMs;
            if (activeRecorder.pauseStartedAt) {
                pausedDuration += (now - activeRecorder.pauseStartedAt);
            }
            const elapsedMs = Math.max(0, now - activeRecorder.startedAt - pausedDuration);
            recordTimer.textContent = formatRecordingDuration(elapsedMs / 1000);
        };

        const stopActiveRecording = () => {
            if (!activeRecorder || activeRecorder.songId !== song.id) {
                return;
            }
            if (activeRecorder.mediaRecorder.state === 'inactive') {
                return;
            }
            activeRecorder.mediaRecorder.stop();
        };

        const startRecording = async () => {
            if (!isRecorderSupported) {
                alert('Audio recording is not supported in this browser.');
                return;
            }
            if (activeRecorder) {
                alert('A recording is already in progress.');
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const options = {};
                if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                    options.mimeType = 'audio/webm;codecs=opus';
                }
                const mediaRecorder = new MediaRecorder(stream, options);
                const chunks = [];
                recordTimer.textContent = '0:00';

                setRecordControlsState({
                    canRecord: false,
                    canPause: true,
                    canStop: true,
                    pauseLabel: 'Pause',
                    statusText: 'Recording...'
                });

                activeRecorder = {
                    songId: song.id,
                    mediaRecorder,
                    stream,
                    chunks,
                    startedAt: Date.now(),
                    pausedDurationMs: 0,
                    pauseStartedAt: null,
                    timerInterval: setInterval(updateTimer, 250)
                };

                mediaRecorder.addEventListener('dataavailable', (event) => {
                    if (event.data && event.data.size > 0) {
                        chunks.push(event.data);
                    }
                });

                mediaRecorder.addEventListener('stop', () => {
                    const recorderState = activeRecorder;
                    clearInterval(recorderState?.timerInterval);
                    const finishedAt = Date.now();
                    const pausedDurationMs = recorderState
                        ? (recorderState.pausedDurationMs + (recorderState.pauseStartedAt ? finishedAt - recorderState.pauseStartedAt : 0))
                        : 0;
                    const durationSec = recorderState
                        ? Math.max(1, Math.round((finishedAt - recorderState.startedAt - pausedDurationMs) / 1000))
                        : 1;

                    stream.getTracks().forEach(track => track.stop());

                    const finalizeUi = () => {
                        activeRecorder = null;
                        recordTimer.textContent = '0:00';
                        setRecordControlsState({
                            canRecord: true,
                            canPause: false,
                            canStop: false,
                            pauseLabel: 'Pause',
                            statusText: 'Ready'
                        });
                        renderTakes();
                    };

                    if (chunks.length === 0) {
                        finalizeUi();
                        return;
                    }

                    const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                    const reader = new FileReader();
                    reader.onload = () => {
                        if (typeof reader.result === 'string') {
                            recordingsForSong.push({
                                id: createTakeId(),
                                dataUrl: reader.result,
                                durationSec,
                                mimeType: blob.type || 'audio/webm',
                                createdAt: new Date().toISOString()
                            });
                            saveData();
                        }
                        finalizeUi();
                    };
                    reader.onerror = () => {
                        alert('Recording finished but could not be saved.');
                        finalizeUi();
                    };
                    reader.readAsDataURL(blob);
                });

                mediaRecorder.start();
                updateTimer();
            } catch (error) {
                console.error('Failed to start recording:', error);
                alert('Could not access your microphone. Check browser permissions and try again.');
            }
        };

        const pauseOrResumeRecording = () => {
            if (!activeRecorder || activeRecorder.songId !== song.id) return;
            const { mediaRecorder } = activeRecorder;

            if (mediaRecorder.state === 'recording') {
                activeRecorder.pauseStartedAt = Date.now();
                mediaRecorder.pause();
                setRecordControlsState({
                    canRecord: false,
                    canPause: true,
                    canStop: true,
                    pauseLabel: 'Resume',
                    statusText: 'Paused'
                });
                return;
            }

            if (mediaRecorder.state === 'paused') {
                if (activeRecorder.pauseStartedAt) {
                    activeRecorder.pausedDurationMs += (Date.now() - activeRecorder.pauseStartedAt);
                    activeRecorder.pauseStartedAt = null;
                }
                mediaRecorder.resume();
                setRecordControlsState({
                    canRecord: false,
                    canPause: true,
                    canStop: true,
                    pauseLabel: 'Pause',
                    statusText: 'Recording...'
                });
            }
        };

        recordButton.addEventListener('click', startRecording);
        pauseResumeButton.addEventListener('click', pauseOrResumeRecording);
        stopRecordButton.addEventListener('click', stopActiveRecording);

        renderTakes();

        // Create lyrics container
        const lyricsContainer = document.createElement('div');
        lyricsContainer.className = 'lyrics-container';

        song.lyrics.forEach(line => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'lyric-line';

            // Add chords
            const chordsDiv = document.createElement('div');
            chordsDiv.className = 'chords';
            chordsDiv.dataset.originalChords = line.chords || ' ';
            renderChordLine(chordsDiv, line.chords || ' ', 0);

            // Add lyric text
            const textDiv = document.createElement('div');
            textDiv.className = 'text';
            textDiv.textContent = line.text;

            lineDiv.appendChild(chordsDiv);
            lineDiv.appendChild(textDiv);
            lyricsContainer.appendChild(lineDiv);
        });

        songDisplayContainer.appendChild(lyricsContainer);

        // --- Event listeners for Transpose ---
        const transposeLevelEl = document.getElementById('transpose-level');
        const allChordElements = lyricsContainer.querySelectorAll('.chords');

        const applyTransposition = (amount) => {
            currentTransposition += amount;
            transposeLevelEl.textContent = currentTransposition > 0 ? `+${currentTransposition}` : currentTransposition;

            allChordElements.forEach(chordEl => {
                const originalChords = chordEl.dataset.originalChords;
                if (originalChords.trim() === '') return;

                // Find all chord-like words and transpose them
                renderChordLine(chordEl, originalChords, currentTransposition);
            });
        };

        document.getElementById('transpose-up').addEventListener('click', () => applyTransposition(1));
        document.getElementById('transpose-down').addEventListener('click', () => applyTransposition(-1));

        // --- Event listeners for Auto-Scroll ---
        const scrollToggleButton = document.getElementById('scroll-toggle');
        const scrollFasterButton = document.getElementById('scroll-faster');
        const scrollSlowerButton = document.getElementById('scroll-slower');
        const scrollSpeedDisplay = document.getElementById('scroll-speed-display');

        let isScrolling = false;
        let scrollSpeed = 5; // Represents a relative speed level
        const SCROLL_INTERVAL_MS = 50;

        function toggleScrolling() {
            isScrolling = !isScrolling;
            if (isScrolling) {
                scrollToggleButton.innerHTML = '❚❚ Pause';
                scrollInterval = setInterval(() => {
                    // Adjust the increment value for a smoother feel
                    songDisplayContainer.scrollTop += scrollSpeed * 0.1;
                }, SCROLL_INTERVAL_MS);
            } else {
                scrollToggleButton.innerHTML = '▶ Play';
                clearInterval(scrollInterval);
                scrollInterval = null;
            }
        }

        function changeSpeed(amount) {
            // Set speed limits (e.g., between 1 and 20)
            scrollSpeed = Math.max(1, Math.min(20, scrollSpeed + amount));
            scrollSpeedDisplay.textContent = scrollSpeed;
        }

        scrollToggleButton.addEventListener('click', toggleScrolling);
        scrollFasterButton.addEventListener('click', () => changeSpeed(1));
        scrollSlowerButton.addEventListener('click', () => changeSpeed(-1));
    }

    function openEditModal(songId) {
        const song = songsData.find(s => s.id === songId);
        if (!song) return;

        modalTitle.textContent = 'Edit Song';
        songFormSubmitBtn.textContent = 'Save Changes';

        // Populate the form
        songForm.id.value = song.id;
        songForm.title.value = song.title;

        if (FEATURED_ARTISTS.includes(song.artist)) {
            songForm.artist.value = song.artist;
            coverArtistContainer.style.display = 'none';
            coverArtistNameInput.required = false;
            coverArtistNameInput.value = '';
        } else {
            songForm.artist.value = 'Cover';
            coverArtistContainer.style.display = 'block';
            coverArtistNameInput.required = true;
            coverArtistNameInput.value = song.artist;
        }
        songForm.audioFile.value = song.audioFile;
        songForm.tuning.value = song.tuning || DEFAULT_TUNING;
        songForm.capo.value = song.capo !== '' ? song.capo : '';
        songForm.lyrics.value = formatLyricsForTextarea(song.lyrics);

        addSongModal.style.display = 'flex';
    }

    function formatLyricsForTextarea(lyrics) {
        return lyrics.map(line => `${line.chords}\n${line.text}`).join('\n');
    }

    // 4. Handle "Add Song" modal and form submission

    // Show the modal
    addSongBtn.addEventListener('click', () => {
        songForm.reset();
        modalTitle.textContent = 'Add a New Song';
        songFormSubmitBtn.textContent = 'Save Song';
        songForm.id.value = ''; // Ensure no ID is set
        songForm.tuning.value = DEFAULT_TUNING;
        coverArtistContainer.style.display = 'none';
        coverArtistNameInput.required = false;
        addSongModal.style.display = 'flex';
    });

    // Hide the modal
    const closeModal = () => {
        addSongModal.style.display = 'none';
        songForm.reset();
    };
    closeModalBtn.addEventListener('click', closeModal);
    addSongModal.addEventListener('click', (event) => {
        if (event.target === addSongModal) {
            closeModal();
        }
    });

    // Handle form submission
    songForm.addEventListener('submit', (event) => {
        event.preventDefault();
        
        const songIdFromForm = event.target.id.value;
        const title = event.target.title.value;
        let artist = event.target.artist.value;
        if (artist === 'Cover') {
            artist = event.target.coverArtistName.value;
        }
        const audioFile = event.target.audioFile.value;
        const tuning = event.target.tuning.value.trim() || DEFAULT_TUNING;
        const capo = sanitizeCapo(event.target.capo.value);
        const lyricsAndChords = event.target.lyrics.value;
        
        let songToDisplayId;

        if (songIdFromForm) { // If ID exists, we are EDITING
            const songIndex = songsData.findIndex(s => s.id === songIdFromForm);
            if (songIndex > -1) {
                songsData[songIndex].title = title;
                songsData[songIndex].artist = artist;
                songsData[songIndex].audioFile = audioFile;
                songsData[songIndex].tuning = tuning;
                songsData[songIndex].capo = capo;
                songsData[songIndex].lyrics = parseLyricsAndChords(lyricsAndChords);
            }
            songToDisplayId = songIdFromForm;
        } else { // No ID, so we are ADDING
            // Create a simple unique ID from the title, check for collisions
            let newId = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            let counter = 1;
            while (songsData.some(s => s.id === newId)) {
                newId = `${newId}-${counter}`;
                counter++;
            }

            const newSong = {
                id: newId,
                title, artist, audioFile, tuning, capo,
                recordings: [],
                lyrics: parseLyricsAndChords(lyricsAndChords)
            };
            songsData.push(newSong);
            songToDisplayId = newId;
        }

        saveData(); // Save changes to localStorage
        generateTableOfContents(songsData);
        renderSetlist();
        closeModal();
        displaySong(songToDisplayId);
    });

    // 5. Helper function to parse lyrics and chords from textarea
    function parseLyricsAndChords(text) {
        const lines = text.split('\n');
        const parsedLyrics = [];

        for (let i = 0; i < lines.length; i++) {
            const currentLine = lines[i];
            const nextLine = lines[i + 1] || '';
            const hasInlineChords = currentLine.includes('[') && currentLine.includes(']');

            if (hasInlineChords) {
                parsedLyrics.push(parseInlineChordLyricLine(currentLine));
                continue;
            }

            // Classic format: chord line followed by lyric line.
            if (isChordLine(currentLine) && !isChordLine(nextLine)) {
                parsedLyrics.push({
                    chords: currentLine,
                    text: nextLine
                });
                i += 1;
                continue;
            }

            // Any non-chord content (section labels, tab staff, notes) stays as text.
            parsedLyrics.push({
                chords: '',
                text: currentLine
            });
        }
        return parsedLyrics;
    }

    // 6. Helper function to handle file import
    function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) {
            return; // No file selected
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const importedSongs = JSON.parse(e.target.result);

                if (!Array.isArray(importedSongs)) {
                    throw new Error('Imported file is not a valid song array.');
                }

                let newSongsAdded = 0;
                const existingIds = new Set(songsData.map(s => s.id));

                importedSongs.forEach(song => {
                    // Validate song object and check for duplicates
                    if (song && song.id && song.title && !existingIds.has(song.id)) {
                        songsData.push(normalizeSong(song));
                        existingIds.add(song.id);
                        newSongsAdded++;
                    }
                });

                if (newSongsAdded > 0) {
                    generateTableOfContents(songsData);
                    renderSetlist();
                    saveData(); // Save the newly merged data
                    alert(`${newSongsAdded} new song(s) imported successfully!`);
                } else {
                    alert('No new songs were imported. They might already exist in your songbook.');
                }
            } catch (error) {
                console.error('Error importing songs:', error);
                alert('Failed to import songs. Please make sure the file is a valid JSON songbook file.');
            } finally {
                event.target.value = ''; // Reset file input
            }
        };

        reader.onerror = () => {
            alert('Error reading the selected file.');
            event.target.value = '';
        };

        reader.readAsText(file);
    }

    // 7. Functions for saving, loading, and exporting data

    function saveData() {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(songsData));
    }

    function saveSetlist() {
        localStorage.setItem(SETLIST_STORAGE_KEY, JSON.stringify(setlistSongIds));
    }

    function loadSetlist() {
        const raw = localStorage.getItem(SETLIST_STORAGE_KEY);
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : [];
        } catch (error) {
            console.error('Error parsing setlist from localStorage.', error);
            return [];
        }
    }

    function loadInitialData() {
        // Always load from songs.json on startup.
        fetchDefaultSongs();
    }

    function fetchDefaultSongs() {
        fetch('songs.json')
            .then(response => {
                if (!response.ok) { throw new Error('Network response was not ok'); }
                return response.json();
            })
            .then(data => {
                songsData = data.map(normalizeSong);
                const validSongIds = new Set(songsData.map(song => song.id));
                setlistSongIds = setlistSongIds.filter(id => validSongIds.has(id));
                generateTableOfContents(songsData);
                renderSetlist();
                saveSetlist();
                saveData(); // Save the initial fetched data to localStorage
            })
            .catch(error => {
                console.error('There has been a problem with your fetch operation:', error);
                tocContainer.innerHTML = '<li>Failed to load songs.</li>';
                setlistContainer.innerHTML = '<li>Failed to load setlist.</li>';
            });
    }

    async function exportSongs() {
        if (songsData.length === 0) {
            alert("There are no songs to export.");
            return;
        }
        const dataStr = JSON.stringify(songsData, null, 2); // Pretty print JSON

        // Prefer the File System Access API so users can overwrite an existing file.
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: 'songs.json',
                    types: [{
                        description: 'JSON Files',
                        accept: {'application/json': ['.json']}
                    }]
                });
                const writable = await fileHandle.createWritable();
                await writable.write(dataStr);
                await writable.close();
                alert('Songbook saved.');
                return;
            } catch (error) {
                // AbortError is expected if user cancels the dialog.
                if (error && error.name === 'AbortError') {
                    return;
                }
                console.warn('File picker save failed, falling back to download.', error);
            }
        }

        // Fallback for browsers that do not support the File System Access API.
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.download = 'songs.json';
        link.href = url;
        document.body.appendChild(link); // Required for Firefox
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
});
