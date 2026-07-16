import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { UserEmail } from '../users/entities/user-email.entity';
import { UsersService } from '../users/users.service';
import { UserDisplayIdUtil } from '../../utils/user-display-id.util';
import { generatePassword } from '../../utils/generate-password.util';
import { CreateAdminManagerDto } from './dto/create-admin-manager.dto';
import { UpdateAdminManagerDto } from './dto/update-admin-manager.dto';

/**
 * Admin Manager Service — the PRIMARY admin provisions restricted
 * sub-admin ("User Manager") accounts.
 *
 * A User Manager is a User row with role='ADMIN', parentProviderId set
 * to the primary admin's id, and permission codes (ADMIN_USERS /
 * ADMIN_VERIFICATIONS / ADMIN_REPORTS) in `permissions`. Server-side
 * enforcement is AdminPermissionsGuard on AdminController; deny-by-
 * default keeps everything undecorated (financial, categories,
 * milestones, clear-all-data, this service's own routes) primary-only.
 *
 * Deliberately parallel to TeamService rather than an extension of it:
 * provider staff carry a minimal profile row and inherit the parent's
 * commerce surfaces (categories/archetypes/leads); admin managers have
 * none of that — no profile row, name on users.name (the ADMIN
 * carve-out), no NRC. Single-level hierarchy: a manager can never
 * create managers (requirePrimary rejects anyone with parentProviderId).
 */
@Injectable()
export class AdminManagerService {
  private readonly logger = new Logger(AdminManagerService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserEmail)
    private readonly userEmailRepository: Repository<UserEmail>,
    private readonly usersService: UsersService,
  ) {}

  async create(primaryAdminId: string, dto: CreateAdminManagerDto) {
    const primary = await this.requirePrimary(primaryAdminId);

    const emailLower = dto.email.toLowerCase();
    const existingEmail = await this.userEmailRepository.findOne({
      where: { email: emailLower },
    });
    if (existingEmail) {
      throw new ConflictException(`Email ${dto.email} is already registered`);
    }

    const plainPassword = generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const user = this.userRepository.create({
      password: passwordHash,
      role: 'ADMIN',
      isActive: true,
      parentProviderId: primary.id,
      permissions: dto.permissions,
      mustChangePassword: true,
      name: dto.name,
    });
    const saved = await this.userRepository.save(user);
    saved.displayId = UserDisplayIdUtil.generateDisplayId(saved.id);
    await this.userRepository.save(saved);

    await this.userEmailRepository.save(
      this.userEmailRepository.create({
        userId: saved.id,
        email: emailLower,
        isPrimary: true,
        verificationStatus: 'NOT_VERIFIED',
      }),
    );

    const reloaded = await this.usersService.findById(saved.id);
    const flat = await this.usersService.flattenWithProfile(reloaded);

    this.logger.log(
      `admin-manager.create: primary=${primary.id} created manager=${saved.id} permissions=[${dto.permissions.join(',')}]`,
    );

    // generatedPassword is returned exactly once and never persisted in
    // plaintext — the manager must change it at first login.
    return { user: { ...flat, phone: dto.phone ?? null }, generatedPassword: plainPassword };
  }

  async listForPrimary(primaryAdminId: string) {
    const primary = await this.requirePrimary(primaryAdminId);
    const rows = await this.userRepository.find({
      where: { role: 'ADMIN', parentProviderId: primary.id },
      order: { createdAt: 'ASC' },
    });
    return Promise.all(rows.map((r) => this.usersService.flattenWithProfile(r)));
  }

  async update(
    primaryAdminId: string,
    managerId: string,
    dto: UpdateAdminManagerDto,
  ) {
    const primary = await this.requirePrimary(primaryAdminId);
    const manager = await this.loadOwnedManager(primary.id, managerId);

    if (dto.permissions !== undefined) manager.permissions = dto.permissions;
    if (dto.isActive !== undefined) manager.isActive = dto.isActive;
    if (dto.name !== undefined) manager.name = dto.name;
    await this.userRepository.save(manager);

    const reloaded = await this.usersService.findById(managerId);
    return this.usersService.flattenWithProfile(reloaded);
  }

  async remove(primaryAdminId: string, managerId: string) {
    const primary = await this.requirePrimary(primaryAdminId);
    await this.loadOwnedManager(primary.id, managerId);
    await this.userRepository.delete(managerId);
    this.logger.log(
      `admin-manager.remove: primary=${primary.id} removed manager=${managerId}`,
    );
    return { success: true };
  }

  /** Caller must be the primary admin: role ADMIN, no parent. */
  private async requirePrimary(userId: string): Promise<User> {
    const user = await this.usersService.findById(userId);
    if (!user || user.role !== 'ADMIN' || user.parentProviderId) {
      throw new ForbiddenException(
        'Only the primary admin can manage User Manager accounts',
      );
    }
    return user;
  }

  private async loadOwnedManager(
    primaryId: string,
    managerId: string,
  ): Promise<User> {
    const manager = await this.userRepository.findOne({
      where: { id: managerId },
    });
    if (!manager || manager.role !== 'ADMIN') {
      throw new NotFoundException('User Manager not found');
    }
    if (manager.parentProviderId !== primaryId) {
      throw new ForbiddenException('Not your User Manager account');
    }
    return manager;
  }
}
