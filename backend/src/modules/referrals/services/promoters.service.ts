import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User } from '../../users/entities/user.entity';
import { UserEmail } from '../../users/entities/user-email.entity';
import { BCRYPT_SALT_ROUNDS } from '../../../common/constants/security';
import { ReferralLink } from '../entities/referral-link.entity';
import { Milestone } from '../entities/milestone.entity';
import { EquityAward } from '../entities/equity-award.entity';
import { PromoterSetting } from '../entities/promoter-setting.entity';
import { PromoterProfile } from '../entities/promoter-profile.entity';
import { PromoterSignupDto } from '../dto/promoter-signup.dto';
import { UpdatePromoterProfileDto } from '../dto/update-promoter-profile.dto';
import { UserDisplayIdUtil } from '../../../utils/user-display-id.util';
import { ReferralCodeUtil } from '../../../utils/referral-code.util';
import { FunnelTrackingService, FunnelCounts } from './funnel-tracking.service';

export interface PromoterDashboard {
  funnel: FunnelCounts;
  referralCode: string;
  referralUrl: string;
  activeMilestone: {
    id: string;
    title: string;
    targetStage: string;
    current: number;
    required: number;
    pct: number;
    equitySharesReward: number;
  } | null;
  totalEquityShares: number;
  unlockedMilestones: Array<{
    id: string;
    title: string;
    sharesAwarded: number;
    awardedAt: Date;
  }>;
}

/**
 * Promoter account provisioning + dashboard reads.
 *
 * PROMOTER accounts are minted ONLY here (the public /auth/register DTO
 * deliberately rejects the role) and are fully self-serve: user row +
 * primary email + referral link land in one transaction, no admin step.
 *
 * Uses entity-only User/UserEmail repositories — never UsersModule — so
 * UsersModule → ReferralsModule (registration referral capture) stays a
 * one-directional dependency edge.
 */
