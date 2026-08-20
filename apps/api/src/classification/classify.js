const CLASSIFICATION_VERSION = 'classification_v1';

/**
 * Rules are evaluated IN ORDER; the first match wins. This explicit precedence
 * (not an unordered rule set) is what makes classification deterministic and
 * testable — a refund and an income deposit can both have a negative amount,
 * so ordering resolves the ambiguity, not amount sign alone.
 */
function classify(transaction, context) {
  const { amount_cents, provider_category, merchant_name, account_type } = transaction;
  const cat = (provider_category || '').toLowerCase();
  const merchant = (merchant_name || '').toLowerCase();

  // 1. Refund: explicit category, OR an inverse-amount match to a prior purchase
  //    at the same merchant within 60 days (checked via context.priorPurchaseMatch).
  if (cat.includes('refund') || context.priorPurchaseMatch) {
    return result('REFUND', 0.9, 'category_or_reversal_match');
  }

  // 2. Fee: explicit category or known fee-merchant pattern.
  if (cat.includes('fee') || /overdraft|late fee|foreign transaction fee|atm fee/.test(merchant)) {
    return result('FEE', 0.9, 'category_or_merchant_pattern');
  }

  // 3. ATM withdrawal.
  if (cat.includes('atm')) {
    return result('ATM_WITHDRAWAL', 0.9, 'category');
  }

  // 4. Loan payment: loan account, balance-reducing transaction.
  if (account_type === 'loan') {
    return result('LOAN_PAYMENT', 0.85, 'account_type');
  }

  // 5. Credit card payment: credit account, a payment (not a purchase) against it.
  if (account_type === 'credit' && context.isPaymentNotPurchase) {
    return result('CREDIT_CARD_PAYMENT', 0.85, 'account_type_and_direction');
  }

  // 6. Investment activity.
  if (account_type === 'investment' || cat.includes('invest')) {
    return result('INVESTMENT_ACTIVITY', 0.85, 'account_type_or_category');
  }

  // 7. Internal transfer — checked LAST among the negative-amount cases, so a
  //    transfer never masquerades as income (context.transferMatch is set by
  //    the transfer-detection pass, Section 5.5 transaction_relationships).
  if (context.transferMatch) {
    return result(amount_cents < 0 ? 'TRANSFER_IN' : 'TRANSFER_OUT', context.transferConfidence, 'relationship_match');
  }

  // 8. Income resolution — negative amount (money in), none of rules 1-7 matched.
  //    v4.3: this rule now actually implements the two-pass structure the prose
  //    always described but no prior version's code carried out. `context.incomePhase`
  //    tells this function which pass is calling it:
  //      - 'initial' (sync.js, Section 8.10, pass 1): income_signals hasn't been
  //        (re)computed against this transaction yet, so an unresolved negative-amount
  //        transaction is deferred as PENDING_INCOME_REVIEW rather than guessed.
  //      - 'resolved' (jobs/incomeReview.js, Section 8.14, pass 2): income_signals
  //        has just been recomputed and context.incomeSignalMatch reflects a real
  //        lookup against it — a definite yes becomes INCOME, a definite no becomes
  //        UNKNOWN (not re-deferred; deferring forever would never terminate).
  if (amount_cents < 0) {
    if (context.incomeSignalMatch) {
      return result('INCOME', context.incomeConfidence, 'recurrence_pattern');
    }
    if (context.incomePhase === 'resolved') {
      return result('UNKNOWN', 0.0, 'income_signal_absent_after_resolution');
    }
    return result('PENDING_INCOME_REVIEW', null, 'awaiting_income_signal_resolution');
  }

  // 9. Purchase: positive amount, none of the above.
  if (amount_cents > 0) {
    return result('PURCHASE', 0.95, 'default_positive_amount');
  }

  // 10. Everything else — explicitly UNKNOWN, not force-classified.
  return result('UNKNOWN', 0.0, 'no_rule_matched');
}

function result(classification, confidence, evidenceReason) {
  return { classification, classification_version: CLASSIFICATION_VERSION, confidence, evidence: { reason: evidenceReason } };
}

module.exports = { classify, CLASSIFICATION_VERSION };
