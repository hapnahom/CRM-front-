import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { CRM_URL } from '@/utils/constants';
import { requestHeader } from '@/helpers/requestHeader';

const getAllUsersWithOutPagination = async () => {
  const headers = await requestHeader();
  return crudRequest({
    url: `${CRM_URL}/org-emp/users`,
    method: 'GET',
    headers,
  });
};

export const useGetAllUsers = () =>
  useQuery<any>('employeesWithOutPagination', getAllUsersWithOutPagination);
