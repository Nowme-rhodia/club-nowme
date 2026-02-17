export const getOptimizedImage = (url?: string, width = 1200, height = 630) => {
    if (!url) return '';

    // Unsplash Optimization
    if (url.includes('images.unsplash.com')) {
        // If it already has query params, we might want to replace them or append?
        // Unsplash API usually takes the last param.
        // Safer to strip existing params if we want full control, or just append.
        const baseUrl = url.split('?')[0];
        return `${baseUrl}?w=${width}&h=${height}&fit=crop&q=80&auto=format`;
    }

    // Supabase Storage (if we had a resizer, we'd use it here)
    return url;
};
