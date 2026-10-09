import { Select, Col, Text } from './shadcn-compat';

interface SolutionsSelectorProps {
  solutionId: string[];
  solutions: any[];
  onSolutionChange: (value: string[]) => void;
}

export default function SolutionsSelector({
  solutionId,
  solutions,
  onSolutionChange,
}: SolutionsSelectorProps) {
  return (
    <Col xs={24} sm={12}>
      <div className="ml-2 mr-2">
        <Text type="secondary" className="text-sm font-medium mb-2 block">
          Solution Interest
        </Text>
        <Select
          value={
            solutionId && solutionId.length > 0 ? solutionId[0] : undefined
          }
          onChange={(value: string) => onSolutionChange(value ? [value] : [])}
          placeholder="Select Solution Interest..."
          style={{
            width: '100%',
          }}
          className="h-11 custom-select-lead-detail border-gray-800"
          showSearch
          data-cy="business-info-solution-select"
          filterOption={(input: string, option: any) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={solutions.map((solution) => ({
            value: solution.id,
            label: solution.name,
          }))}
        />
      </div>
    </Col>
  );
}
