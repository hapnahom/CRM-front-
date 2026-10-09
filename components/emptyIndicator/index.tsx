'use client';

import Image from 'next/image';

export const EmptyImage = () => (
  <Image
    src="https://cdn.prod.website-files.com/646218c67da47160c64a84d5/6463461598f456345c3a266b_54.png"
    width={100}
    height={100}
    alt="Empty"
  />
);

export const CustomizeRenderEmpty = () => (
  <div className="flex justify-center">
    <div>
      {/* {' '}
      <EmptyImage /> */}
      <p className="text-black">Data Not Found</p>
    </div>
  </div>
);
