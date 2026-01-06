-- Force schema reload by notifying pgrst
-- Also adding a comment to force a ddl event
COMMENT ON TABLE public.bookings IS 'Bookings data';
NOTIFY pgrst, 'reload schema';
