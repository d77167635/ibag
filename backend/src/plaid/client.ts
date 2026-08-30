import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { env } from "../config/env.js";

const configuration = new Configuration({
  basePath: PlaidEnvironments[env.plaidEnv],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": env.plaidClientId,
      "PLAID-SECRET": env.plaidSecret,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);
