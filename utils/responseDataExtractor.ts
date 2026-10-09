/**
 * Utility function to extract array data from different API response formats
 * Handles various response structures consistently
 */
export const extractArrayFromResponse = <T>(data: any): T[] => {
  if (Array.isArray(data)) {
    return data;
  }

  if (data?.items && Array.isArray(data.items)) {
    return data.items;
  }

  if (data?.data && Array.isArray(data.data)) {
    return data.data;
  }

  if (data?.results && Array.isArray(data.results)) {
    return data.results;
  }

  // Return empty array as fallback
  return [];
};

/**
 * Utility function to validate required lead data before deal creation
 */
export const validateLeadDataForDeal = (
  leadData: any,
): { isValid: boolean; missingFields: string[] } => {
  const requiredFields = ['companyId', 'supplierId', 'sectorId'];
  const missingFields = requiredFields.filter((field) => !leadData?.[field]);

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

/**
 * Utility function to safely extract string value with fallback
 */
export const safeStringExtract = (
  value: any,
  fallback: string = '',
): string => {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }
  return fallback;
};

/**
 * Utility function to safely extract array value
 */
export const safeArrayExtract = (value: any): any[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item);
  }
  return [];
};
