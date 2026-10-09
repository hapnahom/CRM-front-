export interface CrmCurrency {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCrmCurrencyInput {
  name: string;
  description?: string;
}

export interface UpdateCrmCurrencyInput {
  name?: string;
  description?: string;
}
