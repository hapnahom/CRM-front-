import { PERMISSION_MODULES } from '@/data/userManagementData';

export type PermissionMatrix = Record<string, Record<string, boolean>>;

const SLUG_TO_CELL = new Map<string, { module: string; action: string }>();
const ALL_MATRIX_SLUGS = new Set<string>();

for (const { module, actions } of PERMISSION_MODULES) {
  for (const { action, slug } of actions) {
    SLUG_TO_CELL.set(slug, { module, action });
    ALL_MATRIX_SLUGS.add(slug);
  }
}

export function getActionsForModule(module: string): string[] {
  return (
    PERMISSION_MODULES.find((m) => m.module === module)?.actions.map(
      (a) => a.action,
    ) ?? []
  );
}

export function createEmptyPermissionMatrix(): PermissionMatrix {
  return Object.fromEntries(
    PERMISSION_MODULES.map(({ module, actions }) => [
      module,
      Object.fromEntries(actions.map(({ action }) => [action, false])),
    ]),
  );
}

export function moduleActionToSlug(
  module: string,
  action: string,
): string | null {
  return (
    PERMISSION_MODULES.find((m) => m.module === module)?.actions.find(
      (a) => a.action === action,
    )?.slug ?? null
  );
}

export function isMatrixManagedSlug(slug: string): boolean {
  return ALL_MATRIX_SLUGS.has(slug.trim().toLowerCase());
}

export function permissionSlugsToMatrix(
  slugs: string[] = [],
): PermissionMatrix {
  const matrix = createEmptyPermissionMatrix();
  const granted = new Set(slugs.map((slug) => slug.trim().toLowerCase()));

  for (const slug of granted) {
    const cell = SLUG_TO_CELL.get(slug);
    if (cell) {
      matrix[cell.module] ??= {};
      matrix[cell.module][cell.action] = true;
    }
  }

  return matrix;
}

export function matrixToPermissionSlugs(matrix: PermissionMatrix): string[] {
  const slugs: string[] = [];

  for (const { module, actions } of PERMISSION_MODULES) {
    for (const { action, slug } of actions) {
      if (matrix[module]?.[action]) {
        slugs.push(slug);
      }
    }
  }

  return slugs;
}

export function mergeMatrixPermissionSlugs(
  matrix: PermissionMatrix,
  existingSlugs: string[] = [],
): string[] {
  const preserved = existingSlugs
    .map((slug) => slug.trim())
    .filter(Boolean)
    .filter((slug) => !isMatrixManagedSlug(slug));

  return [...new Set([...preserved, ...matrixToPermissionSlugs(matrix)])];
}

export { PERMISSION_MODULES };
