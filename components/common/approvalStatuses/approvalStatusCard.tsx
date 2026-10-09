import React from 'react';
import Image from 'next/image';
import UserCard from '@/components/common/userCard/userCard';

const ApprovalStatusCard = ({
  data,
  userName,
  userImage,
}: {
  data: any;
  userName: (a: string) => string;
  userImage: (a: any) => any;
}) => {
  return (
    <div className="border-b border-border">
      <div className="flex items-center px-3 py-4 gap-4">
        <div>Level {data?.stepOrder}</div>
        <Image
          width={24}
          height={24}
          src={
            data?.status === 'Approved'
              ? '/icons/status/verify.svg'
              : data?.status === 'Pending'
                ? '/icons/status/information.svg'
                : data?.status === 'Rejected'
                  ? '/icons/status/reject.svg'
                  : ''
          }
          alt={data?.status}
        />
        <UserCard
          data={data}
          name={userName(String(data?.userId))}
          profileImage={data?.userId && userImage(String(data?.userId))}
          size="small"
        />
      </div>
      {data?.approvalComments?.length > 0 && (
        <div className="flex items-center gap-4 mb-2 px-5">
          <div className="text-xs text-muted-foreground">Reason</div>
          <div className="text-xs text-foreground">
            {data?.approvalComments?.[0]?.comment}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalStatusCard;
