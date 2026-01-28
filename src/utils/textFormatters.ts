export function stripHtmlAndDecode(html: string): string {
    if (!html) return '';

    // 0. Initial decode for completely escaped strings (e.g. "&lt;p&gt;...")
    let decoded = html;
    if (typeof window !== 'undefined') {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        decoded = doc.body.textContent || html;
    }

    // 1. Strip HTML tags (both simple <div> and attributes <div class="...">)
    const stripped = decoded.replace(/<[^>]+>/g, '');

    // 2. Second pass decode for entities remaining after strip (e.g. &nbsp; -> space)
    if (typeof window !== 'undefined') {
        const doc = new DOMParser().parseFromString(stripped, 'text/html');
        return (doc.body.textContent || "").trim();
    }

    // Fallback for SS or non-browser envs
    return stripped
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}
