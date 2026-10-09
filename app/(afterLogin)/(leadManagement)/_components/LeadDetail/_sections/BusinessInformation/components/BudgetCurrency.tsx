import { Select, Col, Text, Input } from './shadcn-compat';

interface BudgetCurrencyProps {
  estimatedBudget: number;
  currency: string | undefined;
  currencies: any[];
  isBudgetLoading: boolean;
  onBudgetChange: (value: number) => void;
  onCurrencyChange: (value: string) => void;
}

export default function BudgetCurrency({
  estimatedBudget,
  currency,
  currencies,
  isBudgetLoading,
  onBudgetChange,
  onCurrencyChange,
}: BudgetCurrencyProps) {
  return (
    <Col xs={24} sm={12}>
      <div className="ml-2 mr-2">
        <Text type="secondary" className="text-sm font-medium mb-2 block">
          Lead Amount
        </Text>
        <div className="flex gap-2">
          {isBudgetLoading ? (
            <div className="flex-1 flex items-center justify-center py-2 bg-surface-elevated rounded border">
              <Text type="secondary" className="text-sm">
                Loading budget...
              </Text>
            </div>
          ) : (
            <Input
              type="number"
              value={estimatedBudget}
              onChange={(e) => onBudgetChange(Number(e.target.value))}
              placeholder="0"
              min="0"
              className="border-gray-800 bg-surface-card w-full h-11 text-base hover:border-gray-800 focus:border-gray-800 focus:shadow-none"
              data-cy="business-info-budget-input"
              style={{
                flex: 1,
                borderWidth: '2px !important',
                borderColor: '#1f2937 !important',
              }}
            />
          )}
          <Select
            value={currency}
            onChange={(value: string) => onCurrencyChange(value)}
            style={{
              width: 120,
            }}
            className="h-11 custom-select-lead-detail border-gray-800"
            placeholder="Select Currency"
            data-cy="business-info-currency-select"
            allowClear
            disabled={isBudgetLoading}
            showSearch
            dropdownStyle={{ zIndex: 100000 }}
            getPopupContainer={(trigger: HTMLElement) =>
              trigger.parentElement || document.body
            }
            filterOption={(input: string, option: any) => {
              const children = option?.children;
              if (typeof children === 'string') {
                return children.toLowerCase().indexOf(input.toLowerCase()) >= 0;
              }
              return false;
            }}
          >
            {currencies.map((currencyItem) => (
              <Select.Option key={currencyItem.id} value={currencyItem.name}>
                {currencyItem.name} - {currencyItem.description}
              </Select.Option>
            ))}
          </Select>
        </div>
      </div>
    </Col>
  );
}
