-- Secure function to increment stock atomically
-- usage: supabase.rpc('increment_variant_stock', { variant_id_input: '...' })

CREATE OR REPLACE FUNCTION increment_variant_stock(variant_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.offer_variants
  SET stock = stock + 1
  WHERE id = variant_id_input;
END;
$$;
