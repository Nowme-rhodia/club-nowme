/*
  # Email System Setup

  1. New Types
    - email_status enum for tracking email delivery status

  2. New Tables
    - emails: Stores all email communications
      - recipient: Email address of the recipient
      - subject: Email subject line
      - content: Email body content
      - status: Current status (pending/sent/failed)
      - error: Error message if sending failed
      - sent_at: Timestamp when email was sent
      - created_at: Timestamp when email was created

  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create email status enum
CREATE TYPE email_status AS ENUM ('pending', 'sent', 'failed');

-- Create emails table
CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL CHECK (recipient ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  subject text NOT NULL,
  content text NOT NULL,
  status email_status NOT NULL DEFAULT 'pending',
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can insert emails"
  ON emails
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view their sent emails"
  ON emails
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update email status"
  ON emails
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);