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
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

/**
 * Team Service — owners (top-level providers) manage staff users.
 *
 * Team members are User rows with `parentProviderId` set to the
 * owner's user.id. They carry their own auth identity (email +
 * password) and a minimal profile row for personal contact info, but
 * their categories / archetypes / leads come from the parent's
 * profile. The matching service and dashboard composer both fall
 * back to the parent's profile when the caller has parentProviderId.
 *
 * Owners ↔ staff is a single-level hierarchy: a staff member cannot
 * have their own staff (rejected at creation time).
 */
@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserEmail)
    private readonly userEmailRepository: Repository<UserEmail>,
    private readonly usersService: UsersService,
  ) {}

  async create(parentProvider: User, dto: CreateTeamMemberDto) {
    if (parentProvider.parentProviderId) {
      throw new ForbiddenException(
        'Team members cannot create their own team members',
      );
    }
    if (parentProvider.role === 'BUYER' || parentProvider.role === 'ADMIN') {
      throw new ForbiddenException(
        'Only sellers and service providers can have team members',
      );
    }

    const emailLower = dto.email.toLowerCase();
    const existingEmail = await this.userEmailRepository.findOne({
      where: { email: emailLower },
    });
    if (existingEmail) {
      throw new ConflictException(`Email ${dto.email} is already registered`);
    }

    const plainPassword = dto.password || this.generatePassword();
    const generated = !dto.password;
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    // Auth row first. Staff inherits parent's role so existing RBAC
    // (which keys off `role`) keeps working — staff is signalled by
    // parentProviderId being set, not by a distinct role value.
    const user = this.userRepository.create({
      password: passwordHash,
      role: parentProvider.role,
      isActive: true,
      parentProviderId: parentProvider.id,
      permissions: dto.permissions ?? [],
      assignedArchetype: dto.assignedArchetype ?? null,
      mustChangePassword: generated,
    });
    const saved = await this.userRepository.save(user);
    saved.displayId = UserDisplayIdUtil.generateDisplayId(saved.id);
    await this.userRepository.save(saved);

    // user_emails for sign-in lookup.
    await this.userEmailRepository.save(
      this.userEmailRepository.create({
        userId: saved.id,
        email: emailLower,
        isPrimary: true,
        verificationStatus: 'NOT_VERIFIED',
      }),
    );

    // Minimal profile so name/email/phone display works; no category
    // junctions, no archetypes — staff inherit those from the parent.
    await this.usersService.createProfileForRole(saved.id, parentProvider.role, {
      name: dto.name,
      email: emailLower,
      phone: dto.phone,
      verificationStatus: 'PENDING',
    });

    const reloaded = await this.usersService.findById(saved.id);
    const flat = await this.usersService.flattenWithProfile(reloaded);

    this.logger.log(
      `team.create: parent=${parentProvider.id} created staff=${saved.id} role=${saved.role} permissions=[${(dto.permissions ?? []).join(',')}] archetype=${dto.assignedArchetype ?? '(none)'}`,
    );

    return {
      user: flat,
      generatedPassword: generated ? plainPassword : undefined,
    };
  }

  async listForParent(parentProvider: User) {
    if (parentProvider.parentProviderId) {
      throw new ForbiddenException(
        'Team members cannot list other team members',
      );
    }
    const rows = await this.userRepository.find({
      where: { parentProviderId: parentProvider.id },
      order: { createdAt: 'ASC' },
    });
    return Promise.all(
      rows.map((r) => this.usersService.flattenWithProfile(r)),
    );
  }

  async update(
    parentProvider: User,
    staffId: string,
    dto: UpdateTeamMemberDto,
  ) {
    const staff = await this.userRepository.findOne({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Team member not found');
    if (staff.parentProviderId !== parentProvider.id) {
      throw new ForbiddenException('Not your team member');
    }

    let dirty = false;
    if (dto.permissions !== undefined) {
      staff.permissions = dto.permissions;
      dirty = true;
    }
    if (dto.assignedArchetype !== undefined) {
      staff.assignedArchetype = dto.assignedArchetype;
      dirty = true;
    }
    if (dto.isActive !== undefined) {
      staff.isActive = dto.isActive;
      dirty = true;
    }
    if (dirty) await this.userRepository.save(staff);

    if (
      dto.name !== undefined ||
      dto.email !== undefined ||
      dto.phone !== undefined
    ) {
      const profileFields: Record<string, any> = {};
      if (dto.name !== undefined) profileFields.name = dto.name;
      if (dto.email !== undefined) profileFields.email = dto.email.toLowerCase();
      if (dto.phone !== undefined) profileFields.phone = dto.phone;
      // usersService.update splits between user-row patches and active-
      // profile-row patches; passing only profile fields here writes
      // them to the staff member's minimal profile row.
      await this.usersService.update(staffId, profileFields as any);

      // Mirror email change into user_emails (sign-in lookup).
      if (dto.email !== undefined) {
        await this.userEmailRepository.update(
          { userId: staffId, isPrimary: true },
          { email: dto.email.toLowerCase() },
        );
      }
    }

    const reloaded = await this.usersService.findById(staffId);
    return this.usersService.flattenWithProfile(reloaded);
  }

  async remove(parentProvider: User, staffId: string) {
    const staff = await this.userRepository.findOne({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Team member not found');
    if (staff.parentProviderId !== parentProvider.id) {
      throw new ForbiddenException('Not your team member');
    }
    // user_emails cascades on FK; profile rows have onDelete CASCADE
    // from User. So deleting the User row is sufficient.
    await this.userRepository.delete(staffId);
    this.logger.log(
      `team.remove: parent=${parentProvider.id} removed staff=${staffId}`,
    );
    return { success: true };
  }

  private generatePassword(): string {
    const chars =
      'ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  }
}
