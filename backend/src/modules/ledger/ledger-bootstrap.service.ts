import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LEDGER_ACCOUNTS } from './ledger-accounts';

/**
 * Installs the ledger's integrity guarantees at boot, and seeds the chart of
 * accounts.
 *
 * WHY DDL AT BOOT: TypeORM `synchronize` creates tables and columns but NOT
 * triggers, CHECK constraints or views — and those are precisely what make this
 * a ledger rather than a table of numbers. The old `payments` table relied on
 * app-level discipline and was editable and deletable by any authenticated
 * user; enforcement belongs in the database, where no code path can skip it.
 *
 * All DDL is idempotent (CREATE OR REPLACE / DROP … IF EXISTS), so it re-runs
 * safely on every boot. Mirrors the existing categories boot-seeder pattern.
 * (Production should graduate this to real migrations with synchronize off.)
 */
@Injectable()
export class LedgerBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(LedgerBootstrapService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.installConstraints();
      await this.seedAccounts();
    } catch (e) {
      // Never take the API down over this, but make it loud: without the
      // triggers the ledger's guarantees are gone and that must be visible.
      this.logger.error(`Ledger bootstrap FAILED — integrity guards may be missing: ${(e as Error).message}`);
    }
  }

  private async installConstraints(): Promise<void> {
    // Money must be positive; `direction` carries the sign.
    await this.dataSource.query(`
      ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS chk_ledger_entries_amount_positive;
    `);
    await this.dataSource.query(`
      ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_entries_amount_positive CHECK (amount > 0);
    `);

    // ── Append-only ──────────────────────────────────────────────────────────
    await this.dataSource.query(`
      CREATE OR REPLACE FUNCTION ledger_forbid_mutation() RETURNS trigger AS $fn$
      BEGIN
        RAISE EXCEPTION
          'ledger is append-only: % on % is not permitted. Post a reversing journal instead.',
          TG_OP, TG_TABLE_NAME;
      END;
      $fn$ LANGUAGE plpgsql;
    `);

    for (const table of ['ledger_journals', 'ledger_entries']) {
      await this.dataSource.query(
        `DROP TRIGGER IF EXISTS trg_${table}_append_only ON ${table};`,
      );
      await this.dataSource.query(`
        CREATE TRIGGER trg_${table}_append_only
          BEFORE UPDATE OR DELETE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION ledger_forbid_mutation();
      `);
    }

    // ── Balance invariant, checked at COMMIT ────────────────────────────────
    // DEFERRABLE INITIALLY DEFERRED is essential: lines are inserted one at a
    // time, so a per-statement check would fail on the very first line of every
    // journal. Deferring to COMMIT means only the finished journal must balance.
    await this.dataSource.query(`
      CREATE OR REPLACE FUNCTION ledger_assert_balanced() RETURNS trigger AS $fn$
      DECLARE
        total_debit numeric(14,2);
        total_credit numeric(14,2);
      BEGIN
        SELECT
          COALESCE(SUM(CASE WHEN direction = 'DEBIT'  THEN amount ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0)
          INTO total_debit, total_credit
        FROM ledger_entries WHERE "journalId" = NEW."journalId";

        IF total_debit <> total_credit THEN
          RAISE EXCEPTION
            'unbalanced journal %: debits % <> credits %',
            NEW."journalId", total_debit, total_credit;
        END IF;
        RETURN NULL;
      END;
      $fn$ LANGUAGE plpgsql;
    `);

    await this.dataSource.query(
      `DROP TRIGGER IF EXISTS trg_ledger_entries_balanced ON ledger_entries;`,
    );
    await this.dataSource.query(`
      CREATE CONSTRAINT TRIGGER trg_ledger_entries_balanced
        AFTER INSERT ON ledger_entries
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION ledger_assert_balanced();
    `);

    // ── Escrow positions view — derived, so it can never drift from the ledger ─
    await this.dataSource.query(`
      CREATE OR REPLACE VIEW escrow_positions AS
      SELECT
        e."quoteId",
        e.currency,
        SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE -e.amount END) AS balance
      FROM ledger_entries e
      WHERE e."accountCode" = 'ESCROW_LIABILITY_ZMW' AND e."quoteId" IS NOT NULL
      GROUP BY e."quoteId", e.currency
      HAVING SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE -e.amount END) <> 0;
    `);

    // ── Seller venture-account positions — derived per seller, same pattern ──
    await this.dataSource.query(`
      CREATE OR REPLACE VIEW seller_venture_positions AS
      SELECT
        e."counterpartyId" AS "sellerId",
        e.currency,
        SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE -e.amount END) AS balance
      FROM ledger_entries e
      WHERE e."accountCode" = 'SELLER_PAYABLE_ZMW' AND e."counterpartyId" IS NOT NULL
      GROUP BY e."counterpartyId", e.currency
      HAVING SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE -e.amount END) <> 0;
    `);

    this.logger.log('Ledger integrity guards installed (append-only, balance, positive amounts, escrow + seller venture views)');
  }

  /** Seed the fixed chart of accounts. Insert-only — never overwrites. */
  private async seedAccounts(): Promise<void> {
    for (const acct of LEDGER_ACCOUNTS) {
      await this.dataSource.query(
        `INSERT INTO ledger_accounts (code, name, type, "normalSide", currency, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO NOTHING`,
        [acct.code, acct.name, acct.type, acct.normalSide, acct.currency, acct.description],
      );
    }
    this.logger.log(`Ledger chart of accounts seeded (${LEDGER_ACCOUNTS.length} accounts)`);
  }
}
