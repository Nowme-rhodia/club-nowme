export const getVideoEmbedUrl = (url: string): string | null => {
    if (!url) return null;

    // YouTube
    // Supports: https://www.youtube.com/watch?v=VIDEO_ID, https://youtu.be/VIDEO_ID, https://www.youtube.com/embed/VIDEO_ID
    const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([^#&?]*).*/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch && youtubeMatch[1]) {
        return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    // Vimeo
    // Supports: https://vimeo.com/VIDEO_ID
    const vimeoRegex = /^(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/)([^#&?]*).*/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[1]) {
        // Check if numeric ID
        if (/^\d+$/.test(vimeoMatch[1])) {
            return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        }
    }

    return null;
};
