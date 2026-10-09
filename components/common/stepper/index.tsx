import { Steps } from 'antd';
import React from 'react';
import { IoCheckmarkSharp } from 'react-icons/io5';
const { Step } = Steps;
type Props = {
  numberOfSteps: number;
  setCurrent: (current: number) => void;
  current: number;
};
const Stepper: React.FC<Props> = ({ numberOfSteps, setCurrent, current }) => {
  const onChange = (value: number) => {
    setCurrent(value);
  };

  const customDot = (step: number) => (
    <div
      className={`border-2 rounded-full h-8 w-8 flex items-center justify-center ${current >= step ? 'bg-indigo-700 text-brand-foreground' : 'bg-surface-card border-border text-muted-foreground'}`}
    >
      <div style={{ fontSize: '24px', lineHeight: '24px' }}>
        {current >= step ? (
          <IoCheckmarkSharp className="text-xs font-bold" />
        ) : (
          '•'
        )}
      </div>
    </div>
  );
  return (
    <div>
      <Steps
        current={current}
        size="default"
        onChange={onChange}
        className="my-6 sm:my-10"
      >
        {/* eslint-disable @typescript-eslint/naming-convention  */}
        {Array.from({ length: numberOfSteps }, (__, index) => (
          <Step key={index} icon={customDot(index)} />
        ))}
      </Steps>
    </div>
  );
};

export default Stepper;
