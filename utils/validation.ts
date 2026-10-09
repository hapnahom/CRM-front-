/**
 * Validates phone number format
 * - Only numeric digits (0-9)
 * - May optionally start with "+" for international format
 * - Rejects letters, special characters (except leading "+"), spaces
 *
 * @param phone - Phone number string to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * validatePhone("+1234567890") // true
 * validatePhone("1234567890") // true
 * validatePhone("abc123") // false
 * validatePhone("09@123") // false
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone || phone.trim() === '') return false;

  // Remove leading + if present for validation
  const phoneWithoutPlus = phone.startsWith('+') ? phone.slice(1) : phone;

  // Check if remaining characters are all digits
  const phoneRegex = /^\d+$/;

  return phoneRegex.test(phoneWithoutPlus);
};

/**
 * Validates website URL format
 * - Must start with "http://", "https://", or "www."
 * - Must include valid domain name (letters, numbers, hyphens)
 * - Must have at least one dot (.) separating domain and extension
 * - Must have valid TLD (.com, .org, .net, .co, .io, .gov, .edu, etc.)
 *
 * @param website - Website URL string to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * validateWebsite("https://ienetworks.co") // true
 * validateWebsite("http://example.org") // true
 * validateWebsite("www.example.com") // true
 * validateWebsite("https://www.example.com") // true
 * validateWebsite("abcd") // false
 * validateWebsite("https://ienetworks") // false (missing TLD)
 * validateWebsite("https://example.123") // false (invalid TLD)
 */
export const validateWebsite = (website: string): boolean => {
  if (!website || website.trim() === '') return false;

  const trimmedWebsite = website.trim();

  // Must start with http://, https://, or www.
  const startsWithValid =
    trimmedWebsite.startsWith('http://') ||
    trimmedWebsite.startsWith('https://') ||
    trimmedWebsite.startsWith('www.');

  if (!startsWithValid) return false;

  // Remove protocol prefix for domain validation
  let domain = trimmedWebsite;
  if (domain.startsWith('http://')) {
    domain = domain.replace('http://', '');
  } else if (domain.startsWith('https://')) {
    domain = domain.replace('https://', '');
  }

  // Remove www. prefix if present
  if (domain.startsWith('www.')) {
    domain = domain.replace('www.', '');
  }

  // Must have at least one dot separating domain and TLD
  if (!domain.includes('.')) return false;

  // Valid domain pattern: letters, numbers, hyphens, dots
  // Must end with valid TLD (2+ letters)
  const domainRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

  return domainRegex.test(domain);
};
