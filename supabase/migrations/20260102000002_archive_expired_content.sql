-- Add event_date to community_content
ALTER TABLE public.community_content
ADD COLUMN IF NOT EXISTS event_date TIMESTAMP WITH TIME ZONE;

-- Function to archive expired content
CREATE OR REPLACE FUNCTION public.archive_expired_content()
RETURNS void AS $$
BEGIN
    -- Archive expired Offers (All partners)
    UPDATE public.offers
    SET status = 'archived'
    WHERE status = 'approved'
    AND event_end_date < NOW();

    -- Archive expired Community Content
    UPDATE public.community_content
    SET is_active = false
    WHERE is_active = true
    AND event_date < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (so admin can trigger it)
GRANT EXECUTE ON FUNCTION public.archive_expired_content TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_expired_content TO service_role;
