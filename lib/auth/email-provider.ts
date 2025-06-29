import type { EmailConfig } from "next-auth/providers/email"
import { sendVerificationRequest } from "./email-sender"

export const EmailProvider: EmailConfig = {
  id: "email",
  type: "email",
  name: "Email",
  server: "",
  from: process.env.EMAIL_FROM || "noreply@gymnastics-model.com",
  maxAge: 24 * 60 * 60, // 24 hours
  sendVerificationRequest,
  options: {}
}