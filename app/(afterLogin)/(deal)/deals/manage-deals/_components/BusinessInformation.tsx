'use client';

import { tokens } from '@/lib/design-tokens';

import {
  EditOutlined,
  UserOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Space,
  Typography,
  Input,
  Select,
  Row,
  Col,
  message,
  Spin,
} from 'antd';
import { useState, useEffect, useMemo } from 'react';
import { useUpdateDeal } from '@/store/server/features/deals/queries';
import {
  useGetCompanies,
  useGetSuppliers,
  useGetSolutions,
  useGetSectors,
  useGetCurrencies,
  useGetRoles,
  useGetDealStages,
} from '@/store/server/features/deals/queries';
import { useFilterDealActivities } from '@/store/server/features/deals/activity/query';

const { Title, Text } = Typography;
const { Option } = Select;

interface DealDocument {
  id: string;
  name: string;
  fileName: string;
  filePath: string;
  createdAt?: string;
  dealId?: string;
}

interface DealData {
  id: string;
  dealName: string;
  contactPersonName: string;
  contactPersonEmail: string;
  contactPersonPhoneNumber: string;
  submissionDate: string;
  additionalInformation: string;
  company: string;
  supplier: string;
  sector: string;
  sectorId?: string;
  solutions: string;
  stage?: string;
  budget: {
    amount: string;
    currency: string;
  };
  // Additional fields from lead context
  leadId?: string;
  solutionIds?: string[];
  contactPersonPosition?: string;
  // Additional fields from form context
  formAmount?: number;
  formCurrency?: string;
  formCurrencyName?: string;
  leadContext?: any;
  // Deal documents and timestamps
  dealDocuments?: DealDocument[];
  createdAt?: string;
  updatedAt?: string;
}

interface BusinessInformationProps {
  deal: DealData;
  onDealUpdated?: () => void;
}

