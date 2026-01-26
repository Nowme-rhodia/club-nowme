export function stripHtmlAndDecode(html: string): string {
    if (!html) return '';

    // 1. Strip HTML tags
    const stripped = html.replace(/<[^>]+>/g, '');

    // 2. Decode entities using DOMParser (browser-only)
    // Since we are in a React app, we can use the DOM
    if (typeof window !== 'undefined') {
        const doc = new DOMParser().parseFromString(stripped, 'text/html');
        return doc.body.textContent || "";
    }

    // Fallback for non-browser envs (if any) or simple replacements
    return stripped
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}
