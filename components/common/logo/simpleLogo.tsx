import Image from 'next/image';

function SimpleLogo({ size = 56 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="App logo"
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size }}
      priority
    />
  );
}

export default SimpleLogo;
