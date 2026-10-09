import React from 'react';

interface AllRecognitionProps {
  data: any[];
  all?: boolean;
}

const AllRecognition: React.FC<AllRecognitionProps> = ({
  data,
  all = false,
}) => {
  return (
    <div className="bg-surface-card p-4 rounded-lg border border-border">
      <div className="text-sm font-medium text-muted-foreground">
        {all ? 'All Recognitions' : 'Recognition Details'}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {data?.length || 0} recognition(s) found
      </div>
      {data?.length === 0 && (
        <div className="mt-4 text-center text-muted-foreground">
          No recognition data available
        </div>
      )}
    </div>
  );
};

export default AllRecognition;
