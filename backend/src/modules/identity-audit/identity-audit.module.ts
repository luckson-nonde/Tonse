import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityAudit } from './entities/identity-audit.entity';
import { IdentityAuditService } from './identity-audit.service';

/**
 * Identity Audit Module
 *
 * Owns the `identity_audits` table and its service. No controller —
 * audit entries are written by other services (UsersService, AuthService
 * via UsersService wrappers); a read API can be added here later.
 */
@Module({
  imports: [TypeOrmModule.forFeature([IdentityAudit])],
  providers: [IdentityAuditService],
  exports: [IdentityAuditService],
})
export class IdentityAuditModule {}
