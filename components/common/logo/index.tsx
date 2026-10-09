import Image from 'next/image';
import React from 'react';

interface LogoProps {
  type: string;
}

const Logo: React.FC<LogoProps> = ({ type }) => {
  switch (type) {
    case 'selamnew':
      return (
        <Image
          src="/logo.png"
          alt="App logo"
          width={56}
          height={56}
          className="h-14 w-14 object-contain"
          priority
        />
      );

    default:
      return null;
  }
};

export default Logo;
