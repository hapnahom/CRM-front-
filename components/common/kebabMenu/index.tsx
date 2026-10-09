import React, { useRef, useEffect } from 'react';
import { Card } from 'antd';

const KebabMenu: React.FC<any> = (props) => {
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        props?.handleButtonClick(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [props]);

  return (
    <Card
      className="bg-surface-card absolute z-10 shadow-sm right-0 md:right-10 p-0"
      ref={cardRef}
    >
      <p
        id={`editCardId${props?.item?.id}`}
        onClick={() => props?.editGroupPermissionHandler(props?.item)}
        className="text-muted-foreground px-4 py-2 hover:bg-muted cursor-pointer"
      >
        Edit
      </p>
      <p
        id={`deleteCardId${props?.item?.id}`}
        onClick={props?.deleteGroupPermissionHandler}
        className="text-red-700 px-4 py-2 hover:bg-muted cursor-pointer"
      >
        Delete
      </p>
    </Card>
  );
};

export default KebabMenu;
