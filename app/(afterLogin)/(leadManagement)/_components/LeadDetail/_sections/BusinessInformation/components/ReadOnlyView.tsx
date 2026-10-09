import { formatUserName } from '@/lib/format-user-name';
import { User as UserOutlined } from 'lucide-react';
import type { Lead } from '@/store/server/features/leads/interface';
import { Space, Row, Col, Text, Tooltip, Rate } from './shadcn-compat';

interface ReadOnlyViewProps {
  lead: Lead;
  getSolutionName: () => string;
  getCompanyWebsite: () => string | null;
  getCompanyName: () => string | null;
  getLeadOwnerDisplay: () => string;
  getSectorDisplayName: () => string;
  engagementStages: any[];
  effectiveBudgetData: any;
  currencies: any[];
  editData: any;
  isBudgetLoading: boolean;
  formatCurrency: (amount: number, currency: string) => string;
  getCurrencyName: (currencyId: string) => string | undefined;
  processLeadParticipants: () => any[];
  isParticipantsLoading: boolean;
}

export default function ReadOnlyView({
  lead,
  getSolutionName,
  getCompanyWebsite,
  getCompanyName,
  getLeadOwnerDisplay,
  getSectorDisplayName,
  engagementStages,
  effectiveBudgetData,
  currencies,
  editData,
  isBudgetLoading,
  formatCurrency,
  getCurrencyName,
  processLeadParticipants,
  isParticipantsLoading,
}: ReadOnlyViewProps) {
  return (
    <Space direction="vertical" size={[24, 24]} style={{ width: '100%' }}>
      <Row gutter={[20, 16]}>
        <Col xs={24} sm={12}>
          <div className="ml-2 mr-2">
            <Text type="secondary" className="text-sm font-medium">
              Solution Interest
            </Text>
            <div className="mt-1">
              <Text strong className="text-base">
                {getSolutionName()}
              </Text>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div className="ml-2 mr-2">
            <Text type="secondary" className="text-sm font-medium">
              Lead Amount
            </Text>
            <div className="mt-1">
              {isBudgetLoading ? (
                <Text type="secondary" className="text-sm">
                  Loading budget...
                </Text>
              ) : (
                <div className="flex items-center gap-2">
                  <Text strong className="text-base">
                    {(() => {
                      // Check if we have budget data and it's not null/undefined
                      if (
                        effectiveBudgetData &&
                        effectiveBudgetData.amount !== undefined &&
                        effectiveBudgetData.amount !== null
                      ) {
                        // Prioritize saved currency from backend data, then user selection, then default
                        const savedCurrencyName = effectiveBudgetData.currencyId
                          ? getCurrencyName(effectiveBudgetData.currencyId)
                          : undefined;

                        const currency =
                          savedCurrencyName ||
                          editData.currency ||
                          (currencies.length > 0 ? currencies[0].name : 'USD');

                        if (currency && typeof currency === 'string') {
                          const formatted = formatCurrency(
                            effectiveBudgetData.amount,
                            currency,
                          );
                          return formatted;
                        } else {
                          return `${effectiveBudgetData.amount}`;
                        }
                      } else {
                        return 'Not set';
                      }
                    })()}
                  </Text>
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      <Row gutter={[20, 16]}>
        <Col xs={24} sm={12}>
          <div className="ml-2 mr-2">
            <Text type="secondary" className="text-sm font-medium">
              Website
            </Text>
            <div className="mt-1">
              <Text strong className="text-base">
                {getCompanyWebsite()}
              </Text>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div className="ml-2 mr-2">
            <Text type="secondary" className="text-sm font-medium">
              Phone
            </Text>
            <div className="mt-1">
              <Text strong className="text-base">
                {lead.contactPersonPhoneNumber || 'No phone number'}
              </Text>
            </div>
          </div>
        </Col>
      </Row>

      <Row gutter={[20, 16]}>
        <Col xs={24} sm={12}>
          <div className="ml-2 mr-2">
            <Text type="secondary" className="text-sm font-medium">
              Company
            </Text>
            <div className="mt-1">
              <Text strong className="text-base">
                {getCompanyName()}
              </Text>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div className="ml-2 mr-2">
            <Text type="secondary" className="text-sm font-medium">
              Lead Owner
            </Text>
            <div className="mt-1">
              <Text strong className="text-base">
                {getLeadOwnerDisplay()}
              </Text>
            </div>
          </div>
        </Col>
      </Row>

      <Row gutter={[20, 16]}>
        <Col xs={24} sm={12}>
          <div className="ml-2 mr-2">
            <Text type="secondary" className="text-sm font-medium">
              Industry
            </Text>
            <div className="mt-1">
              <Text strong className="text-base">
                {getSectorDisplayName()}
              </Text>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div className="ml-2 mr-2">
            <Text type="secondary" className="text-sm font-medium">
              Lead Stage
            </Text>
            <div className="mt-1">
              <div className="flex items-center gap-2">
                {(() => {
                  const stage = engagementStages.find(
                    (s) => s.id === lead.engagementStageId,
                  );
                  if (stage) {
                    return (
                      <>
                        {stage.colorCode && (
                          <div
                            className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0"
                            style={{ backgroundColor: stage.colorCode }}
                          />
                        )}
                        <Text strong className="text-base">
                          {stage.name}
                        </Text>
                      </>
                    );
                  } else {
                    return (
                      <Text strong className="text-base">
                        No stage assigned
                      </Text>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        </Col>
      </Row>

      <Row gutter={[20, 16]}>
        <Col xs={24} sm={12}>
          <div className="ml-2 mr-2">
            <Text type="secondary" className="text-sm font-medium">
              Lead Rating
            </Text>
            <div className="mt-1 flex items-center gap-2">
              <Rate
                disabled
                value={lead.leadRate || 0}
                count={5}
                allowHalf={false}
                style={{ fontSize: 18 }}
              />
              <Text strong className="text-base">
                ({lead.leadRate || 0}/5)
              </Text>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div className="ml-2 mr-2">
            <Text type="secondary" className="text-sm font-medium">
              Roles
            </Text>
            <div className="flex gap-2 mt-1">
              {isParticipantsLoading ? (
                <Text type="secondary" className="text-sm">
                  Loading...
                </Text>
              ) : processLeadParticipants().length === 0 ? (
                <Text type="secondary" className="text-sm">
                  No roles assigned
                </Text>
              ) : (
                <div className="flex items-center">
                  {processLeadParticipants().map((pair, index) => (
                    <Tooltip
                      key={`${pair.role.id}-${pair.user.id}-${index}`}
                      title={`${pair.role.name} - ${formatUserName(pair.user)}`}
                      placement="top"
                    >
                      <div
                        className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors border-2 border-white"
                        style={{
                          marginLeft: index > 0 ? '-8px' : '0',
                          zIndex: processLeadParticipants().length - index,
                        }}
                      >
                        <UserOutlined className="text-muted-foreground text-sm" />
                      </div>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>
    </Space>
  );
}
