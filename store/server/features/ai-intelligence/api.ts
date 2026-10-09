import { CRM_URL } from '@/utils/constants';
import { communicationAuthHeaders } from '@/store/server/features/communication/queries';

export const AI_INTELLIGENCE_URL = `${CRM_URL}/ai-intelligence`;

export async function aiIntelligenceAuthHeaders(): Promise<
  Record<string, string>
> {
  return communicationAuthHeaders();
}
