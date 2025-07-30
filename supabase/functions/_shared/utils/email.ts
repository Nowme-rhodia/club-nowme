export class EmailService {
  private apiKey: string;

  constructor() {
    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) {
      throw new Error("RESEND_API_KEY manquant dans les variables d’environnement");
    }
    this.apiKey = key;
  }

  async connect() {
    // Avec Resend, aucune connexion préalable à faire
    return;
  }

  async sendEmail({
    to,
    subject,
    content
  }: {
    to: string;
    subject: string;
    content: string;
  }) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "NOWME CLUB <contact@nowme.fr>",
        to,
        subject,
        html: content
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur Resend: ${errorText}`);
    }
  }

  async close() {
    // Pas besoin de fermer quoi que ce soit avec Resend
    return;
  }
}
