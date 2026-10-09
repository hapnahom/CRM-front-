import React from 'react';

interface HtmlStringDisplayerProps {
  htmlString: string;
}

const HtmlStringDisplayer: React.FC<HtmlStringDisplayerProps> = ({
  htmlString,
}) => {
  return (
    <div
      style={{ padding: '1.5rem' }}
      className="list-disc pl-6 space-y-2"
      dangerouslySetInnerHTML={{ __html: htmlString }}
    />
  );
};

export default HtmlStringDisplayer;