export default function BusinessInformation({
  deal,
  onDealUpdated,
}: BusinessInformationProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );

  const [editData, setEditData] = useState({
    additionalInformation: '',
    budgetAmount: '',
    currency: '',
    dealName: '',
    company: '',
    sector: '',
    supplier: '',
    solutions: '',
    submissionDate: '',
    // IDs for dropdowns (you may need to get these from API responses)
    companyId: '',
    supplierId: '',
    solutionId: '',
    sectorId: '',
    stageId: '',
    currencyId: '',
  });

  const { data: companies = [], isLoading: companiesLoading } =
    useGetCompanies();
  const { data: suppliers = [], isLoading: suppliersLoading } =
    useGetSuppliers();
  const { data: solutionsData, isLoading: solutionsLoading } =
    useGetSolutions();
  const { data: sectors = [], isLoading: sectorsLoading } = useGetSectors();
  const { data: currencies = [], isLoading: currenciesLoading } =
    useGetCurrencies();
  const {
    data: roles = [],
    isLoading: rolesLoading,
    error: rolesError,
  } = useGetRoles();
  // const { data: employees = [] } = useGetEmployees(); // Unused for now
  const { data: dealStagesData, isLoading: stagesLoading } = useGetDealStages();
  const solutions = useMemo(() => solutionsData ?? [], [solutionsData]);
  const dealStages = useMemo(() => dealStagesData ?? [], [dealStagesData]);

  // Fetch activities for this deal
  const { data: filterActivities } = useFilterDealActivities(
    deal.id || '',
    '', // priority
    '', // activityDate
    '', // activityType
  );

  const updateDealMutation = useUpdateDeal();

  // Update local state when deal prop changes
  useEffect(() => {
    if (isEditMode) {
      return; // Don't update if we're in edit mode to prevent overriding user changes
    }

    setEditData({
      additionalInformation: deal.additionalInformation || '',
      budgetAmount: deal.budget?.amount || '',
      currency: deal.budget?.currency || '',
      dealName: deal.dealName || '',
      company: deal.company || '',
      supplier: deal.supplier || '',
      sector: deal.sector || '',
      solutions: deal.solutions || '',
      submissionDate: deal.submissionDate || '',
      // You'll need to map these from the deal data if available
      companyId: '',
      supplierId: '',
      solutionId: solutions.find((s) => s.name === deal.solutions)?.id || '',
      sectorId: deal.sectorId || '',
      stageId: dealStages.find((s) => s.name === deal.stage)?.id || '',
      currencyId: '',
    });
  }, [deal, isEditMode, dealStages, solutions]);

  const handleEditToggle = () => {
    if (isEditMode) {
      // Reset to original data when canceling edit
      setEditData({
        additionalInformation: deal.additionalInformation || '',
        budgetAmount: deal.budget?.amount || '',
        currency: deal.budget?.currency || '',
        dealName: deal.dealName || '',
        company: deal.company || '',
        supplier: deal.supplier || '',
        sector: deal.sector || '',
        solutions: deal.solutions || '',
        submissionDate: deal.submissionDate || '',
        companyId: '',
        supplierId: '',
        solutionId: solutions.find((s) => s.name === deal.solutions)?.id || '',
        sectorId: deal.sectorId || '',
        stageId: dealStages.find((s) => s.name === deal.stage)?.id || '',
        currencyId: '',
      });
    }
    setIsEditMode(!isEditMode);
  };

  const validateUpdateData = (data: any) => {
    const errors: string[] = [];

    // Validate budget amount (must be non-negative number)
    if (data.budgetAmount !== undefined && data.budgetAmount !== '') {
      const amount = parseFloat(data.budgetAmount);
      if (isNaN(amount) || amount < 0) {
        errors.push('Budget amount must be a non-negative number');
      }
    }

    // Validate deal name
    if (!data.dealName || data.dealName.trim() === '') {
      errors.push('Deal name is required');
    }

    // Validate UUIDs if provided
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (data.companyId && !uuidRegex.test(data.companyId)) {
      errors.push('Company ID format is invalid');
    }

    if (data.supplierId && !uuidRegex.test(data.supplierId)) {
      errors.push('Supplier ID format is invalid');
    }

    if (data.solutionId && !uuidRegex.test(data.solutionId)) {
      errors.push('Solution ID format is invalid');
    }

    if (data.sectorId && !uuidRegex.test(data.sectorId)) {
      errors.push('Sector ID format is invalid');
    }

    if (data.stageId && !uuidRegex.test(data.stageId)) {
      errors.push('Stage ID format is invalid');
    }

    return errors;
  };

  const handleSave = async () => {
    try {
      // Build update data with proper validation
      const updateData: any = {};

      // Only add fields that have valid values
      if (editData.dealName && editData.dealName.trim() !== '') {
        updateData.dealName = editData.dealName.trim();
      }

      if (
        editData.additionalInformation &&
        editData.additionalInformation.trim() !== ''
      ) {
        updateData.additionalInformation =
          editData.additionalInformation.trim();
      }

      if (editData.budgetAmount && editData.budgetAmount.trim() !== '') {
        const amount = parseFloat(editData.budgetAmount);
        if (!isNaN(amount) && amount >= 0) {
          updateData.amount = amount;
        }
      }

      if (editData.submissionDate && editData.submissionDate.trim() !== '') {
        updateData.submissionDate = editData.submissionDate.trim();
      }

      // Add IDs if they are valid UUIDs
      if (editData.companyId && editData.companyId.length > 0) {
        updateData.companyId = editData.companyId;
      }

      if (editData.supplierId && editData.supplierId.length > 0) {
        updateData.supplierId = editData.supplierId;
      }

      if (editData.solutionId && editData.solutionId.length > 0) {
        updateData.solutionIds = [editData.solutionId]; // Backend might expect array
      }

      if (editData.sectorId && editData.sectorId.length > 0) {
        updateData.sectorId = editData.sectorId;
      }

      if (editData.stageId && editData.stageId.length > 0) {
        updateData.engagementStageId = editData.stageId;
      }

      if (editData.currencyId && editData.currencyId.length > 0) {
        updateData.currency = editData.currencyId;
      }

      // Don't send empty update
      if (Object.keys(updateData).length === 0) {
        message.info('No changes to save');
        setIsEditMode(false);
        return;
      }

      // Validate the data before sending
      const validationErrors = validateUpdateData(updateData);
      if (validationErrors.length > 0) {
        message.error(`Validation errors: ${validationErrors.join(', ')}`);
        return;
      }

      await updateDealMutation.mutateAsync({
        dealId: deal.id,
        dealData: updateData,
      });

      // Switch to view mode immediately after mutation completes
      setIsEditMode(false);

      message.success('Deal updated successfully');

      // Notify parent component to refresh deal data
      if (onDealUpdated) {
        onDealUpdated();
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        'Failed to update business information';
      message.error(errorMessage);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    let validatedValue = value;

    if (field === 'budgetAmount' && typeof value === 'string') {
      // Remove any non-numeric characters except decimal point
      validatedValue = value.replace(/[^\d.]/g, '');
    }

    setEditData((prev) => ({
      ...prev,
      [field]: validatedValue,
    }));
  };

  const formatCurrency = (amount: string, currencyCode: string) => {
    try {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount)) return `${amount} ${currencyCode}`;

      // Try to format as proper currency
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency:
          currencyCode === '$' ? 'USD' : currencyCode === '€' ? 'EUR' : 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numAmount);

      return formatted;
    } catch (error) {
      // Fallback: just show amount with currency code
      return `${amount} ${currencyCode}`;
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'zip':
      case 'rar':
        return '🗜️';
      default:
        return '📎';
    }
  };

  const handleDownloadFile = (
    filePath: string,
    fileName: string,
    fileId: string,
  ) => {
    try {
      // Set loading state
      setDownloadingFileId(fileId);

      // Create hidden link element
      const link = document.createElement('a');
      link.href = filePath;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success message
      message.success(`Downloading ${fileName}`);

      // Remove loading state after short delay
      setTimeout(() => {
        setDownloadingFileId(null);
      }, 10);
    } catch (error) {
      message.error('Failed to download file. Please try again.');
      setDownloadingFileId(null);
    }
  };

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <Title level={5} style={{ margin: 0 }}>
            Business Information
          </Title>
          <Button
            type="text"
            size="small"
            icon={
              <EditOutlined
                style={{ fontSize: '24px', color: tokens.color.accentBlue }}
              />
            }
            onClick={handleEditToggle}
            loading={updateDealMutation.isLoading}
          />
        </div>
      }
      className="h-fit"
    >
      {isEditMode ? (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col span={24} lg={12}>
              <div className="ml-2">
                <Text
                  type="secondary"
                  className="text-md font-medium mb-2 block"
                >
                  Deal Name
                </Text>
                <Input
                  value={editData.dealName}
                  onChange={(e) =>
                    handleInputChange('dealName', e.target.value)
                  }
                  placeholder="Deal Name..."
                  className="text-md"
                />
              </div>
            </Col>
            <Col span={24} lg={12}>
              <div className="mr-2">
                <Text
                  type="secondary"
                  className="text-md font-medium mb-2 block"
                >
                  Budget Amount
                </Text>
                <div className="flex gap-2">
                  <Input
                    value={editData.budgetAmount}
                    onChange={(e) =>
                      handleInputChange('budgetAmount', e.target.value)
                    }
                    placeholder="0"
                    style={{ flex: 1 }}
                    className="text-md"
                  />
                  <Select
                    value={editData.currencyId}
                    onChange={(value) => handleInputChange('currencyId', value)}
                    style={{ width: 120 }}
                    className="text-md"
                    placeholder="Currency"
                    allowClear
                    loading={currenciesLoading}
                  >
                    {currencies.map((currency) => (
                      <Option key={currency.id} value={currency.id}>
                        {currency.name}
                      </Option>
                    ))}
                  </Select>
                </div>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={24} lg={12}>
              <div className="ml-2">
                <Text
                  type="secondary"
                  className="text-md font-medium mb-2 block"
                >
                  Company
                </Text>
                <Select
                  value={editData.company}
                  onChange={(value) => handleInputChange('companyId', value)}
                  placeholder="Select Company..."
                  className="text-md"
                  allowClear
                  loading={companiesLoading}
                  showSearch
                  filterOption={(input: string, option: any) => {
                    const children = option?.children;
                    if (typeof children === 'string') {
                      return (
                        children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      );
                    }
                    return false;
                  }}
                >
                  {companies.map((company) => (
                    <Option key={company.id} value={company.id}>
                      {company.name}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col span={24} lg={12}>
              <div className="mr-2">
                <Text
                  type="secondary"
                  className="text-md font-medium mb-2 block"
                >
                  Supplier
                </Text>
                <Select
                  value={editData.supplier}
                  onChange={(value) => handleInputChange('supplierId', value)}
                  placeholder="Select Supplier..."
                  className="text-md"
                  allowClear
                  loading={suppliersLoading}
                  showSearch
                  filterOption={(input: string, option: any) => {
                    const children = option?.children;
                    if (typeof children === 'string') {
                      return (
                        children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      );
                    }
                    return false;
                  }}
                >
                  {suppliers.map((supplier) => (
                    <Option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={24} lg={12}>
              <div className="ml-2">
                <Text
                  type="secondary"
                  className="text-md font-medium mb-2 block"
                >
                  Solution
                </Text>
                <Select
                  value={editData.solutionId}
                  onChange={(value) => handleInputChange('solutionId', value)}
                  placeholder="Select Solution..."
                  className="text-md"
                  allowClear
                  loading={solutionsLoading}
                  showSearch
                  filterOption={(input: string, option: any) => {
                    const children = option?.children;
                    if (typeof children === 'string') {
                      return (
                        children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      );
                    }
                    return false;
                  }}
                >
                  {solutions.map((solution) => (
                    <Option key={solution.id} value={solution.id}>
                      {solution.name}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col span={24} lg={12}>
              <div className="mr-2">
                <Text
                  type="secondary"
                  className="text-md font-medium mb-2 block"
                >
                  Sector
                </Text>
                <Select
                  value={editData.sectorId}
                  onChange={(value) => handleInputChange('sectorId', value)}
                  placeholder="Select Sector..."
                  className="text-md"
                  allowClear
                  loading={sectorsLoading}
                >
                  {sectors.map((sector) => (
                    <Option key={sector.id} value={sector.id}>
                      {sector.name}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={24} lg={12}>
              <div className="ml-2">
                <Text
                  type="secondary"
                  className="text-md font-medium mb-2 block"
                >
                  Deal Stage
                </Text>
                <Select
                  value={editData.stageId}
                  onChange={(value) => handleInputChange('stageId', value)}
                  placeholder="Select Stage..."
                  className="text-md"
                  allowClear
                  loading={stagesLoading}
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label || '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                >
                  {dealStages.map((stage) => (
                    <Option key={stage.id} value={stage.id} label={stage.name}>
                      <div className="flex items-center gap-3 w-full">
                        {stage.colorCode && (
                          <div
                            className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0"
                            style={{ backgroundColor: stage.colorCode }}
                          />
                        )}
                        <span className="flex-1">{stage.name}</span>
                      </div>
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col span={24} lg={12}>
              <div className="mr-2">
                <Text
                  type="secondary"
                  className="text-md font-medium mb-2 block"
                >
                  Submission Date
                </Text>
                <Input
                  value={editData.submissionDate}
                  onChange={(e) =>
                    handleInputChange('submissionDate', e.target.value)
                  }
                  placeholder="YYYY-MM-DD"
                  className="text-md"
                />
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={24}>
              <div className="ml-2">
                <Text
                  type="secondary"
                  className="text-md font-medium mb-2 block"
                >
                  Additional Information
                </Text>
                <Input.TextArea
                  value={editData.additionalInformation}
                  onChange={(e) =>
                    handleInputChange('additionalInformation', e.target.value)
                  }
                  placeholder="Additional information..."
                  className="text-md"
                  rows={3}
                />
              </div>
            </Col>
          </Row>

          <div className="flex justify-end gap-2">
            <Button
              onClick={handleEditToggle}
              disabled={updateDealMutation.isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              type="primary"
              loading={updateDealMutation.isLoading}
              disabled={!editData.dealName?.trim()}
            >
              Save
            </Button>
          </div>
        </Space>
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col span={24} lg={12}>
              <div className="">
                <Text type="secondary" className="text-sm font-medium">
                  Deal Name
                </Text>
                <div className="mt-1">
                  <Text strong className="text-base">
                    {deal.dealName || 'N/A'}
                  </Text>
                </div>
              </div>
            </Col>
            <Col span={24} lg={12}>
              <div className="">
                <Text type="secondary" className="text-sm font-medium">
                  Budget
                </Text>
                <div className="mt-1">
                  <Text strong className="text-base">
                    {deal.budget?.amount && deal.budget?.currency
                      ? formatCurrency(deal.budget.amount, deal.budget.currency)
                      : deal.formAmount
                        ? `${deal.formAmount.toLocaleString()} ${deal.formCurrencyName || 'USD'}`
                        : 'Not set'}
                  </Text>
                </div>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={24} lg={12}>
              <div className="">
                <Text type="secondary" className="text-sm font-medium">
                  Company
                </Text>
                <div className="mt-1">
                  <Text strong className="text-base">
                    {deal.company || 'N/A'}
                  </Text>
                </div>
              </div>
            </Col>
            <Col span={24} lg={12}>
              <div className="">
                <Text type="secondary" className="text-sm font-medium">
                  Supplier
                </Text>
                <div className="mt-1">
                  <Text strong className="text-base">
                    {deal.supplier || 'N/A'}
                  </Text>
                </div>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={24} lg={12}>
              <div className="">
                <Text type="secondary" className="text-sm font-medium">
                  Solutions
                </Text>
                <div className="mt-1">
                  <Text strong className="text-base">
                    {deal.solutions || 'N/A'}
                  </Text>
                </div>
              </div>
            </Col>
            <Col span={24} lg={12}>
              <div className="">
                <Text type="secondary" className="text-sm font-medium">
                  Sector
                </Text>
                <div className="mt-1">
                  <Text strong className="text-base">
                    {deal.sector || 'N/A'}
                  </Text>
                </div>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={24} lg={12}>
              <div className="">
                <Text type="secondary" className="text-sm font-medium">
                  Deal Stage
                </Text>
                <div className="mt-1">
                  <Text strong className="text-base">
                    {deal.stage || 'N/A'}
                  </Text>
                </div>
              </div>
            </Col>
            <Col span={24} lg={12}>
              <div className="">
                <Text type="secondary" className="text-sm font-medium">
                  Submission Date
                </Text>
                <div className="mt-1">
                  <Text strong className="text-base">
                    {deal.submissionDate || 'N/A'}
                  </Text>
                </div>
              </div>
            </Col>
          </Row>

          {deal.additionalInformation && (
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <div>
                  <Text type="secondary" className="text-sm font-medium">
                    Additional Information
                  </Text>
                  <div className="mt-1">
                    <Text strong className="text-base">
                      {deal.additionalInformation}
                    </Text>
                  </div>
                </div>
              </Col>
            </Row>
          )}

          <div>
            <Text type="secondary" className="text-sm font-medium">
              Roles
            </Text>
            <div className="flex gap-2 mt-1">
              {rolesLoading ? (
                <Text type="secondary" className="text-sm">
                  Loading roles...
                </Text>
              ) : rolesError ? (
                <Text type="secondary" className="text-sm text-red-500">
                  Failed to load roles
                </Text>
              ) : !Array.isArray(roles) || roles.length === 0 ? (
                <Text type="secondary" className="text-sm">
                  No roles assigned
                </Text>
              ) : (
                roles.slice(0, 4).map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full border border-border"
                  >
                    <UserOutlined className="text-muted-foreground text-sm" />
                    <Text className="text-sm text-foreground">{role.name}</Text>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Address Information Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <Title level={5} style={{ margin: 0 }}>
                Address Information
              </Title>
            </div>
            <Row gutter={[16, 16]}>
              <Col span={24} lg={12}>
                <div>
                  <Text type="secondary" className="text-sm font-medium">
                    Billing State
                  </Text>
                  <div className="mt-1">
                    <Text strong className="text-base">
                      State Name
                    </Text>
                  </div>
                </div>
              </Col>
              <Col span={24} lg={12}>
                <div>
                  <Text type="secondary" className="text-sm font-medium">
                    Billing Code
                  </Text>
                  <div className="mt-1">
                    <Text strong className="text-base">
                      Billing Code Number
                    </Text>
                  </div>
                </div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} className="mt-4">
              <Col span={12}>
                <div>
                  <Text type="secondary" className="text-sm font-medium">
                    Billing City
                  </Text>
                  <div className="mt-1">
                    <Text strong className="text-base">
                      Billing City Name
                    </Text>
                  </div>
                </div>
              </Col>
              <Col span={24} lg={12}>
                <div>
                  <Text type="secondary" className="text-sm font-medium">
                    Shipping Address
                  </Text>
                  <div className="mt-1">
                    <Text strong className="text-base">
                      Shipping Address Name
                    </Text>
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          {/* Timeline Information Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <Title level={5} style={{ margin: 0 }}>
                Timeline Information
              </Title>
            </div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div>
                  <Text type="secondary" className="text-sm font-medium">
                    Created
                  </Text>
                  <div className="mt-1">
                    <Text strong className="text-base">
                      {deal.createdAt
                        ? new Date(deal.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'N/A'}
                    </Text>
                  </div>
                </div>
              </Col>
              <Col span={24} lg={12}>
                <div>
                  <Text type="secondary" className="text-sm font-medium">
                    Last Update
                  </Text>
                  <div className="mt-1">
                    <Text strong className="text-base">
                      {deal.updatedAt
                        ? new Date(deal.updatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'N/A'}
                    </Text>
                  </div>
                </div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} className="mt-4">
              <Col span={12}>
                <div>
                  <Text type="secondary" className="text-sm font-medium">
                    Total Activities
                  </Text>
                  <div className="mt-1">
                    {!filterActivities ? (
                      <Text type="secondary" className="text-base">
                        Loading...
                      </Text>
                    ) : (
                      <Text strong className="text-base">
                        {Array.isArray(filterActivities?.data)
                          ? `${filterActivities.data.length} ${filterActivities.data.length === 1 ? 'activity' : 'activities'}`
                          : '0 activities'}
                      </Text>
                    )}
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          {/* Attached Files Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <Title level={5} style={{ margin: 0 }}>
                Attached Files
              </Title>
            </div>

            {/* Check if documents exist */}
            {!deal.dealDocuments || deal.dealDocuments.length === 0 ? (
              // EMPTY STATE - Show Placeholders
              <Row gutter={[16, 16]}>
                <Col span={24} lg={12}>
                  <div className="p-4 border-2 border-dashed border-border rounded-lg bg-surface-elevated text-center hover:border-border transition-colors">
                    <Text type="secondary" className="text-sm">
                      No files attached
                    </Text>
                  </div>
                </Col>
                <Col span={24} lg={12}>
                  <div className="p-4 border-2 border-dashed border-border rounded-lg bg-surface-elevated text-center hover:border-border transition-colors">
                    <Text type="secondary" className="text-sm">
                      No files attached
                    </Text>
                  </div>
                </Col>
              </Row>
            ) : (
              // DOCUMENTS EXIST - Show File List
              <Row gutter={[16, 16]}>
                {deal.dealDocuments.map((document) => (
                  <Col key={document.id} span={24} lg={12}>
                    <Spin spinning={downloadingFileId === document.id}>
                      <div
                        className="p-4 border-2 border-solid border-border rounded-lg bg-surface-card hover:border-primary hover:shadow-md transition-all cursor-pointer"
                        onClick={() =>
                          handleDownloadFile(
                            document.filePath,
                            document.fileName,
                            document.id,
                          )
                        }
                        title="Click to download"
                      >
                        <div className="flex items-center gap-3">
                          {/* File Icon */}
                          <div className="text-2xl flex-shrink-0">
                            {getFileIcon(document.fileName)}
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <Text
                              strong
                              className="text-sm block truncate"
                              title={document.fileName}
                            >
                              {document.fileName}
                            </Text>

                            {/* Show upload date */}
                            {document.createdAt && (
                              <Text
                                type="secondary"
                                className="text-xs block mt-1"
                              >
                                {new Date(
                                  document.createdAt,
                                ).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </Text>
                            )}
                          </div>

                          {/* Download Button */}
                          <Button
                            type="text"
                            icon={
                              <DownloadOutlined
                                style={{
                                  fontSize: '18px',
                                  color: tokens.color.accentBlue,
                                }}
                              />
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadFile(
                                document.filePath,
                                document.fileName,
                                document.id,
                              );
                            }}
                            loading={downloadingFileId === document.id}
                            className="flex-shrink-0"
                          />
                        </div>
                      </div>
                    </Spin>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        </Space>
      )}
    </Card>
  );
}
