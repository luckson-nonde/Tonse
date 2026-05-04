/**
 * Team API Service — talks to /team/members on the backend.
 * Replaces the previous IndexedDB-only roster (db.users.where(
 * 'parentProviderId').equals(...)) which never persisted past the
 * device.
 */

import { apiClient } from './client';

export interface CreateTeamMemberPayload {
  name: string;
  email: string;
  phone: string;
  password?: string;
  permissions?: string[];
  /**
   * Optional restriction to one archetype's leads view (e.g. 'REPAIR').
   * NULL on the backend = no restriction; a staff with assignedArchetype
   * locks to that variant in ProviderLeadsView's toggle.
   */
  assignedArchetype?: string | null;
}

export interface UpdateTeamMemberPayload {
  name?: string;
  email?: string;
  phone?: string;
  permissions?: string[];
  assignedArchetype?: string | null;
  isActive?: boolean;
  /** Promote/demote to department head. Backend enforces "one head
   *  per (parentProviderId, assignedArchetype)" — second promotion
   *  for the same archetype returns 409. */
  isDepartmentHead?: boolean;
  /** Required when isDepartmentHead = true. INDEPENDENT auto-flips
   *  canMoveFinance true on the backend; MANAGED keeps it false. */
  departmentAutonomy?: 'INDEPENDENT' | 'MANAGED';
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  parentProviderId: string;
  permissions: string[];
  assignedArchetype: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
  /** Phase 5 — department head delegation. */
  isDepartmentHead?: boolean;
  departmentAutonomy?: 'INDEPENDENT' | 'MANAGED' | null;
  canMoveFinance?: boolean;
  hasPin?: boolean;
  archetypes?: string[]; // inherited from parent
  categoryIds?: string[]; // inherited from parent
  createdAt: string;
}

export interface CreateTeamMemberResponse {
  user: TeamMember;
  /** Returned ONCE on creation when the backend auto-generated the
   * password (i.e. caller didn't supply one). The owner shares it
   * with the staff member; staff must change it on first login. */
  generatedPassword?: string;
}

export const teamService = {
  async create(payload: CreateTeamMemberPayload): Promise<CreateTeamMemberResponse> {
    const response = await apiClient.post<CreateTeamMemberResponse>('/team/members', payload);
    if (!response.data) throw new Error('Empty response from /team/members');
    return response.data;
  },

  async list(): Promise<TeamMember[]> {
    const response = await apiClient.get<TeamMember[]>('/team/members');
    return response.data ?? [];
  },

  async update(id: string, payload: UpdateTeamMemberPayload): Promise<TeamMember> {
    const response = await apiClient.patch<TeamMember>(`/team/members/${id}`, payload);
    if (!response.data) throw new Error(`Empty response from /team/members/${id}`);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/team/members/${id}`);
  },
};
