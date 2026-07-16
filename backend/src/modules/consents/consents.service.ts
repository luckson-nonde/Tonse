import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserConsent } from './entities/user-consent.entity';

@Injectable()
export class ConsentsService {
  constructor(
    @InjectRepository(UserConsent)
    private readonly repo: Repository<UserConsent>,
  ) {}

  /** Record a consent grant or withdrawal (append-only). */
  async record(
    userId: string,
    noticeKey: string,
    granted: boolean,
    version = '1',
    method?: string,
  ): Promise<UserConsent> {
    const row = this.repo.create({ userId, noticeKey, granted, version, method });
    return this.repo.save(row);
  }

  /** Current consent state: latest decision per noticeKey for this user. */
  async current(userId: string): Promise<Record<string, { granted: boolean; version: string; at: Date }>> {
    const rows = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const out: Record<string, { granted: boolean; version: string; at: Date }> = {};
    for (const r of rows) {
      if (!out[r.noticeKey]) {
        out[r.noticeKey] = { granted: r.granted, version: r.version, at: r.createdAt };
      }
    }
    return out;
  }
}
