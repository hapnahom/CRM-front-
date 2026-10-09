import Image from 'next/image';

const ApprovalStatusesInfo = () => {
  const statuses = [
    {
      text: 'Approved',
      img: '/icons/status/verify.svg',
    },
    {
      text: 'Pending',
      img: '/icons/status/information.svg',
    },
    {
      text: 'Reject',
      img: '/icons/status/reject.svg',
    },
  ];

  return (
    <div className="flex items-center gap-2.5 py-[5px] px-3 rounded-lg w-max">
      {statuses.map((status) => (
        <div key={status.text} className="flex items-center gap-[5px]">
          <Image width={24} height={24} src={status.img} alt="" />
          <span className="text-xs font-medium text-foreground">
            {status.text}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ApprovalStatusesInfo;
