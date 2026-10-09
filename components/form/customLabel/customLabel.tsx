import React from 'react';

const CustomLabel = (
  label: React.ReactNode,
  { required }: { required: boolean },
) => (
  <>
    {label}
    {required && <span className="text-error">*</span>}
  </>
);

export default CustomLabel;
