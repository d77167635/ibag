import "dotenv/config";
import type { Products } from "plaid";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const TRIAL_INTELLIGENCE_PRODUCTS: Products[] = [
  "auth",
  "transactions",
  "identity",
  "assets",
  "liabilities",
  "investments",
  "statements",
];

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",

  plaidClientId: required("PLAID_CLIENT_ID"),
  plaidSecret: required("PLAID_SECRET"),
  plaidEnv: (process.env.PLAID_ENV ?? "sandbox") as "sandbox" | "development" | "production",
  // Balance is intentionally absent: Plaid includes Balance automatically.
  // The Trial intelligence bundle explicitly requests the seven selectable
  // products that, with Balance, form the eight-product Trial bundle.
  plaidProducts: (process.env.PLAID_PRODUCTS ?? TRIAL_INTELLIGENCE_PRODUCTS.join(",")).split(",").map((s) => s.trim()).filter(Boolean) as Products[],
  plaidCountryCodes: (process.env.PLAID_COUNTRY_CODES ?? "US").split(","),
  plaidWebhookUrl: process.env.PLAID_WEBHOOK_URL ?? "",

  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),

  roundupSweepThreshold: Number(process.env.ROUNDUP_SWEEP_THRESHOLD ?? 2.0),
  roundupSafetyBuffer: Number(process.env.ROUNDUP_SAFETY_BUFFER ?? 10.0),

  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),

  tokenEncryptionKey: required("TOKEN_ENCRYPTION_KEY"),
};
