const RULE_VERSION = 'ROUNDUP_STANDARD_V1';
const ROUNDUP_MAX_ELIGIBLE_CENTS = 80000; // $800.00 -- see Section 0.1 for how to change this

const INELIGIBLE_CLASSIFICATIONS = new Set([
  'REFUND', 'INCOME', 'TRANSFER_IN', 'TRANSFER_OUT', 'FEE',
  'LOAN_PAYMENT', 'CREDIT_CARD_PAYMENT', 'ATM_WITHDRAWAL',
  'CASH_DEPOSIT', 'INVESTMENT_ACTIVITY', 'UNKNOWN',
  // v4.3: added now that classify.js (8.6) can actually return this value.
  // Belt-and-suspenders -- every PENDING_INCOME_REVIEW transaction has
  // amount_cents < 0, which the `amount_cents <= 0` check above already
  // excludes on its own -- but listing it explicitly here means a future
  // change to the amount check can't silently make an unresolved income
  // candidate eligible for a Round-Up.
  'PENDING_INCOME_REVIEW',
]);

function evaluateRoundup(transaction, classification) {
  const { amount_cents, pending } = transaction;

  if (pending) return ineligible(transaction, 'pending');
  if (amount_cents <= 0) return ineligible(transaction, 'non_positive_amount');
  if (amount_cents >= ROUNDUP_MAX_ELIGIBLE_CENTS) return ineligible(transaction, 'above_threshold');
  if (INELIGIBLE_CLASSIFICATIONS.has(classification)) return ineligible(transaction, classification.toLowerCase());

  const roundupCents = (100 - (amount_cents % 100)) % 100;
  return {
    rule_version: RULE_VERSION,
    source_amount_cents: amount_cents,
    roundup_cents: roundupCents,
    eligibility_status: 'eligible',
    eligibility_reason: roundupCents === 0 ? 'whole_dollar' : 'eligible',
  };
}

function ineligible(transaction, reason) {
  return {
    rule_version: RULE_VERSION,
    source_amount_cents: transaction.amount_cents,
    roundup_cents: 0,
    eligibility_status: 'ineligible',
    eligibility_reason: reason,
  };
}

// Atomic accumulator update -- ON CONFLICT + explicit transaction, per Section 5.6.
async function applyRoundupEvent(client, userId, accountId, transactionId, evalResult) {
  const insert = await client.query(
    `INSERT INTO roundup_events
       (user_id, transaction_id, rule_version, source_amount_cents, roundup_cents,
        eligibility_status, eligibility_reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (transaction_id, rule_version) DO NOTHING
     RETURNING id, roundup_cents`,
    [userId, transactionId, evalResult.rule_version, evalResult.source_amount_cents,
     evalResult.roundup_cents, evalResult.eligibility_status, evalResult.eligibility_reason]
  );

  if (insert.rows.length === 0) return null; // duplicate -- already processed, no accumulator change

  const event = insert.rows[0];
  if (evalResult.eligibility_status === 'eligible' && event.roundup_cents > 0) {
    const accumulator = await client.query(
      `INSERT INTO roundup_accumulators (user_id, account_id, total_cents)
       VALUES ($1, $2, $3)
       ON CONFLICT (account_id) DO UPDATE
         SET total_cents = roundup_accumulators.total_cents + $3, updated_at = now()
       RETURNING id`,
      [userId, accountId, event.roundup_cents]
    );
    // v4.2: previously the accumulator was updated but nothing ever wrote to
    // roundup_batches/roundup_line_items -- see addToOpenBatch below.
    await addToOpenBatch(client, userId, accumulator.rows[0].id, event.id);
  }
  return event;
}

