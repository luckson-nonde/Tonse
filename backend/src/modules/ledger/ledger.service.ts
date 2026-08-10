import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, EntityManager, Repository } from 'typeorm';
import { LedgerAccount } from './entities/ledger-account.entity';
import { LedgerJournal, LedgerJournalType } from './entities/ledger-journal.entity';
import { LedgerEntry, EntryDirection } from './entities/ledger-entry.entity';
import { getAuditContext } from '../../common/audit/audit-context';
import { fromNgwee, sumNgwee } from '../../common/money/money';

/** One line of a journal, expressed in integer ngwee. */
export interface JournalLineInput {
  accountCode: string;
  direction: EntryDirection;
  /** Integer ngwee, > 0. */
  amountNgwee: number;
  counterpartyId?: string;
  counterpartyLabel?: string;
  quoteId?: string;
  orderId?: string;
}

export interface PostJournalInput {
  type: LedgerJournalType;
  /** Makes the post idempotent at the DB level — a replayed webhook is a no-op. */
  idempotencyKey: string;
  lines: JournalLineInput[];
  currency?: string;
  quoteId?: string;
  orderId?: string;
  pspTransactionId?: string;
  reversesJournalId?: string;
  description?: string;
  memo?: Record<string, any>;
}

/**
 * The ONLY writer into the ledger.
 *
 * There is no update and no delete method, by design — corrections are a
 * REVERSAL journal (`reverse()`), never an edit. The database enforces the same
 * thing with triggers, so even a stray query can't rewrite history.
 */
