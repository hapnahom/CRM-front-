import { FC } from 'react';
import { Avatar } from 'antd';
import { classNames } from '@/utils/classNames';

interface UserCardProps {
  data: any;
  avatar?: string;
  profileImage?: any;
  name: string | undefined | React.ReactNode;
  description?: string;
  size?: 'small' | 'medium';
  email?: string;
}

const UserCard: FC<UserCardProps> = ({
  data,
  name,
  description = '',
  size = 'medium',
  email,
}) => {
  // const sizeWH = size === 'medium' ? 40 : 24;
  return (
    <div className="flex items-center gap-3">
      {data ? (
        <Avatar size={25} src={data?.profileImage} />
      ) : (
        <Avatar size={25}>
          {data?.firstName[0]?.toUpperCase()}
          {data?.middleName[0]?.toUpperCase()}
          {data?.lastName[0]?.toUpperCase()}
        </Avatar>
      )}
      <div>
        <div
          className={classNames('text-foreground font-semibold', {
            'text-lg': size === 'medium',
            'text-xs': size === 'small',
          })}
        >
          {name}
        </div>
        {email && (
          <div
            className={classNames('text-foreground mt-1', {
              'text-lg': size === 'medium',
              'text-xs': size === 'small',
            })}
          >
            {email}
          </div>
        )}
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {description}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserCard;
