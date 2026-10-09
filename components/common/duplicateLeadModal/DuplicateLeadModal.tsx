'use client';

import { tokens } from '@/lib/design-tokens';

import React from 'react';
import { Modal, Button, Typography } from 'antd';
import { PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { DuplicateResponse } from '@/types/leads/duplicateTypes';
import { useGetCompanies } from '@/store/server/features/leads/companies/queries';
import { useIsMobile } from '@/hooks/useIsMobile';

const { Title, Text } = Typography;

interface DuplicateLeadModalProps {
  isOpen: boolean;
  duplicateInfo: DuplicateResponse | null;
  pendingLeadData?: any | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// A reusable component for rendering the lead information card
const LeadInfoCard = ({
  name,
  company,
  date,
  phone,
  email,
  isMobile = false,
}: {
  name: string;
  company: string;
  date: string;
  phone: string;
  email: string;
  isMobile?: boolean;
}) => (
  <div
    className={`border border-border rounded-lg bg-surface-card ${isMobile ? 'p-2' : 'p-3'}`}
  >
    {/* Top Section: Name, Company, and Date */}
    <div className="flex justify-between items-start mb-3 gap-4">
      <div>
        <p
          className={`font-semibold text-foreground break-words ${isMobile ? 'text-sm' : 'text-base'}`}
        >
          {name}
        </p>
        <p
          className={`text-muted-foreground break-words ${isMobile ? 'text-xs' : 'text-sm'}`}
        >
          {company}
        </p>
      </div>
      <p
        className={`text-muted-foreground whitespace-nowrap ${isMobile ? 'text-xs' : 'text-sm'}`}
      >
        {date}
      </p>
    </div>

    {/* Bottom Section: Contact Info (Horizontal layout) */}
    <div className="flex items-center justify-between text-muted-foreground">
      <div className="flex items-center min-w-0">
        <PhoneOutlined
          className={`mr-2 text-green-500 flex-shrink-0 ${isMobile ? 'text-xs' : ''}`}
        />
        <span className={`break-all ${isMobile ? 'text-xs' : 'text-sm'}`}>
          {phone}
        </span>
      </div>
      <div className="flex items-center min-w-0">
        <MailOutlined
          className={`mr-2 flex-shrink-0 ${isMobile ? 'text-xs' : ''}`}
          style={{ color: tokens.color.blue }}
        />
        <span className={`break-all ${isMobile ? 'text-xs' : 'text-sm'}`}>
          {email}
        </span>
      </div>
    </div>
  </div>
);

const DuplicateLeadModal: React.FC<DuplicateLeadModalProps> = ({
  isOpen,
  duplicateInfo,
  pendingLeadData,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const { data: companies = [], isLoading: companiesLoading } =
    useGetCompanies();
  const { isMobile } = useIsMobile();

  // Helper to find company name from ID
  const getCompanyName = (companyId: string): string => {
    if (!companyId || companiesLoading) return 'Loading...';
    const company = companies.find((comp) => comp.id === companyId);
    return company?.name || 'Unknown Company';
  };

  // Simplified logic to get lead details for display
  const getLeadDetails = () => {
    const source = duplicateInfo?.existingLead || pendingLeadData;

    if (!source) {
      return {
        name: 'N/A',
        company: 'N/A',
        date: 'N/A',
        phone: 'N/A',
        email: 'N/A',
      };
    }

    const formattedDate = source.createdDate
      ? new Date(source.createdDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

    return {
      name: source.name || 'Unknown Lead',
      company: getCompanyName(source.companyId || source.company || ''),
      date: formattedDate,
      phone: source.contactPersonPhoneNumber || 'N/A',
      email: source.contactPersonEmail || 'N/A',
    };
  };

  const leadInfo = getLeadDetails();

  const modalFooter = (
    <div className="flex justify-center items-center gap-3 w-full pt-4">
      <Button
        key="continue"
        type="primary"
        onClick={onConfirm}
        loading={isLoading || companiesLoading}
        className="font-md bg-brand text-brand-foreground h-10 px-6"
        style={{
          width: isMobile ? '100px' : '120px',
          boxShadow: 'none',
        }}
      >
        Continue
      </Button>
      <Button
        key="cancel"
        onClick={onCancel}
        disabled={isLoading}
        className="font-md border-brand text-brand h-10 px-6"
        style={{
          width: isMobile ? '100px' : '120px',
        }}
      >
        Cancel
      </Button>
    </div>
  );

  return (
    <Modal
      open={isOpen}
      onCancel={onCancel}
      footer={modalFooter}
      width={isMobile ? '95%' : 400}
      centered
      closable={false}
      styles={{
        body: {
          padding: isMobile ? '4px 8px 2px 8px' : '8px 12px 4px 12px',
        },
        footer: {
          padding: isMobile ? '0 8px 8px 8px' : '0 12px 12px 12px',
          borderTop: 'none',
          marginTop: 0,
        },
      }}
    >
      <div className="text-left">
        <Title
          level={4}
          className={`!font-bold !text-foreground !mt-0 ${isMobile ? '!mb-1 !text-lg' : '!mb-1'}`}
        >
          Duplicate Leads
        </Title>
        <Text
          className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-base'}`}
        >
          The lead you have just created is duplicate. Would you like to
          continue?
        </Text>
      </div>

      <div className={`${isMobile ? 'space-y-1 mt-2' : 'space-y-2 mt-4'}`}>
        <LeadInfoCard {...leadInfo} isMobile={isMobile} />
        <LeadInfoCard {...leadInfo} isMobile={isMobile} />
      </div>
    </Modal>
  );
};

export default DuplicateLeadModal;
