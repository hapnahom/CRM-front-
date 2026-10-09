export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'revoked';

export interface AssignedRole {
  id: string;
  name: string;
}

export interface AssignedTeam {
  id: string;
  name: string;
}

export interface InvitationDecisionData {
  invitation: {
    status: InvitationStatus;
    expiresAt: string;
    isExpired: boolean;
    canAcceptOrDecline: boolean;
  };
  inviter: {
    id: string | null;
    firstName: string | null;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
  };
  invitee: {
    selamnewId: string;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
  };
  assignedRoles: AssignedRole[];
  assignedTeam: AssignedTeam | null;
  platformName: string;
}
