import { useQuery } from 'react-query';

export const useGetPersonalRecognition = () => {
  return useQuery({
    queryKey: ['personalRecognition'],
    queryFn: async () => {
      // Placeholder data - module not fully implemented
      return {
        feedbackIssued: {
          KPI: { reprimands: 0, appreciations: 0 },
          Engagement: { reprimands: 0, appreciations: 0 },
        },
        feedbackReceived: {
          KPI: { reprimands: 0, appreciations: 0 },
          Engagement: { reprimands: 0, appreciations: 0 },
        },
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
