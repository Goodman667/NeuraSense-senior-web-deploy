/**
 * Whole-site English mode.
 *
 * The app is written in Chinese. When the language is English, this module translates
 * everything the user sees, without touching app logic or data:
 *   - text nodes and the attributes placeholder / title / aria-label / alt on the page
 *     (a MutationObserver keeps new and changed content translated);
 *   - window.alert / confirm / prompt messages and the document title;
 *   - text passed to translateText() (used for read-aloud).
 * Lookups use a zh -> en dictionary (en.json) with exact strings first, then patterns
 * with {0}..{n} placeholders, then sentence-by-sentence. Content marked with
 * data-no-translate (e.g. what users type) is left alone.
 *
 * Switching language reloads the page, so module-level strings are also consistent.
 */

export type Lang = 'zh' | 'en';

const STORAGE_KEY = 'language';
const CJK = /[㐀-鿿]/;
const TRANSLATED_ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT', 'CODE', 'PRE']);

let exact = new Map<string, string>();
let patterns: Array<{ re: RegExp; en: string; weight: number }> = [];
let ready = false;
const missing = new Set<string>();

export function getLang(): Lang {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh';
    } catch {
        return 'zh';
    }
}

export function isEnglish(): boolean {
    return getLang() === 'en';
}

/** Language tag for speech recognition and read-aloud. */
export function speechLang(): string {
    return isEnglish() ? 'en-US' : 'zh-CN';
}

/** Persist the language and reload so every page renders in it. */
export function setLangAndReload(lang: Lang) {
    try {
        localStorage.setItem(STORAGE_KEY, lang);
    } catch { /* ignore */ }
    window.location.reload();
}

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function load(dict: Record<string, string>) {
    exact = new Map();
    const pats: Array<{ re: RegExp; en: string; weight: number }> = [];
    for (const [zh, en] of Object.entries(dict)) {
        const key = normalize(zh);
        if (/\{\d+\}/.test(key)) {
            const parts = key.split(/(\{\d+\})/);
            const literal = parts.filter((p) => !/^\{\d+\}$/.test(p)).join('');
            if (!CJK.test(literal)) continue;
            const order: number[] = [];
            const src = parts
                .map((p) => {
                    const m = p.match(/^\{(\d+)\}$/);
                    if (m) {
                        order.push(Number(m[1]));
                        return '(.+?)';
                    }
                    // Spaces next to values are not reliable in rendered JSX, so make them optional.
                    return escapeRe(p).replace(/ /g, '\\s*');
                })
                .join('');
            // Rewrite {n} in the English text to the capture-group position.
            const enMapped = en.replace(/\{(\d+)\}/g, (_, n) => `{#${order.indexOf(Number(n))}}`);
            pats.push({ re: new RegExp(`^${src}$`, 's'), en: enMapped, weight: literal.length });
        } else {
            exact.set(key, en);
        }
    }
    pats.sort((a, b) => b.weight - a.weight);
    patterns = pats;
    ready = true;
}

const END_PUNCT: Record<string, string> = { '。': '.', '！': '!', '？': '?' };

function translateCore(core: string, depth = 0): string | undefined {
    const hit = exact.get(core);
    if (hit !== undefined) return hit;
    // Same text with a final Chinese full stop / ! / ? that the dictionary has without it.
    const last = core.slice(-1);
    if (END_PUNCT[last] && core.length > 1) {
        const bare = exact.get(core.slice(0, -1));
        if (bare !== undefined) return /[.!?]$/.test(bare) ? bare : bare + END_PUNCT[last];
    }
    for (const p of patterns) {
        const m = core.match(p.re);
        if (!m) continue;
        let ok = true;
        const out = p.en.replace(/\{#(\d+)\}/g, (_, i) => {
            const g = m[Number(i) + 1] ?? '';
            if (!CJK.test(g)) return g;
            const t = depth < 3 ? translateCore(normalize(g), depth + 1) : undefined;
            if (t !== undefined) return t;
            // Untranslated Chinese inside a pattern is fine for short values such as a name,
            // but not for long text (that would leave half a sentence in Chinese).
            if (g.length > 8 || p.weight < 2) ok = false;
            return g;
        });
        if (ok) return out;
    }
    if (depth < 2) {
        // Sentence by sentence (also handles text joined from several known strings).
        const pieces = core.split(/(?<=[。！？；\n])|(?<=[!?;])\s+/).map((x) => x.trim()).filter(Boolean);
        if (pieces.length > 1) {
            const out: string[] = [];
            for (const piece of pieces) {
                if (!CJK.test(piece)) { out.push(piece); continue; }
                const t = translateCore(piece, depth + 1);
                if (t === undefined) return undefined;
                out.push(t);
            }
            return out.join(' ');
        }
        // Clause by clause on Chinese commas.
        const clauses = core.split(/(?<=[，、：])/).map((x) => x.trim()).filter(Boolean);
        if (clauses.length > 1 && clauses.length <= 6) {
            const out: string[] = [];
            for (const c of clauses) {
                const bare = c.replace(/[，、：]$/, '');
                const tail = c.endsWith('，') || c.endsWith('、') ? ',' : c.endsWith('：') ? ':' : '';
                if (!CJK.test(bare)) { out.push(bare + tail); continue; }
                const t = translateCore(bare, depth + 1);
                if (t === undefined) return undefined;
                out.push(t.replace(/[.。]$/, '') + tail);
            }
            return out.join(' ');
        }
    }
    return undefined;
}

