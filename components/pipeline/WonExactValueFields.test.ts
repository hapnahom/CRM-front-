import {
  buildWonExactValueDefaults,
  validateWonExactValueForm,
} from './WonExactValueFields';
import type { OpportunitySolution } from '@/modules/product-catalog/types';

describe('WonExactValueFields', () => {
  const dummyDeal = {
    value: 10000,
    exactValue: 12000,
  };

  const dummySolutions: OpportunitySolution[] = [
    {
      id: 'sol-1',
      dealId: 'deal-1',
      productFamilyId: 'fam-1',
      name: 'Solution 1',
      amount: 5000,
      exactAmount: 6000,
      currency: 'USD',
      status: 'active',
      customFields: {},
      products: [],
      vendors: [],
      roleAssignments: [],
      assigneeUserIds: [],
      assigneeContributions: [],
    },
    {
      id: 'sol-2',
      dealId: 'deal-1',
      productFamilyId: 'fam-2',
      name: 'Solution 2',
      amount: 4000,
      exactAmount: null,
      currency: 'USD',
      status: 'active',
      customFields: {},
      products: [],
      vendors: [],
      roleAssignments: [],
      assigneeUserIds: [],
      assigneeContributions: [],
    },
  ];

  it('builds defaults using exactValue/exactAmount when available, falling back to estimated value/amount', () => {
    const defaults = buildWonExactValueDefaults(dummyDeal, dummySolutions);
    expect(defaults.exactValue).toBe('12000');
    expect(defaults.solutionExactAmounts).toEqual({
      'sol-1': '6000',
      'sol-2': '4000',
    });
  });

  it('builds defaults correctly when deal has no exactValue', () => {
    const defaults = buildWonExactValueDefaults({ value: 5000 }, []);
    expect(defaults.exactValue).toBe('5000');
    expect(defaults.solutionExactAmounts).toEqual({});
  });

  it('validates won exact value form correctly', () => {
    const invalidState = {
      exactValue: '0',
      solutionExactAmounts: {
        'sol-1': '-1',
      },
    };
    const errors = validateWonExactValueForm(invalidState, [
      dummySolutions[0]!,
    ]);
    expect(errors.exactValue).toBe('Exact value must be greater than zero');
    expect(errors.solutions?.['sol-1']).toBe(
      'Exact amount must be greater than zero',
    );

    const validState = {
      exactValue: '10000',
      solutionExactAmounts: {
        'sol-1': '5000',
      },
    };
    const validErrors = validateWonExactValueForm(validState, [
      dummySolutions[0]!,
    ]);
    expect(validErrors.exactValue).toBeUndefined();
    expect(validErrors.solutions).toBeUndefined();
  });
});
