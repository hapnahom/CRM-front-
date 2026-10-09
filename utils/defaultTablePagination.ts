import { TablePaginationConfig } from 'antd';
import { useMediaQuery } from 'react-responsive';

export const DefaultTablePagination = (
  total: number = 1,
  onChange?: (page: number, pageSize: number) => void,
): TablePaginationConfig | false => {
  const isSmallScreen = useMediaQuery({ maxWidth: 768 }); // Detect small screens

  if (total < 10) {
    return false;
  }

  if (isSmallScreen) {
    return {
      total: total,
      showTotal: (total: number) => `${total} Result`,
    };
  }

  return {
    position: ['none', 'bottomLeft'],
    defaultPageSize: 10,
    pageSizeOptions: [10, 50, 100],
    responsive: true,
    showSizeChanger: true,
    total: total,
    showTotal: (total: number) => `${total} Result`,
    ...(onChange && onChange),
  };
};
