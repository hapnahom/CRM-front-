import { useQuery } from 'react-query';

export const useGetAllRecognitionWithRelations = () => {
  return useQuery({
    queryKey: ['allRecognitionWithRelations'],
    queryFn: async () => {
      // Placeholder data - module not fully implemented
      return {
        items: [],
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
