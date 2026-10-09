import { useQuery } from 'react-query';

export const useGetTimeZone = () => {
  return useQuery({
    queryKey: ['timezone'],
    queryFn: async () => {
      // Mock data for now
      return [
        { id: 1, name: 'UTC', offset: '+00:00' },
        { id: 2, name: 'EST', offset: '-05:00' },
        { id: 3, name: 'PST', offset: '-08:00' },
      ];
    },
    staleTime: 10 * 60 * 1000,
  });
};
