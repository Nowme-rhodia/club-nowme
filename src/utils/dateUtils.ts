/**
 * Safely parses a date string, ensuring compatibility with Safari and older Android browsers
 * by replacing spaces with 'T' to be closer to ISO 8601 format.
 * 
 * Used to fix `RangeError: Invalid time value` crashes.
 */
export const parseSafeDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    // Replace space with T to create a standard ISO string without timezone (local time)
    // or handle "YYYY-MM-DD HH:mm:ss" format coming from DB
    const safeStr = dateStr.replace(' ', 'T');
    const d = new Date(safeStr);
    return isNaN(d.getTime()) ? null : d;
};
