// File: supabase/functions/_shared/utils/email.ts

import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

export interface EmailContent {
  to: string;
  subject: string;
  content: string;
  from?: string;
  html?: boolean;
  cc?: string[];
  bcc?: string[];
}

export class EmailService {
  private client: SmtpClient;
  private connected = false;
  private config: {
    hostname: string;
    port: number;
    username: string;
    password: string;
    tls: boolean;
  };

  constructor(config?: Partial<typeof this.config>) {
    this.config = {
      hostname: "smtp.gmail.com",
      port: 465,
      username: "contact@nowme.fr",
      password: Deno.env.get("GMAIL_PASSWORD") ?? "",
      tls: true,
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    
    try {
      this.client = new SmtpClient();
      await this.client.connectTLS(this.config);
      this.connected = true;
    } catch (error) {
      console.error("Failed to connect to SMTP server:", error);
      throw new Error(`SMTP connection failed: ${error.message}`);
    }
  }

  async sendEmail(email: EmailContent): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    try {
      await this.client.send({
        from: email.from ?? this.config.username,
        to: email.to,
        subject: email.subject,
        content: email.content,
        html: email.html ?? false,
        cc: email.cc,
        bcc: email.bcc,
      });
    } catch (error) {
      console.error("Failed to send email:", error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  async close(): Promise<void> {
    if (this.connected && this.client) {
      try {
        await this.client.close();
        this.connected = false;
      } catch (error) {
        console.error("Error closing SMTP connection:", error);
      }
    }
  }
}