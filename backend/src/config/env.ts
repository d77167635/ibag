import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",

  plaidClientId: required("PLAID_CLIENT_ID"),
  plaidSecret: required("PLAID_SECRET"),
  plaidEnv: (process.env.PLAID_ENV ?? "sandbox") as "sandbox" | "development" | "production",
  plaidProducts: (process.env.PLAID_PRODUCTS ?? "transactions,balance,liabilities").split(","),
  plaidCountryCodes: (process.env.PLAID_COUNTRY_CODES ?? "US").split(","),
  plaidWebhookUrl: process.env.PLAID_WEBHOOK_URL ?? "",

  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),

  roundupSweepThreshold: Number(process.env.ROUNDUP_SWEEP_THRESHOLD ?? 2.0),
  roundupSafetyBuffer: Number(process.env.ROUNDUP_SAFETY_BUFFER ?? 10.0),
};