// Correction: moves the accumulator by the DELTA, never the full new amount.
//
// v4.3 fix: this function previously only logged to roundup_corrections and
// nudged the accumulator -- it never touched the original roundup_events row
// itself. That meant reconciliation.js's SUM(roundup_events.roundup_cents)
// permanently diverged from the accumulator after every single correction,
// so a correctly-corrected account would show up as a false "mismatch" in
// every future reconciliation run. This version updates the roundup_events
// row (source of truth for reconciliation), then the accumulator, then keeps
// the batch/line-item layer consistent with the new eligibility_status.
//
// Batches: a 'pending' batch's line items can be safely added/removed/
// recomputed. A 'closed' batch is immutable settled history (see
// closeBatch's comment below) -- this function will NOT rewrite a closed
// batch's total. If a correction affects an event already in a closed
// batch, it instead returns a dataQualityFlag describing the drift, which
// the CALLER must write via db.withServiceRole() (data_quality_events is
// service-role-gated per Section 5.10/13.1.15 -- writing it directly from
// this function, which runs inside the caller's withUserContext
// transaction, would silently fail exactly like the bug fixed in 13.1.15).
// This function deliberately does NOT attempt that write itself.
async function applyRoundupCorrection(
  client, userId, originalEventId, accountId,
  oldSourceCents, newSourceCents, oldCents, newCents,
  newEligibilityStatus, newEligibilityReason, reason
) {
  await client.query(
    `INSERT INTO roundup_corrections
       (original_event_id, reason, old_source_amount_cents, new_source_amount_cents,
        old_roundup_cents, new_roundup_cents)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [originalEventId, reason, oldSourceCents, newSourceCents, oldCents, newCents]
  );

  await client.query(
    `UPDATE roundup_events
        SET source_amount_cents = $1,
            roundup_cents = $2,
            eligibility_status = $3,
            eligibility_reason = $4
      WHERE id = $5`,
    [newSourceCents, newCents, newEligibilityStatus, newEligibilityReason, originalEventId]
  );

  const delta = newCents - oldCents;
  let dataQualityFlag = null;

  if (delta !== 0) {
    await client.query(
      `INSERT INTO roundup_accumulators (user_id, account_id, total_cents)
       VALUES ($1, $2, $3)
       ON CONFLICT (account_id) DO UPDATE
         SET total_cents = roundup_accumulators.total_cents + $3, updated_at = now()`,
      [userId, accountId, delta]
    );
  }

  const lineItem = await client.query(
    `SELECT rli.id, rb.id AS batch_id, rb.status
     FROM roundup_line_items rli JOIN roundup_batches rb ON rb.id = rli.batch_id
     WHERE rli.roundup_event_id = $1`,
    [originalEventId]
  );
  const existing = lineItem.rows[0] || null;

  if (newEligibilityStatus === 'eligible' && !existing) {
    // Was ineligible (no line item), correction made it eligible -- needs one now.
    const accumulator = await client.query(
      `SELECT id FROM roundup_accumulators WHERE account_id = $1`, [accountId]
    );
    if (accumulator.rows.length > 0) {
      await addToOpenBatch(client, userId, accumulator.rows[0].id, originalEventId);
    }
  } else if (newEligibilityStatus !== 'eligible' && existing) {
    // Was eligible (had a line item), correction made it ineligible -- remove it.
    if (existing.status === 'pending') {
      await client.query(`DELETE FROM roundup_line_items WHERE id = $1`, [existing.id]);
      await recomputeBatchTotal(client, existing.batch_id);
    } else {
      dataQualityFlag = {
        issueType: 'roundup_correction_against_closed_batch',
        entityType: 'roundup_batch',
        entityId: existing.batch_id,
        details: { roundupEventId: originalEventId, oldCents, newCents, newEligibilityStatus },
      };
    }
  } else if (newEligibilityStatus === 'eligible' && existing && delta !== 0) {
    // Still eligible, amount changed -- recompute the batch total if it's still open.
    if (existing.status === 'pending') {
      await recomputeBatchTotal(client, existing.batch_id);
    } else {
      dataQualityFlag = {
        issueType: 'roundup_correction_against_closed_batch',
        entityType: 'roundup_batch',
        entityId: existing.batch_id,
        details: { roundupEventId: originalEventId, oldCents, newCents, newEligibilityStatus },
      };
    }
  }

  return { dataQualityFlag };
}

async function recomputeBatchTotal(client, batchId) {
  await client.query(
    `UPDATE roundup_batches SET total_cents = (
       SELECT COALESCE(SUM(rli.roundup_cents_snapshot), 0)
       FROM roundup_line_items rli
       WHERE rli.batch_id = $1
     ) WHERE id = $1`,
    [batchId]
  );
}

// v4.2 addition (closes the gap named in Section 13.1's original audit): the
// batching layer (roundup_batches / roundup_line_items, Section 5.6) was
// defined as schema in every prior version but nothing ever wrote to it.
// A batch groups accumulated roundup_events for eventual settlement -- Phase 1
// is read-only (Section 1), so "settlement" here means marking a batch closed
// for reporting/export, not moving money.

// Opens (or reuses) a single 'pending' batch per accumulator and attaches a
// roundup_event's contribution to it as a line item. Call this from
// applyRoundupEvent's success path once an eligible event has increased the
// accumulator.
async function addToOpenBatch(client, userId, accumulatorId, roundupEventId) {
  const existing = await client.query(
    `SELECT id FROM roundup_batches
     WHERE accumulator_id = $1 AND status = 'pending'
     ORDER BY created_at DESC LIMIT 1`,
    [accumulatorId]
  );

  let batchId;
  if (existing.rows.length > 0) {
    batchId = existing.rows[0].id;
  } else {
    const created = await client.query(
      `INSERT INTO roundup_batches (user_id, accumulator_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [userId, accumulatorId]
    );
    if (created.rows.length > 0) {
      batchId = created.rows[0].id;
    } else {
      const raced = await client.query(
        `SELECT id FROM roundup_batches
         WHERE accumulator_id = $1 AND status = 'pending'
         ORDER BY created_at DESC LIMIT 1`,
        [accumulatorId]
      );
      if (raced.rows.length === 0) throw new Error('ROUNDUP_BATCH_CREATE_RACE');
      batchId = raced.rows[0].id;
    }
  }

  await client.query(
    `INSERT INTO roundup_line_items (batch_id, roundup_event_id, roundup_cents_snapshot)
     SELECT $1, id, roundup_cents
     FROM roundup_events
     WHERE id = $2
     ON CONFLICT (roundup_event_id) DO NOTHING`,
    [batchId, roundupEventId]
  );

  await recomputeBatchTotal(client, batchId);

  return batchId;
}

