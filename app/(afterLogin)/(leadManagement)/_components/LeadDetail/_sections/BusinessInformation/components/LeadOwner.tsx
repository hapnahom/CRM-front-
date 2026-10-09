import { formatUserName } from '@/lib/format-user-name';
import { Select, Col, Text } from './shadcn-compat';

interface LeadOwnerProps {
  owner: string | undefined;
  users: any[];
  usersLoading: boolean;
  onOwnerChange: (value: string) => void;
}

export default function LeadOwner({
  owner,
  users,
  usersLoading,
  onOwnerChange,
}: LeadOwnerProps) {
  return (
    <Col xs={24} sm={12}>
      <div className="ml-2 mr-2">
        <Text type="secondary" className="text-sm font-medium mb-2 block">
          Lead Owner
        </Text>
        <Select
          value={
            usersLoading ||
            !Array.isArray(users) ||
            !users?.find((u) => u.id === owner)
              ? undefined
              : owner
          }
          onChange={(value: string) => onOwnerChange(value)}
          placeholder={
            usersLoading ? 'Loading users...' : 'Select Lead Owner...'
          }
          style={{
            width: '100%',
          }}
          className="h-11 custom-select-lead-detail border-gray-800"
          data-cy="business-info-owner-select"
          allowClear
          loading={usersLoading}
          disabled={usersLoading}
          showSearch
          filterOption={(input: string, option: any) => {
            const label = option?.label;
            if (typeof label === 'string') {
              return label.toLowerCase().includes(input.toLowerCase());
            }
            return false;
          }}
          options={
            usersLoading
              ? [
                  {
                    value: '',
                    label: 'Loading users...',
                    disabled: true,
                  },
                ]
              : !Array.isArray(users) || users.length === 0
                ? [
                    {
                      value: '',
                      label: 'No users available',
                      disabled: true,
                    },
                  ]
                : users.map((user) => ({
                    value: user.id,
                    label: formatUserName(user),
                  }))
          }
        />
      </div>
    </Col>
  );
}
