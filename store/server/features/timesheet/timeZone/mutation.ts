import { useMutation, useQueryClient } from 'react-query';
import { api } from '@/config/api';

export const useUpdateTimeZone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { timezone: string }) => {
      const response = await api.put('/timezone', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timezone'] });
    },
  });
};
