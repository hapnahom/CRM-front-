import { Select, Col, Text, Rate } from './shadcn-compat';

interface IndustryStageProps {
  sectorId: string | undefined;
  stage: string | undefined;
  sectors: any[];
  engagementStages: any[];
  leadRate?: number;
  onSectorChange: (value: string) => void;
  onStageChange: (value: string) => void;
  onRateChange?: (value: number) => void;
}

export default function IndustryStage({
  sectorId,
  stage,
  sectors,
  engagementStages,
  leadRate = 0,
  onSectorChange,
  onStageChange,
  onRateChange,
}: IndustryStageProps) {
  return (
    <>
      {/* Industry/Sector */}
      <Col xs={24} sm={12}>
        <div className="ml-2 mr-2">
          <Text type="secondary" className="text-sm font-medium mb-2 block">
            Industry
          </Text>
          <Select
            value={sectors.length > 0 ? sectorId || undefined : undefined}
            onChange={(value: string) => onSectorChange(value)}
            placeholder={
              sectors.length > 0 ? 'Select Sector...' : 'Sectors not available'
            }
            style={{
              width: '100%',
            }}
            className="h-11 custom-select-lead-detail border-gray-800"
            data-cy="business-info-sector-select"
            allowClear
            disabled={sectors.length === 0}
            showSearch
            filterOption={(input: string, option: any) => {
              const children = option?.children;
              if (typeof children === 'string') {
                return children.toLowerCase().includes(input.toLowerCase());
              }
              return false;
            }}
          >
            {sectors.length > 0 ? (
              sectors.map((sector) => (
                <Select.Option key={sector.id} value={sector.id}>
                  {sector.name}
                </Select.Option>
              ))
            ) : (
              <Select.Option value="" disabled>
                No sectors available
              </Select.Option>
            )}
          </Select>
        </div>
      </Col>

      {/* Lead Stage */}
      <Col xs={24} sm={12}>
        <div className="ml-2 mr-2">
          <Text type="secondary" className="text-sm font-medium mb-2 block">
            Lead Stage
          </Text>
          <Select
            key={`stage-select-${stage}`}
            value={stage || undefined}
            onChange={(value: string) => onStageChange(value)}
            placeholder={
              engagementStages.length > 0
                ? 'Select Lead Stage...'
                : 'Stages not available'
            }
            style={{
              width: '100%',
            }}
            className="h-11 custom-select-lead-detail border-gray-800"
            data-cy="business-info-stage-select"
            allowClear
            disabled={engagementStages.length === 0}
            showSearch
            filterOption={(input: string, option: any) =>
              String(option?.label || '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            dropdownStyle={{ zIndex: 1000 }}
          >
            {engagementStages.length > 0 ? (
              engagementStages.map((stageItem) => {
                const isSelected = stageItem.id === stage;

                return (
                  <Select.Option
                    key={stageItem.id}
                    value={stageItem.id}
                    label={stageItem.name}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {stageItem.colorCode && (
                        <div
                          className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0"
                          style={{ backgroundColor: stageItem.colorCode }}
                        />
                      )}
                      <span
                        className={`flex-1 ${isSelected ? 'font-semibold' : ''}`}
                      >
                        {stageItem.name}
                      </span>
                    </div>
                  </Select.Option>
                );
              })
            ) : (
              <Select.Option value="" disabled>
                No stages available
              </Select.Option>
            )}
          </Select>
        </div>
      </Col>

      {/* Lead Rating */}
      <Col xs={24} sm={12}>
        <div className="ml-2 mr-2">
          <Text type="secondary" className="text-sm font-medium mb-2 block">
            Lead Rating
          </Text>
          <div className="flex items-center gap-2">
            <Rate
              value={leadRate}
              onChange={onRateChange}
              count={5}
              allowHalf={false}
              style={{ fontSize: 20 }}
              data-cy="business-info-lead-rating"
            />
            <Text className="text-sm text-muted-foreground">
              ({leadRate}/5)
            </Text>
          </div>
        </div>
      </Col>
    </>
  );
}
