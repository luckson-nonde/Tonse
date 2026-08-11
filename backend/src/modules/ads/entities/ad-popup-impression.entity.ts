import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

/**
 * One "this viewer was shown this pop-up" record — the memory that makes the
 * Spotlight rotation FAIR and the frequency cap REAL.
 *
 * Two jobs, both served by the same tiny row:
 *   1. Fairness — "least recently seen by THIS viewer, tie-broken by fewest
 *      impressions overall" is what stops one advertiser dominating and lets
 *      a brand-new one catch up.
 *   2. Rationing — counting a viewer's rows inside the admin's time window is
 *      the cap that keeps pop-ups from becoming spam.
 *
 * `viewerKey` is deliberately NOT a users.id FK: a guest browsing the public
 * pages is exactly who we most need to rate-limit, and they have no account.
 * It holds `users.id` when signed in, otherwise an anonymous uuid the browser
 * mints once into localStorage. Same "loose id, no FK" convention the job
 * board and ad targeting already use.
 *
 * Written server-side at the moment the ad is handed out, so a client cannot
 * lie its way past the cap. The trade: an ad fetched but never painted still
 * counts. Accepted deliberately — the alternative is a confirm round-trip per
 * view, which is not worth it here.
 *
 * Pruned to 30 days by AdsMediaSweepService at boot: this table only exists to
 * answer "recently", so unbounded history would be cost without value.
 */
@Entity('ad_popup_impressions')
@Index('idx_popup_impressions_viewer', ['viewerKey', 'shownAt'])
@Index('idx_popup_impressions_ad', ['adId'])
export class AdPopupImpression {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  adId: string;

  /** users.id, or an anonymous browser-minted uuid for a guest. */
  @Column({ type: 'varchar', length: 64 })
  viewerKey: string;

  @CreateDateColumn()
  shownAt: Date;

  /** Set when the viewer actually clicked through — lets an admin show a
   *  seller real engagement instead of just "it ran". */
  @Column({ type: 'timestamp', nullable: true })
  clickedAt: Date | null;
}
