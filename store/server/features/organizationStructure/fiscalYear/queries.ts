import { crudRequest } from '@/utils/crudRequest';
import { useQuery, QueryObserverOptions } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { FiscalYear, FiscalYearResponse } from './interface';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { requestHeader } from '@/helpers/requestHeader';

const getAllFiscalYears = async (pageSize?: number, currentPage?: number) => {
  const headers = await requestHeader();
  return await crudRequest({
    url: `${CRM_URL}/org-structure/fiscal-years?limit=${pageSize ?? 10}&page=${currentPage ?? 1}`,
    method: 'GET',
    headers,
  });
};

const getActiveFiscalYear = async () => {
  const headers = await requestHeader();
  return await crudRequest({
    url: `${CRM_URL}/org-structure/fiscal-years/active`,
    method: 'GET',
    headers,
  });
};

const getFiscalYear = async (id: string) => {
  const headers = await requestHeader();
  return await crudRequest({
    url: `${CRM_URL}/org-structure/fiscal-years/${id}`,
    method: 'GET',
    headers,
  });
};

export const useGetAllFiscalYears = (
  pageSize?: number,
  currentPage?: number,
  options?: QueryObserverOptions<FiscalYearResponse>,
) =>
  useQuery<FiscalYearResponse>(
    ['fiscalYears', pageSize, currentPage],
    () => getAllFiscalYears(pageSize, currentPage),
    options,
  );

export const useGetFiscalYearById = (id: string) =>
  useQuery<FiscalYear>(['fiscalYear', id], () => getFiscalYear(id), {
    keepPreviousData: true,
  });

export const useGetActiveFiscalYears = (
  options?: QueryObserverOptions<FiscalYear>,
) => {
  const token = useAuthenticationStore.getState().token;
  const tenantId = useAuthenticationStore.getState().tenantId;
  return useQuery<FiscalYear>('fiscalActiveYear', getActiveFiscalYear, {
    enabled: token.length > 0 && tenantId.length > 0,
    staleTime: 5 * 60_000,
    cacheTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
  });
};

export const useGetActiveFiscalYearsData = () => {
  const token = useAuthenticationStore.getState().token;
  const tenantId = useAuthenticationStore.getState().tenantId;
  return useQuery<FiscalYear>('fiscalActiveYear', getActiveFiscalYear, {
    enabled: token.length > 0 && tenantId.length > 0,
    staleTime: 5 * 60_000,
    cacheTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
