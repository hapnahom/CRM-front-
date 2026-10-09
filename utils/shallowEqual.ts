export function shallowEqual(objA: any, objB: any) {
  if (objA === objB) return true; // Same reference, no need to compare

  if (
    typeof objA !== 'object' ||
    typeof objB !== 'object' ||
    objA === null ||
    objB === null
  ) {
    return false; // If either is not an object, return false
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false; // Different number of keys

  for (const key of keysA) {
    if (objA[key] !== objB[key]) return false; // Different values
  }

  return true; // Objects are shallowly equal
}
