import { useMutation, useQueryClient } from 'react-query';
import { api } from '@/config/api';

export const useCreateRecruitmentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await api.post('/recruitment/status', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-status'] });
    },
  });
};

export const useDeleteRecruitmentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/recruitment/status/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-status'] });
    },
  });
};