@Injectable()
export class PromotersService {
  private readonly logger = new Logger(PromotersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserEmail)
    private readonly userEmailsRepository: Repository<UserEmail>,
    @InjectRepository(ReferralLink)
    private readonly referralLinksRepository: Repository<ReferralLink>,
    @InjectRepository(Milestone)
    private readonly milestonesRepository: Repository<Milestone>,
    @InjectRepository(EquityAward)
    private readonly equityAwardsRepository: Repository<EquityAward>,
    @InjectRepository(PromoterSetting)
    private readonly settingsRepository: Repository<PromoterSetting>,
    @InjectRepository(PromoterProfile)
    private readonly profilesRepository: Repository<PromoterProfile>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly funnelTrackingService: FunnelTrackingService,
  ) {}

  // ── Invite key (admin-managed, env fallback) ─────────────────────────

  /**
   * The key that currently gates signup: the admin-rotated DB value when a
   * settings row exists, else the PROMOTER_INVITE_KEY env fallback, else
   * null (programme switched off).
   */
  private async getEffectiveInviteKey(): Promise<string | null> {
    const row = await this.settingsRepository.find({ take: 1 });
    if (row.length && row[0].inviteKey) return row[0].inviteKey;
    return this.configService.get<string | null>('promoter.inviteKey') ?? null;
  }

  /** Admin read: current key + the unlisted signup URL to share alongside it. */
  async getInviteSettings() {
    const inviteKey = await this.getEffectiveInviteKey();
    const row = await this.settingsRepository.find({ take: 1 });
    return {
      inviteKey,
      signupUrl: this.buildSignupUrl(),
      /** null ⇒ the key is still the env fallback, never rotated from the UI. */
      rotatedAt: row.length ? row[0].updatedAt : null,
    };
  }

  /**
   * Admin rotate: mint a fresh readable key (PROQUOTE-XXXXX-XXXXX, same
   * unambiguous charset as referral codes) and upsert the single settings
   * row. The old key stops working the moment this commits.
   */
  async rotateInviteKey() {
    const inviteKey = PromotersService.generateInviteKey();
    const existing = await this.settingsRepository.find({ take: 1 });
    if (existing.length) {
      existing[0].inviteKey = inviteKey;
      await this.settingsRepository.save(existing[0]);
    } else {
      await this.settingsRepository.save(this.settingsRepository.create({ inviteKey }));
    }
    this.logger.log('Promoter invite key rotated by admin');
    return this.getInviteSettings();
  }

  /** Crypto-random, read-aloud-friendly: no 0/O/1/I lookalikes. */
  private static generateInviteKey(): string {
    const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.randomBytes(10);
    const chars = Array.from(bytes, (b) => CHARSET[b % 32]);
    return `PROQUOTE-${chars.slice(0, 5).join('')}-${chars.slice(5, 10).join('')}`;
  }

  // ── Signup (invite-gated, auto-provisioning) ─────────────────────────

  async signup(dto: PromoterSignupDto) {
    const inviteKey = await this.getEffectiveInviteKey();
    if (!inviteKey) {
      // No admin key AND no env fallback ⇒ the programme is switched off.
      throw new ForbiddenException('Promoter signup is not open');
    }
    // Constant-time compare — a plain !== leaks how many leading characters
    // matched via response timing. timingSafeEqual requires equal-length
    // buffers, so the length check short-circuits first (length alone is a
    // far smaller leak than a character-by-character one).
    const presented = Buffer.from(dto.inviteKey.trim());
    const expected = Buffer.from(inviteKey);
    const keyMatches =
      presented.length === expected.length && crypto.timingSafeEqual(presented, expected);
    if (!keyMatches) {
      throw new ForbiddenException('Invalid invite key');
    }

    const email = dto.email.toLowerCase();
    const existingEmail = await this.userEmailsRepository.findOne({ where: { email } });
    if (existingEmail) {
      throw new ConflictException(
        `Email ${email} is already registered. Please use a different email or recover your account.`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const { user, link } = await this.dataSource.transaction(async (manager) => {
      // Auth row only — no NRC, no profile row (PROMOTER behaves like ADMIN:
      // createProfileForRole's default:null branch never runs for it anyway,
      // and this path doesn't call it at all).
      const created = manager.create(User, {
        password: passwordHash,
        role: 'PROMOTER',
        isActive: true,
      });
      const savedUser = await manager.save(created);

      // Same save-hash-save displayId convention as UsersService.register.
      savedUser.displayId = UserDisplayIdUtil.generateDisplayId(savedUser.id);
      await manager.save(savedUser);

      await manager.save(
        manager.create(UserEmail, {
          userId: savedUser.id,
          email,
          isPrimary: true,
          verificationStatus: 'NOT_VERIFIED',
        }),
      );

      // Referral code: deterministic hash of the uuid; bump the salt on the
      // (vanishingly rare) collision with an existing code.
      let code = '';
      for (let salt = 0; salt < 5; salt++) {
        const candidate = ReferralCodeUtil.generateCode(savedUser.id, salt);
        const clash = await manager.findOne(ReferralLink, { where: { code: candidate } });
        if (!clash) {
          code = candidate;
          break;
        }
      }
      if (!code) {
        throw new ConflictException('Could not allocate a referral code — please retry');
      }

      const savedLink = await manager.save(
        manager.create(ReferralLink, {
          promoterUserId: savedUser.id,
          code,
          promoterName: dto.name,
          promoterEmail: email,
          promoterPhone: dto.phone || null,
        }),
      );

      // Identity profile — the selfie + ID document + socials that prove
      // it's really the artist behind the invite key. Same transaction as
      // the account, so a promoter can never exist without their proof.
      await manager.save(
        manager.create(PromoterProfile, {
          userId: savedUser.id,
          bio: dto.bio || null,
          socialLinks: dto.socialLinks,
          selfiePath: dto.selfie,
          idDocumentPath: dto.idDocument,
          verificationStatus: 'PENDING',
        }),
      );

      return { user: savedUser, link: savedLink };
    });

    // Same claims shape as AuthService.generateAccessToken/RefreshToken.
    // Re-implemented locally rather than exported from AuthModule (which
    // deliberately exports nothing) so this module stays fully additive.
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        displayId: user.displayId,
        email,
        role: user.role,
        type: 'access',
      },
      {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn') || '1h',
      },
    );
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiresIn') || '7d',
      },
    );
    await this.usersRepository.update({ id: user.id }, { refreshToken });

    this.logger.log(`Promoter provisioned: ${user.displayId} (${email}) code=${link.code}`);

    return {
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        displayId: user.displayId,
        email,
        name: link.promoterName,
        role: user.role,
      },
      referralCode: link.code,
      referralUrl: this.buildReferralUrl(link.code),
    };
  }

  // ── Reads ────────────────────────────────────────────────────────────

  async getMe(promoterUserId: string) {
    const link = await this.getLinkOrThrow(promoterUserId);
    // Pre-profile promoters (accounts created before the identity profile
    // shipped) resolve with null profile fields — the UI prompts them to
    // complete it.
    // select:false on selfiePath/idDocumentPath (see entity) — this is the
    // one legitimate read that needs them: a promoter viewing their own
    // submission.
    const profile = await this.profilesRepository
      .createQueryBuilder('p')
      .addSelect('p.selfiePath')
      .addSelect('p.idDocumentPath')
      .where('p.userId = :userId', { userId: promoterUserId })
      .getOne();
    return {
      id: promoterUserId,
      name: link.promoterName,
      email: link.promoterEmail,
      phone: link.promoterPhone,
      referralCode: link.code,
      referralUrl: this.buildReferralUrl(link.code),
      createdAt: link.createdAt,
      bio: profile?.bio ?? null,
      socialLinks: profile?.socialLinks ?? [],
      selfie: profile?.selfiePath ?? null,
      idDocument: profile?.idDocumentPath ?? null,
      verificationStatus: profile?.verificationStatus ?? 'PENDING',
      rejectionReason: profile?.rejectionReason ?? null,
    };
  }

  /**
   * PATCH /promoter/me. Name/phone sync onto referral_links (the
   * denormalized identity every list read uses); the rest lands on the
   * profile row (get-or-create, so pre-profile accounts heal here).
   * Re-submitting selfie/ID document resets verification to PENDING.
   */
  async updateProfile(promoterUserId: string, dto: UpdatePromoterProfileDto) {
    const link = await this.getLinkOrThrow(promoterUserId);
    if (dto.name !== undefined || dto.phone !== undefined) {
      if (dto.name !== undefined) link.promoterName = dto.name;
      if (dto.phone !== undefined) link.promoterPhone = dto.phone || null;
      await this.referralLinksRepository.save(link);
    }

    let profile = await this.profilesRepository.findOne({ where: { userId: promoterUserId } });
    if (!profile) {
      profile = this.profilesRepository.create({ userId: promoterUserId });
    }
    if (dto.bio !== undefined) profile.bio = dto.bio || null;
    if (dto.socialLinks !== undefined) profile.socialLinks = dto.socialLinks;
    const identityChanged = dto.selfie !== undefined || dto.idDocument !== undefined;
    if (dto.selfie !== undefined) profile.selfiePath = dto.selfie;
    if (dto.idDocument !== undefined) profile.idDocumentPath = dto.idDocument;
    if (identityChanged) {
      profile.verificationStatus = 'PENDING';
      profile.rejectionReason = null;
    }
    await this.profilesRepository.save(profile);

    return this.getMe(promoterUserId);
  }

  // ── Admin review ─────────────────────────────────────────────────────

  /** Full detail for the admin review modal — includes selfie + document. */
  async getAdminDetail(promoterUserId: string) {
    const me = await this.getMe(promoterUserId);
    const funnel = await this.funnelTrackingService.getFunnelCounts(promoterUserId);
    const totalEquityShares = await this.funnelTrackingService.getTotalShares(promoterUserId);
    return { ...me, funnel, totalEquityShares };
  }

  async setVerification(
    promoterUserId: string,
    status: 'VERIFIED' | 'REJECTED',
    reason?: string,
  ) {
    let profile = await this.profilesRepository.findOne({ where: { userId: promoterUserId } });
    if (!profile) {
      // Pre-profile account: create the row so the decision has somewhere to live.
      await this.getLinkOrThrow(promoterUserId); // 404 if not a promoter at all
      profile = this.profilesRepository.create({ userId: promoterUserId });
    }
    profile.verificationStatus = status;
    profile.rejectionReason = status === 'REJECTED' ? reason || null : null;
    await this.profilesRepository.save(profile);
    this.logger.log(`Promoter ${promoterUserId} verification → ${status}`);
    return this.getAdminDetail(promoterUserId);
  }

  async getDashboard(promoterUserId: string): Promise<PromoterDashboard> {
    const link = await this.getLinkOrThrow(promoterUserId);

    const [funnel, totalEquityShares, awards, activeMilestones] = await Promise.all([
      this.funnelTrackingService.getFunnelCounts(promoterUserId),
      this.funnelTrackingService.getTotalShares(promoterUserId),
      this.equityAwardsRepository.find({
        where: { promoterUserId },
        relations: ['milestone'],
        order: { createdAt: 'DESC' },
      }),
      this.milestonesRepository.find({ where: { isActive: true } }),
    ]);

    // Active milestone = the not-yet-unlocked goal with the smallest
    // remaining gap — the one the promoter is closest to crossing.
    const unlockedIds = new Set(awards.map((a) => a.milestoneId));
    const currentFor = (stage: string) =>
      stage === 'inquiry' ? funnel.inquiries : funnel.tradesComplete;

    let active: PromoterDashboard['activeMilestone'] = null;
    let smallestGap = Number.POSITIVE_INFINITY;
    for (const m of activeMilestones) {
      if (unlockedIds.has(m.id)) continue;
      const current = currentFor(m.targetStage);
      const gap = m.requiredCount - current;
      if (gap <= 0) continue; // qualifies but award hasn't landed yet — skip
      if (gap < smallestGap) {
        smallestGap = gap;
        active = {
          id: m.id,
          title: m.title,
          targetStage: m.targetStage,
          current,
          required: m.requiredCount,
          pct: Math.min(100, Math.round((current / m.requiredCount) * 100)),
          equitySharesReward: Number(m.equitySharesReward),
        };
      }
    }

    return {
      funnel,
      referralCode: link.code,
      referralUrl: this.buildReferralUrl(link.code),
      activeMilestone: active,
      totalEquityShares,
      unlockedMilestones: awards.map((a) => ({
        id: a.milestoneId,
        title: a.milestone?.title ?? 'Milestone',
        sharesAwarded: Number(a.sharesAwarded),
        awardedAt: a.createdAt,
      })),
    };
  }

  /** Admin oversight list: every promoter + funnel counts + total shares. */
  async listForAdmin() {
    const rows: Array<Record<string, any>> = await this.referralLinksRepository.query(
      `SELECT rl."promoterUserId"                                   AS id,
              rl."promoterName"                                     AS name,
              rl."promoterEmail"                                    AS email,
              rl.code                                               AS "referralCode",
              rl."isActive"                                         AS "isActive",
              rl."createdAt"                                        AS "createdAt",
              COALESCE(pp."verificationStatus", 'PENDING')          AS "verificationStatus",
              COUNT(c.id)::int                                      AS registrations,
              COUNT(c."inquiryAdvancedAt")::int                     AS inquiries,
              COUNT(c."tradeCompleteAdvancedAt")::int               AS "tradesComplete",
              COALESCE((SELECT SUM(ea."sharesAwarded")
                          FROM equity_awards ea
                         WHERE ea."promoterUserId" = rl."promoterUserId"), 0)::float
                                                                    AS "totalEquityShares"
         FROM referral_links rl
         LEFT JOIN promoter_profiles pp ON pp."userId" = rl."promoterUserId"
         LEFT JOIN conversions c ON c."promoterUserId" = rl."promoterUserId"
        GROUP BY rl.id, pp."verificationStatus"
        ORDER BY rl."createdAt" DESC`,
    );
    return rows.map((r) => ({
      ...r,
      funnel: {
        registrations: r.registrations,
        inquiries: r.inquiries,
        tradesComplete: r.tradesComplete,
      },
    }));
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private async getLinkOrThrow(promoterUserId: string): Promise<ReferralLink> {
    const link = await this.referralLinksRepository.findOne({ where: { promoterUserId } });
    if (!link) throw new NotFoundException('No referral link found for this account');
    return link;
  }

  private buildReferralUrl(code: string): string {
    return `${this.appBase()}/role-selection?ref=${encodeURIComponent(code)}`;
  }

  private buildSignupUrl(): string {
    return `${this.appBase()}/promote`;
  }

  private appBase(): string {
    return (this.configService.get<string>('promoter.appBaseUrl') || '').replace(/\/+$/, '');
  }
}
