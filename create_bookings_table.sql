-- Create bookings table for Calendly integration
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    offer_id UUID REFERENCES public.offers(id) NOT NULL,
    booking_date TIMESTAMP WITH TIME ZONE NOT NULL,
    customer_email TEXT NOT NULL,
    calendly_event_id TEXT, -- Can be invitee_uuid or event_type_uuid
    status TEXT DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Users can insert their own bookings
create policy "Users can insert their own bookings"
on "public"."bookings"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


-- 2. Users can view their own bookings
create policy "Users can view their own bookings"
on "public"."bookings"
as permissive
for select
to public
using ((auth.uid() = user_id));
