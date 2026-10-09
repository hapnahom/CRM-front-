import { Input, Col, Text } from './shadcn-compat';

interface ContactDetailsProps {
  website: string;
  contactPersonPhoneNumber: string;
  companyName: string;
  onWebsiteChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onCompanyNameChange: (value: string) => void;
  getCompanyWebsite: () => string | null;
}

export default function ContactDetails({
  website,
  contactPersonPhoneNumber,
  companyName,
  onWebsiteChange,
  onPhoneChange,
  onCompanyNameChange,
  getCompanyWebsite,
}: ContactDetailsProps) {
  return (
    <>
      {/* Website and Phone Row */}
      <Col xs={24} sm={12}>
        <div className="ml-2 mr-2">
          <Text type="secondary" className="text-sm font-medium mb-2 block">
            Website
          </Text>
          <Input
            value={website !== undefined ? website : getCompanyWebsite() || ''}
            onChange={(e) => onWebsiteChange(e.target.value)}
            placeholder="Website..."
            className="border-gray-800 bg-surface-card w-full h-11 text-base hover:border-gray-800 focus:border-gray-800 focus:shadow-none"
            data-cy="business-info-website-input"
            style={{
              borderWidth: '2px !important',
              borderColor: '#1f2937 !important',
            }}
          />
        </div>
      </Col>
      <Col xs={24} sm={12}>
        <div className="ml-2 mr-2">
          <Text type="secondary" className="text-sm font-medium mb-2 block">
            Phone
          </Text>
          <Input
            value={contactPersonPhoneNumber}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="Phone..."
            className="border-gray-800 bg-surface-card w-full h-11 text-base hover:border-gray-800 focus:border-gray-800 focus:shadow-none"
            data-cy="business-info-phone-input"
            style={{
              borderWidth: '2px !important',
              borderColor: '#1f2937 !important',
            }}
          />
        </div>
      </Col>

      {/* Company Name Row */}
      <Col xs={24} sm={12}>
        <div className="ml-2 mr-2">
          <Text type="secondary" className="text-sm font-medium mb-2 block">
            Company
          </Text>
          <Input
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            placeholder="Company..."
            className="border-gray-800 bg-surface-card w-full h-11 text-base hover:border-gray-800 focus:border-gray-800 focus:shadow-none"
            data-cy="business-info-company-input"
            style={{
              borderWidth: '2px !important',
              borderColor: '#1f2937 !important',
            }}
          />
        </div>
      </Col>
    </>
  );
}