/** Translate one string to English (returns it unchanged in Chinese mode or if unknown). */
export function translateText(text: string): string {
    if (!ready || !text || !CJK.test(text)) return text;
    const lead = text.match(/^\s*/)?.[0] ?? '';
    const trail = text.match(/\s*$/)?.[0] ?? '';
    const core = normalize(text);
    let out = translateCore(core);
    if (out === undefined) {
        if (missing.size < 5000) missing.add(core);
        return text;
    }
    // "说明：" + value -> "Note: " + value (Chinese punctuation carries its own spacing)
    if (/[：，；]$/.test(core) && /[:,;]$/.test(out) && !trail) out += ' ';
    return lead + out + trail;
}

function skipped(el: Element | null): boolean {
    for (let e = el; e; e = e.parentElement) {
        if (SKIP_TAGS.has(e.tagName)) return true;
        if (e.hasAttribute('data-no-translate') || (e as HTMLElement).isContentEditable) return true;
    }
    return false;
}

// Each text node remembers its Chinese source, so a value React changes later is re-translated
// and an element made of several text nodes can be translated as one sentence.
const source = new WeakMap<Text, string>();
const written = new WeakMap<Text, string>();

function sourceOf(node: Text): string {
    const v = node.nodeValue ?? '';
    if (written.has(node) && written.get(node) === v) return source.get(node) ?? v;
    source.set(node, v);
    written.delete(node);
    return v;
}

function write(node: Text, value: string) {
    written.set(node, value);
    if (node.nodeValue !== value) node.nodeValue = value;
}

/** <span>第 {i} 题 · 共 {n} 题</span> renders 5 text nodes; translate them together. */
function textGroup(el: Element | null): Text[] | null {
    if (!el || el.childNodes.length < 2) return null;
    const nodes: Text[] = [];
    for (const c of Array.from(el.childNodes)) {
        if (c.nodeType === Node.TEXT_NODE) nodes.push(c as Text);
        else if (c.nodeType !== Node.COMMENT_NODE) return null;
    }
    return nodes.length >= 2 ? nodes : null;
}

function translateGroup(nodes: Text[]): boolean {
    const src = nodes.map(sourceOf);
    const joined = src.join('');
    if (!CJK.test(joined)) return true;
    const core = normalize(joined);
    const out = translateCore(core);
    if (out === undefined) {
        // Fall back to node by node.
        nodes.forEach((n, i) => write(n, CJK.test(src[i]) ? translateText(src[i]) : src[i]));
        return true;
    }
    write(nodes[0], (joined.match(/^\s*/)?.[0] ?? '') + out + (joined.match(/\s*$/)?.[0] ?? ''));
    for (let i = 1; i < nodes.length; i++) write(nodes[i], '');
    return true;
}

function translateTextNode(node: Text) {
    const parent = node.parentElement;
    if (!parent || skipped(parent)) return;
    const group = textGroup(parent);
    if (group) {
        translateGroup(group);
        return;
    }
    const v = sourceOf(node);
    if (!v || !CJK.test(v)) return;
    write(node, translateText(v));
}

