// 체험단 관련 타입 정의

export type UserStatus = 'available' | 'applied_as_leader' | 'applied_as_member' | 'leader_application_pending' | 'member' | 'leader';
export type TeamStatus = 'PENDING_LEADER_APPROVAL' | 'FORMING' | 'ACTIVE' | 'COMPLETED';

export interface ExperienceCampaign {
  id: string;
  title: string;
  description?: string;
  missionGuide?: string;
  benefits?: string;
  targetTeamCount: number;
  maxMembersPerTeam: number;
  applicationDeadline: string;
  startDate: string;
  endDate: string;
  status: string;
  advertiser: {
    user: {
      name: string;
    };
  };
  manager: {
    name: string;
  };
  place: {
    name: string;
    externalProvider?: string;
  };
  _count: {
    teams: number;
  };
  userStatus: UserStatus;
  canApplyAsLeader: boolean;
  teams?: Team[];
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  status: TeamStatus;
  leaderId: string;
  experienceCampaign: {
    id: string;
    title: string;
    maxMembersPerTeam: number;
    startDate: string;
    endDate: string;
  };
  memberships: TeamMembership[];
  userRole: 'leader' | 'member';
  _count: {
    memberships: number;
  };
}

export interface TeamMembership {
  id: string;
  userId: string;
  role: 'leader' | 'member';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  appliedAt: string;
  decidedAt?: string;
  failureReason?: string;
  member: {
    name: string;
    email: string;
  };
}

export interface TeamApplicationForm {
  campaignId: string;
  teamName: string;
  teamDescription: string;
}

export interface SubmissionForm {
  materialsPath: string;
  materialsSize: number;
  contentTitle: string;
  contentBody: string;
  contentLinks: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TeamsResponse {
  teams: Team[];
}

export interface CampaignsResponse {
  campaigns: ExperienceCampaign[];
}