@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);
  private accountCache = new Map<string, LedgerAccount>();

  constructor(
    @InjectRepository(LedgerAccount)
    private readonly accounts: Repository<LedgerAccount>,
    @InjectRepository(LedgerJournal)
    private readonly journals: Repository<LedgerJournal>,
    private readonly dataSource: DataSource,
  ) {}

  private async resolveAccount(code: string, m: EntityManager): Promise<LedgerAccount> {
    const cached = this.accountCache.get(code);
    if (cached) return cached;
    const account = await m.getRepository(LedgerAccount).findOne({ where: { code } });
    if (!account) {
      throw new Error(`Unknown ledger account code: ${code}`);
    }
    this.accountCache.set(code, account);
    return account;
  }

  /**
   * Post a balanced journal.
   *
   * Balance is validated here for a clear error, and AGAIN by a deferred DB
   * constraint trigger at COMMIT — the trigger is the real guarantee; this is
   * just a better message. Pass `manager` to enlist in a caller's transaction
   * (e.g. posting the funding journal in the same transaction that flips the
   * quote to PAID), so money and state can never disagree.
   *
   * Replays are a no-op: the unique `idempotencyKey` means a second post with
   * the same key returns the existing journal instead of double-spending.
   */
  async postJournal(input: PostJournalInput, manager?: EntityManager): Promise<LedgerJournal> {
    const run = async (m: EntityManager): Promise<LedgerJournal> => {
      const existing = await m.getRepository(LedgerJournal).findOne({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        this.logger.log(`Journal ${input.idempotencyKey} already posted — no-op (${existing.reference})`);
        return existing;
      }

      if (!input.lines?.length) {
        throw new Error('A journal must have at least one line');
      }
      for (const line of input.lines) {
        if (!Number.isInteger(line.amountNgwee) || line.amountNgwee <= 0) {
          throw new Error(
            `Journal line for ${line.accountCode} must be a positive whole ngwee amount, got ${line.amountNgwee}`,
          );
        }
      }
      const debits = sumNgwee(
        input.lines.filter((l) => l.direction === 'DEBIT').map((l) => l.amountNgwee),
      );
      const credits = sumNgwee(
        input.lines.filter((l) => l.direction === 'CREDIT').map((l) => l.amountNgwee),
      );
      if (debits !== credits) {
        throw new Error(
          `Unbalanced journal ${input.type}: debits ${debits} <> credits ${credits} (ngwee)`,
        );
      }

      const ctx = getAuditContext();
      const currency = input.currency || 'ZMW';
      const reference = `JRN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const journal = await m.getRepository(LedgerJournal).save(
        m.getRepository(LedgerJournal).create({
          reference,
          type: input.type,
          idempotencyKey: input.idempotencyKey,
          currency,
          quoteId: input.quoteId ?? null,
          orderId: input.orderId ?? null,
          pspTransactionId: input.pspTransactionId ?? null,
          reversesJournalId: input.reversesJournalId ?? null,
          description: input.description ?? null,
          actorLabel: ctx?.actorLabel ?? null,
          memo: input.memo ?? null,
        } as DeepPartial<LedgerJournal>),
      );

      let lineNo = 0;
      for (const line of input.lines) {
        const account = await this.resolveAccount(line.accountCode, m);
        await m.getRepository(LedgerEntry).save(
          m.getRepository(LedgerEntry).create({
            journalId: journal.id,
            accountId: account.id,
            accountCode: account.code,
            direction: line.direction,
            amount: fromNgwee(line.amountNgwee),
            currency,
            lineNo: lineNo++,
            counterpartyId: line.counterpartyId ?? null,
            counterpartyLabel: line.counterpartyLabel ?? null,
            quoteId: line.quoteId ?? input.quoteId ?? null,
            orderId: line.orderId ?? input.orderId ?? null,
          } as DeepPartial<LedgerEntry>),
        );
      }

      this.logger.log(
        `Posted ${input.type} ${journal.reference} (${fromNgwee(debits)} ${currency}) key=${input.idempotencyKey}`,
      );
      return journal;
    };

    return manager ? run(manager) : this.dataSource.transaction(run);
  }

  /**
   * Correct a journal by posting its mirror image. The ledger is append-only,
   * so this is the ONLY way to undo anything — history stays intact and the
   * correction is itself auditable.
   */
  async reverse(journalId: string, reason: string, manager?: EntityManager): Promise<LedgerJournal> {
    const run = async (m: EntityManager): Promise<LedgerJournal> => {
      const original = await m.getRepository(LedgerJournal).findOne({
        where: { id: journalId },
        relations: ['entries'],
      });
      if (!original) throw new Error(`Journal ${journalId} not found`);

      const lines: JournalLineInput[] = original.entries.map((e) => ({
        accountCode: e.accountCode,
        // Mirror image: every debit becomes a credit and vice versa.
        direction: e.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
        amountNgwee: Math.round(Number(e.amount) * 100),
        counterpartyId: e.counterpartyId ?? undefined,
        counterpartyLabel: e.counterpartyLabel ?? undefined,
        quoteId: e.quoteId ?? undefined,
        orderId: e.orderId ?? undefined,
      }));

      return this.postJournal(
        {
          type: 'REVERSAL',
          idempotencyKey: `reversal:${journalId}`,
          lines,
          currency: original.currency,
          quoteId: original.quoteId ?? undefined,
          orderId: original.orderId ?? undefined,
          reversesJournalId: original.id,
          description: `Reversal of ${original.reference}: ${reason}`,
        },
        m,
      );
    };

    return manager ? run(manager) : this.dataSource.transaction(run);
  }

  /**
   * Find a journal by the deterministic key its poster used (e.g.
   * `ticket-sale:<orderId>`). Lets a caller locate the journal it needs to
   * `reverse()` without reaching into the journal repository itself.
   */
  async findByIdempotencyKey(
    idempotencyKey: string,
    manager?: EntityManager,
  ): Promise<LedgerJournal | null> {
    const repo = manager
      ? manager.getRepository(LedgerJournal)
      : this.dataSource.getRepository(LedgerJournal);
    return repo.findOne({ where: { idempotencyKey } });
  }

  /** Trial balance — every account's net position. Debits must equal credits
   *  overall; a non-zero total is a broken ledger. */
  async trialBalance(): Promise<{
    rows: Array<{ accountCode: string; debit: string; credit: string; balance: string }>;
    totalDebit: string;
    totalCredit: string;
    balanced: boolean;
  }> {
    const rows: Array<{ accountCode: string; debit: string; credit: string }> =
      await this.dataSource.query(`
        SELECT "accountCode",
               COALESCE(SUM(CASE WHEN direction='DEBIT'  THEN amount ELSE 0 END), 0)::text AS debit,
               COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE 0 END), 0)::text AS credit
          FROM ledger_entries
         GROUP BY "accountCode"
         ORDER BY "accountCode"
      `);

    let totalDebit = 0;
    let totalCredit = 0;
    const out = rows.map((r) => {
      const d = Math.round(Number(r.debit) * 100);
      const c = Math.round(Number(r.credit) * 100);
      totalDebit += d;
      totalCredit += c;
      return {
        accountCode: r.accountCode,
        debit: fromNgwee(d),
        credit: fromNgwee(c),
        balance: fromNgwee(d - c),
      };
    });

    return {
      rows: out,
      totalDebit: fromNgwee(totalDebit),
      totalCredit: fromNgwee(totalCredit),
      balanced: totalDebit === totalCredit,
    };
  }

  /** Open escrow positions, straight from the derived view. */
  async escrowPositions(): Promise<Array<{ quoteId: string; currency: string; balance: string }>> {
    return this.dataSource.query(
      `SELECT "quoteId", currency, balance::text FROM escrow_positions ORDER BY "quoteId"`,
    );
  }

  /** One seller's venture balance, or zero if they have no open position
   *  (never released, or fully cleared — the view drops zero-balance rows). */
  async sellerBalance(sellerId: string, currency = 'ZMW'): Promise<string> {
    const [row] = await this.dataSource.query(
      `SELECT balance::text FROM seller_venture_positions WHERE "sellerId" = $1 AND currency = $2`,
      [sellerId, currency],
    );
    return row?.balance ?? '0.00';
  }

  /** The chart of accounts with each account's live balance. */
  async accountBalances(): Promise<
    Array<{
      code: string;
      name: string;
      type: string;
      normalSide: string;
      balance: string;
      description: string;
    }>
  > {
    return this.dataSource.query(`
      SELECT a.code, a.name, a.type, a."normalSide", a.description,
             COALESCE(
               CASE WHEN a."normalSide" = 'DEBIT'
                    THEN SUM(CASE WHEN e.direction='DEBIT'  THEN e.amount ELSE -e.amount END)
                    ELSE SUM(CASE WHEN e.direction='CREDIT' THEN e.amount ELSE -e.amount END)
               END, 0)::text AS balance
        FROM ledger_accounts a
        LEFT JOIN ledger_entries e ON e."accountCode" = a.code
       GROUP BY a.code, a.name, a.type, a."normalSide", a.description, a."createdAt"
       ORDER BY a."createdAt"
    `);
  }

  /**
   * Journals, newest first, paginated in SQL. Deliberately NOT the
   * "pull 10 000 rows and aggregate in JS" pattern the old admin stats used —
   * a ledger only grows.
   */
  async listJournals(filters: {
    page?: number | string;
    limit?: number | string;
    type?: string;
    quoteId?: string;
    counterpartyId?: string;
  } = {}): Promise<{ data: any[]; total: number }> {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(filters.limit) || 30));
    const where: string[] = [];
    const params: any[] = [];
    if (filters.type) {
      params.push(filters.type);
      where.push(`j.type = $${params.length}`);
    }
    if (filters.quoteId) {
      params.push(filters.quoteId);
      where.push(`j."quoteId" = $${params.length}`);
    }
    if (filters.counterpartyId) {
      // EXISTS rather than joining `ledger_entries e` directly in WHERE — that
      // alias is already used for the debit-sum aggregate below, and a second
      // predicate on it would filter out the credit lines needed for that sum.
      params.push(filters.counterpartyId);
      where.push(
        `EXISTS (SELECT 1 FROM ledger_entries e2 WHERE e2."journalId" = j.id AND e2."counterpartyId" = $${params.length})`,
      );
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [{ count }] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM ledger_journals j ${whereSql}`,
      params,
    );

    const data = await this.dataSource.query(
      `SELECT j.id, j.reference, j.type, j.currency, j."quoteId", j."orderId",
              j.description, j."actorLabel", j.memo, j."postedAt",
              COALESCE(SUM(CASE WHEN e.direction='DEBIT' THEN e.amount ELSE 0 END), 0)::text AS amount
         FROM ledger_journals j
         LEFT JOIN ledger_entries e ON e."journalId" = j.id
         ${whereSql}
        GROUP BY j.id
        ORDER BY j."postedAt" DESC
        LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params,
    );

    return { data, total: Number(count) };
  }

  /** A single journal with its balanced lines — the drill-in. */
  async getJournal(id: string): Promise<any> {
    const [journal] = await this.dataSource.query(
      `SELECT * FROM ledger_journals WHERE id = $1`,
      [id],
    );
    if (!journal) return null;
    const entries = await this.dataSource.query(
      `SELECT "accountCode", direction, amount::text, currency, "lineNo",
              "counterpartyId", "counterpartyLabel", "quoteId", "orderId"
         FROM ledger_entries WHERE "journalId" = $1 ORDER BY "lineNo"`,
      [id],
    );
    return { ...journal, entries };
  }
}
