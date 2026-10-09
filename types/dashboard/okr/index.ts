export interface RookStarsListProps {
  title: string;
  data: Recognition[];
}
export interface SuperStartProps {
  calendarId: string;
  certificateDetails: string | null;
  createdAt: string;
  createdBy: string | null;
  criteriaScore: any[];
  criteriaVerified: boolean;
  dataImportId: string | null;
  dateIssued: string;
  deletedAt: string | null;
  id: string;
  incentiveIssued: boolean;
  isAutomated: boolean;
  issuerId: string;
  monthId: string;
  recipientId: string;
  recognitionTypeId: string;
  sessionId: string;
  status: string;
  tenantId: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  user: UserData;
}

export interface UserData {
  profileImage?: string | null;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  role?: {
    name?: string;
  };
}
export interface Recognition {
  id: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  recognitionTypeId: string;
  recipientId: string;
  issuerId: string;
  dateIssued: string;
  dataImportId: string | null;
  incentiveIssued: boolean;
  status: string;
  criteriaVerified: boolean;
  isAutomated: boolean;
  certificateDetails: any;
  criteriaScore: any[];
  tenantId: string;
  calendarId: string;
  sessionId: string;
  monthId: string;
  user: UserData;
}

export interface ListData {
  key: string;
  name: string;
  title: string;
  avatar: string;
  completion: number;
}

export interface SelectOption {
  key: string;
  value: string;
  label: string;
}

interface OKRValue {
  userOkr: number;
  score: string;
  progress: string;
  progressType: boolean;
  achievement?: string;
}
export interface CardData {
  key: string;
  name: string;
  position: string;
  department: string;
  okr: OKRValue;
  supervisorOkr: OKRValue;
  keyResults: OKRValue;
  vp: OKRValue;
  issuedReprimand: OKRValue;
  receiveReprimand: OKRValue;
  issuedAppreciations: OKRValue;
  receiveAppreciations: OKRValue;
  updatedAt: string;
}

export interface DashboardCardProps {
  updatedAt: string;
  score: OKRValue;
  title: string;
  icon: React.ReactNode;
  span: number;
  isTop: boolean;
  cardColor?: string;
  isLoading?: boolean;
}
export interface SelectData {
  key: string;
  value: string;
  label: string;
}

export interface WeeklyScore {
  label: string;
  scoreValue: number;
}
