const { PlaidApi, Configuration, PlaidEnvironments } = require('plaid');
const { encrypt, decrypt } = require('../../auth/crypto');

const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});
const plaidClient = new PlaidApi(config);

async function connectItem(publicToken) {
  const exchange = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
  const { access_token, item_id } = exchange.data;
  const itemResp = await plaidClient.itemGet({ access_token });
  const institutionId = itemResp.data.item.institution_id || null;
  let institutionName = null;
  if (institutionId) {
    const inst = await plaidClient.institutionsGetById({
      institution_id: institutionId, country_codes: ['US'],
    });
    institutionName = inst.data.institution.name;
  }
  return {
    itemId: item_id,
    accessTokenEncrypted: encrypt(access_token),
    institutionId,
    institutionName,
  };
}

async function createLinkToken(clientUserId) {
  const { data } = await plaidClient.linkTokenCreate({
    user: { client_user_id: clientUserId },
    client_name: 'iBag',
    products: ['transactions'],
    required_if_supported_products: ['identity'],
    additional_consented_products: ['liabilities', 'investments'],
    country_codes: ['US'],
    language: 'en',
    webhook: process.env.WEBHOOK_PUBLIC_URL,
  });
  return data;
}

async function syncAccounts(accessTokenEncrypted) {
  const access_token = decrypt(accessTokenEncrypted);
  const { data } = await plaidClient.accountsGet({ access_token });
  return data.accounts.map((a) => ({
    plaidAccountId: a.account_id,
    name: a.name,
    officialName: a.official_name,
    mask: a.mask,
    type: a.type,
    subtype: a.subtype,
    currentBalanceCents: a.balances.current != null ? Math.round(a.balances.current * 100) : null,
    availableBalanceCents: a.balances.available != null ? Math.round(a.balances.available * 100) : null,
    isoCurrencyCode: a.balances.iso_currency_code || 'USD',
  }));
}

// Cursor-based per Section 0.2 fact #4. Caller is responsible for persisting
// the returned nextCursor onto plaid_items.cursor before the next call.
async function syncTransactions(accessTokenEncrypted, cursor) {
  const access_token = decrypt(accessTokenEncrypted);
  let added = [], modified = [], removed = [], hasMore = true, nextCursor = cursor || null;

  while (hasMore) {
    const { data } = await plaidClient.transactionsSync({
      access_token,
      cursor: nextCursor || undefined,
    });
    added = added.concat(data.added);
    modified = modified.concat(data.modified);
    removed = removed.concat(data.removed);
    hasMore = data.has_more;
    nextCursor = data.next_cursor;
  }
  return { added, modified, removed, nextCursor, hasMore: false };
}

async function syncLiabilities(accessTokenEncrypted) {
  const access_token = decrypt(accessTokenEncrypted);
  const { data } = await plaidClient.liabilitiesGet({ access_token });
  return data.liabilities;
}

async function syncInvestments(accessTokenEncrypted) {
  const access_token = decrypt(accessTokenEncrypted);
  const holdings = await plaidClient.investmentsHoldingsGet({ access_token });
  const transactions = await plaidClient.investmentsTransactionsGet({
    access_token,
    start_date: '2020-01-01', // widened on first sync; narrowed to incremental window thereafter by the caller
    end_date: new Date().toISOString().slice(0, 10),
  });
  return { holdings: holdings.data.holdings, investmentTransactions: transactions.data.investment_transactions };
}

async function syncIdentity(accessTokenEncrypted) {
  const access_token = decrypt(accessTokenEncrypted);
  const { data } = await plaidClient.identityGet({ access_token });
  return data.accounts.map((a) => ({ accountId: a.account_id, owners: a.owners }));
}

// v5.1 addition: enables apps/api/src/scripts/plaidSandboxSeed.js to drive
// a full Item through Link -> sync programmatically, using Plaid's Sandbox
// endpoint that mints a public_token for a test institution without a
// browser Link flow. Sandbox-only -- Plaid's own API rejects this call
// outside the sandbox environment, but the seed script also checks
// PLAID_ENV itself before ever reaching here (defense in depth).
async function createSandboxPublicToken(institutionId, initialProducts) {
  const { data } = await plaidClient.sandboxPublicTokenCreate({
    institution_id: institutionId,
    initial_products: initialProducts,
  });
  return data.public_token;
}

// Delegates to src/webhooks/plaidWebhookVerify.js (Section 8.4) -- kept as a
// pass-through here so nothing outside this adapter needs to know which
// module owns verification.
const { verifyPlaidWebhook } = require('../../webhooks/plaidWebhookVerify');

module.exports = {
  connectItem, createLinkToken, syncAccounts, syncTransactions, syncLiabilities,
  syncInvestments, syncIdentity, verifyWebhook: verifyPlaidWebhook,
  createSandboxPublicToken,
};