function translateElementAttrs(el: Element) {
    // A textarea's own text is what the user typed, but its placeholder/title are UI.
    if (el.hasAttribute('data-no-translate') || skipped(el.parentElement)) return;
    for (const a of TRANSLATED_ATTRS) {
        const v = el.getAttribute(a);
        if (v && CJK.test(v)) {
            const t = translateText(v);
            if (t !== v) el.setAttribute(a, t);
        }
    }
    if (el instanceof HTMLInputElement && (el.type === 'button' || el.type === 'submit') && CJK.test(el.value)) {
        el.value = translateText(el.value);
    }
}

function translateTree(root: Node) {
    if (root.nodeType === Node.TEXT_NODE) {
        translateTextNode(root as Text);
        return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    translateElementAttrs(root as Element);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n = walker.nextNode();
    while (n) {
        if (n.nodeType === Node.TEXT_NODE) translateTextNode(n as Text);
        else translateElementAttrs(n as Element);
        n = walker.nextNode();
    }
}

function patchDialogs() {
    const { alert, confirm, prompt } = window;
    window.alert = (msg?: unknown) => alert.call(window, typeof msg === 'string' ? translateText(msg) : msg);
    window.confirm = (msg?: string) => confirm.call(window, msg ? translateText(msg) : msg);
    window.prompt = (msg?: string, def?: string) => prompt.call(window, msg ? translateText(msg) : msg, def);
}

/** Dates formatted with a Chinese locale come out in English instead. */
function patchDates() {
    const swap = (loc: unknown) => (typeof loc === 'string' && /^zh/i.test(loc)) || loc === undefined ? 'en-US' : loc;
    const proto = Date.prototype as unknown as Record<string, (...args: unknown[]) => string>;
    for (const name of ['toLocaleDateString', 'toLocaleTimeString', 'toLocaleString']) {
        const orig = proto[name];
        proto[name] = function (this: Date, loc?: unknown, opts?: unknown) {
            return orig.call(this, swap(loc), opts);
        };
    }
}

/** Send the language to the backend so AI replies, read-aloud and summaries use it. */
function patchFetch() {
    const orig = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        try {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
            if (/\/api\/v1\//.test(url)) {
                const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
                headers.set('X-Lang', 'en');
                let body = init?.body;
                // Read-aloud: speak the English version of fixed Chinese prompts.
                if (/\/tts(\?|$)/.test(url) && typeof body === 'string') {
                    try {
                        const data = JSON.parse(body);
                        if (data && typeof data.text === 'string') {
                            data.text = translateText(data.text);
                            body = JSON.stringify(data);
                        }
                    } catch { /* not JSON */ }
                }
                return orig(input, { ...init, headers, body });
            }
        } catch { /* fall through */ }
        return orig(input, init);
    };
}

/** Browser read-aloud (fallback when the server voice fails) speaks English with an English voice. */
function patchSpeech() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const speak = synth.speak.bind(synth);
    synth.speak = (u: SpeechSynthesisUtterance) => {
        try {
            u.text = translateText(u.text);
            u.lang = 'en-US';
            if (!u.voice || !/^en/i.test(u.voice.lang)) {
                const voices = synth.getVoices();
                u.voice = voices.find((v) => /^en-(US|GB)/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang)) || null;
            }
        } catch { /* keep the utterance as it is */ }
        speak(u);
    };
}

/**
 * Call once before the app renders. In Chinese mode it does nothing.
 * In English mode it loads the dictionary and starts translating the page.
 */
export async function initAutoTranslate(): Promise<void> {
    // A link with ?lang=en (or ?lang=zh) opens the site in that language and remembers it.
    try {
        const fromUrl = new URLSearchParams(window.location.search).get('lang');
        if (fromUrl === 'en' || fromUrl === 'zh') localStorage.setItem(STORAGE_KEY, fromUrl);
    } catch { /* ignore */ }
    document.documentElement.lang = getLang() === 'en' ? 'en' : 'zh-CN';
    if (getLang() !== 'en') return;
    const dict = (await import('./en.json')).default as Record<string, string>;
    load(dict);
    patchDialogs();
    patchDates();
    patchFetch();
    patchSpeech();
    translateTree(document.documentElement);
    const observer = new MutationObserver((records) => {
        for (const r of records) {
            if (r.type === 'characterData') translateTextNode(r.target as Text);
            else if (r.type === 'attributes') translateElementAttrs(r.target as Element);
            else r.addedNodes.forEach((n) => translateTree(n));
        }
    });
    observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: TRANSLATED_ATTRS,
    });
    (window as unknown as { __i18nMissing: () => string[] }).__i18nMissing = () => [...missing];
}