// Closes the currently-open batch for an accumulator (e.g. on a scheduled
// settlement cadence). A closed batch's line items are immutable history;
// new roundup_events after this point open a fresh 'pending' batch.
async function closeBatch(client, accumulatorId) {
  const result = await client.query(
    `UPDATE roundup_batches SET status = 'closed', closed_at = now()
     WHERE accumulator_id = $1 AND status = 'pending'
     RETURNING id, total_cents`,
    [accumulatorId]
  );
  return result.rows[0] || null;
}

// v5.1 addition (closes audit item 9 / spec item "Removed transaction
// handling"). Previously, sync.js marked a removed transaction's row as
// removed but never touched its roundup_events row or the accumulator it
// had contributed to -- a removed purchase's Round-Up amount stayed "live"
// forever. This reverses the contribution when the event is still in an
// open batch, and preserves closed-batch immutability the same way
// applyRoundupCorrection does: by flagging a data_quality_event instead of
// rewriting settled history.
async function reverseRoundupForRemovedTransaction(client, userId, transactionId) {
  const { rows } = await client.query(
    `SELECT re.id, re.roundup_cents, re.eligibility_status, t.account_id
     FROM roundup_events re
     JOIN transactions t ON t.id = re.transaction_id
     WHERE re.transaction_id = $1`,
    [transactionId]
  );
  if (rows.length === 0) return null;
  const event = rows[0];
  if (event.eligibility_status !== 'eligible' || Number(event.roundup_cents) === 0) return null;

  const lineItem = await client.query(
    `SELECT rli.id, rb.id AS batch_id, rb.status
     FROM roundup_line_items rli JOIN roundup_batches rb ON rb.id = rli.batch_id
     WHERE rli.roundup_event_id = $1`,
    [event.id]
  );
  const existing = lineItem.rows[0] || null;

  if (existing && existing.status !== 'pending') {
    // Already settled into a closed batch -- immutable history (Section 5.6).
    // Flag the drift instead of rewriting it.
    return {
      issueType: 'roundup_removed_transaction_in_closed_batch',
      entityType: 'roundup_batch',
      entityId: existing.batch_id,
      details: { roundupEventId: event.id, roundupCents: Number(event.roundup_cents) },
    };
  }

  await client.query(
    `INSERT INTO roundup_accumulators (user_id, account_id, total_cents)
     VALUES ($1, $2, $3)
     ON CONFLICT (account_id) DO UPDATE
       SET total_cents = roundup_accumulators.total_cents - $3, updated_at = now()`,
    [userId, event.account_id, event.roundup_cents]
  );

  await client.query(
    `UPDATE roundup_events
        SET eligibility_status = 'ineligible', eligibility_reason = 'source_transaction_removed'
      WHERE id = $1`,
    [event.id]
  );

  if (existing) {
    await client.query(`DELETE FROM roundup_line_items WHERE id = $1`, [existing.id]);
    await recomputeBatchTotal(client, existing.batch_id);
  }

  return null;
}

module.exports = {
  evaluateRoundup, applyRoundupEvent, applyRoundupCorrection,
  addToOpenBatch, closeBatch, recomputeBatchTotal,
  reverseRoundupForRemovedTransaction,
  RULE_VERSION, ROUNDUP_MAX_ELIGIBLE_CENTS,
};
