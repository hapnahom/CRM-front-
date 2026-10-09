/**
 * Safely transforms API response data into an array format
 * Handles various response structures and ensures the result is always an array
 *
 * @param data - The data from API response
 * @returns An array of items, empty array if data is invalid or server is down
 */
export const safeTransformToArray = (data: any): any[] => {
  // If data is already an array, return it
  if (Array.isArray(data)) {
    return data;
  }

  // If data is null or undefined, return empty array
  if (data == null) {
    return [];
  }

  // If data is an object, try to extract array from common properties
  if (typeof data === 'object') {
    // Check for common array properties
    if (Array.isArray(data.items)) {
      return data.items;
    }
    if (Array.isArray(data.data)) {
      return data.data;
    }
    if (Array.isArray(data.results)) {
      return data.results;
    }
    if (Array.isArray(data.users)) {
      return data.users;
    }
    if (Array.isArray(data.roles)) {
      return data.roles;
    }
  }

  // If we can't find an array, return empty array
  return [];
};

/**
 * Safely maps over an array with fallback to empty array
 * Prevents "map is not a function" errors when server is down
 *
 * @param array - The array to map over
 * @param mapper - The mapping function
 * @returns Mapped array or empty array if input is invalid
 */
export const safeMap = <T, U>(
  array: T[] | undefined | null,
  mapper: (item: T, index: number) => U,
): U[] => {
  if (!Array.isArray(array)) {
    return [];
  }
  return array.map(mapper);
};
