import {
  useActiveSolutionRoles as useActiveSolutionRolesFromPipeline,
  usePipelineRoles,
  type PipelineRoleDto,
} from '@/store/server/features/pipeline-roles/queries';

/** @deprecated Use PipelineRoleDto with usageContext === 'SOLUTION' */
export type SolutionRoleDto = PipelineRoleDto;

/** @deprecated Use usePipelineRoles and filter by isSolutionRole */
export function useSolutionRoles(options?: { enabled?: boolean }) {
  const query = usePipelineRoles(options);
  const roles = [...(query.data ?? [])]
    .filter((role) => role.usageContext === 'SOLUTION')
    .sort(
      (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
    );
  return { ...query, data: roles };
}

export { useActiveSolutionRolesFromPipeline as useActiveSolutionRoles };
