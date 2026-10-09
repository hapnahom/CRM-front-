import { tokens } from '@/lib/design-tokens';
export const Microsoft = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      width="22"
      height="22"
      viewBox="0 0 48 48"
    >
      <path
        fill={tokens.color.orange}
        d="M6 6H22V22H6z"
        transform="rotate(-180 14 14)"
      ></path>
      <path
        fill={tokens.color.success}
        d="M26 6H42V22H26z"
        transform="rotate(-180 34 14)"
      ></path>
      <path
        fill={tokens.color.warning}
        d="M26 26H42V42H26z"
        transform="rotate(-180 34 34)"
      ></path>
      <path
        fill={tokens.color.accentBlue}
        d="M6 26H22V42H6z"
        transform="rotate(-180 14 34)"
      ></path>
    </svg>
  );
};
