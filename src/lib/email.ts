export interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export const sendEmail = async ({ to, subject, html, text }: EmailPayload) => {
  if (!process.env.EMAIL_PROVIDER_API_KEY) {
    console.info("Email not sent (EMAIL_PROVIDER_API_KEY missing). Intended recipient:", to, subject);
    return { skipped: true };
  }

  // TODO: Integrate with real provider (SendGrid, Postmark, etc.). For now, log.
  console.info("Email would send:", { to, subject, preview: html ?? text });
  return { success: true };
};
