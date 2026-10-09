export type PresalesTeam = {
  id: string;
  name: string;
  manager: string;
  members: string[];
};

const MOCK_PRESALES_TEAMS: PresalesTeam[] = [
  {
    id: 'presales-enterprise',
    name: 'Enterprise Pre-sales',
    manager: 'Daniel Bekele',
    members: ['Daniel Bekele', 'Nahom Esrael', 'Hana Worku'],
  },
  {
    id: 'presales-sme',
    name: 'SME Pre-sales',
    manager: 'Biruk Mekonnen',
    members: ['Biruk Mekonnen', 'Sara Tesfaye'],
  },
];

export function getPresalesTeams(): PresalesTeam[] {
  return MOCK_PRESALES_TEAMS;
}

export function findPresalesTeamByMember(
  memberName: string,
): PresalesTeam | null {
  if (!memberName) return null;
  return (
    getPresalesTeams().find((team) => team.members.includes(memberName)) ?? null
  );
}

export function findPresalesTeamById(teamId: string): PresalesTeam | null {
  if (!teamId) return null;
  return getPresalesTeams().find((team) => team.id === teamId) ?? null;
}
