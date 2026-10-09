import { useCallback, useState } from 'react';

const usePagination = (initialPage: number = 1, initialLimit: number = 10) => {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [orderBy, setOrderBy] = useState<string>();
  const [orderDirection, setOrderDirection] = useState<
    'ASC' | 'DESC' | undefined
  >();

  const updatePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const updateLimit = useCallback((newLimit: number) => {
    setLimit(newLimit);
  }, []);

  const updateOrderBy = useCallback((field?: string) => {
    setOrderBy(field);
  }, []);

  const updateOrderDirection = useCallback(
    (direction: 'ascend' | 'descend' | undefined) => {
      if (direction === 'ascend') {
        setOrderDirection('ASC');
      } else if (direction === 'descend') {
        setOrderDirection('DESC');
      } else {
        setOrderDirection(undefined);
      }
    },
    [],
  );

  return {
    page,
    limit,
    orderBy,
    orderDirection,
    setPage: updatePage,
    setLimit: updateLimit,
    setOrderBy: updateOrderBy,
    setOrderDirection: updateOrderDirection,
  };
};

export default usePagination;
