import { tokens } from '@/lib/design-tokens';
import type { MouseEvent } from 'react';

import { Button, Col } from './shadcn-compat';

interface ActionButtonsProps {
  onSave: () => void;
  isLoading: boolean;
}

export default function ActionButtons({
  onSave,
  isLoading,
}: ActionButtonsProps) {
  return (
    <Col xs={24} sm={12}>
      <div className="ml-2 mr-2" style={{ marginTop: '24px' }}>
        <Button
          onClick={onSave}
          type="primary"
          className="px-4 py-3 rounded-lg w-full h-11 focus:outline-none focus:ring-0 focus:shadow-none active:shadow-none"
          loading={isLoading}
          disabled={false}
          data-cy="business-info-save-button"
          style={{
            backgroundColor: tokens.color.blue,
            borderColor: tokens.color.blue,
            color: tokens.color.surfaceCard,
            transition: 'background-color 0.2s ease',
            transform: 'none',
            boxShadow: 'none',
          }}
          onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = tokens.color.blue;
            e.currentTarget.style.borderColor = tokens.color.blue;
          }}
          onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = tokens.color.blue;
            e.currentTarget.style.borderColor = tokens.color.blue;
          }}
        >
          Save
        </Button>
      </div>
    </Col>
  );
}
