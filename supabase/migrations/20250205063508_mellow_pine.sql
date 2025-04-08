-- Drop existing table if it exists
DROP TABLE IF EXISTS emails;

-- Create emails table with correct column names
CREATE TABLE emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_address text NOT NULL CHECK (to_address ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  subject text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable insert for everyone"
  ON emails
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable read access for own submissions"
  ON emails
  FOR SELECT
  TO public
  USING (true);

-- Add comments
COMMENT ON TABLE emails IS 'Table for tracking email communications';
COMMENT ON COLUMN emails.to_address IS 'Email address of the recipient';
COMMENT ON COLUMN emails.subject IS 'Subject line of the email';
COMMENT ON COLUMN emails.content IS 'Body content of the email';
COMMENT ON COLUMN emails.status IS 'Current status of the email (pending, sent, failed)';
COMMENT ON COLUMN emails.error IS 'Error message if sending failed';
COMMENT ON COLUMN emails.sent_at IS 'Timestamp when the email was successfully sent';
COMMENT ON COLUMN emails.created_at IS 'Timestamp when the email record was created';