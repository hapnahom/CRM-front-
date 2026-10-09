/**
 * Activity Documents - Centralized exports
 */

// Export types
export * from './types';

// Export queries
export * from './queries';

// Export mutations
export * from './mutations';

// Re-export commonly used types
export type {
  ActivityDocument,
  ActivityDocumentResponse,
  UploadActivityDocumentInput,
  UpdateActivityDocumentInput,
} from './types';
