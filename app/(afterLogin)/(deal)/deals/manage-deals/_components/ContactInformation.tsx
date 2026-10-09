import { tokens } from '@/lib/design-tokens';
import {
  EditOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Space,
  Typography,
  Input,
  Row,
  Col,
  message,
  Select,
  Modal,
} from 'antd';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  useUpdateDeal,
  useDeleteDeal,
} from '@/store/server/features/deals/queries';
// Removed unused imports for companies, suppliers, currencies

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

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
  solutions: string;
  budget: {
    amount: string;
    currency: string;
  };
}

interface ContactInformationProps {
  deal: DealData;
  onDealUpdated?: () => void;
}

export default function ContactInformation({
  deal,
  onDealUpdated,
}: ContactInformationProps) {
  const router = useRouter();

  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState({
    dealName: deal.dealName || '',
    contactPersonName: deal.contactPersonName || '',
    contactPersonEmail: deal.contactPersonEmail || '',
    contactPersonPhoneNumber: deal.contactPersonPhoneNumber || '',
    // Note: We'll need to store company/supplier IDs if available from the API
    // For now, using the names as strings
    company: deal.company || '',
    supplier: deal.supplier || '',
    amount: deal.budget?.amount || '',
    currency: deal.budget?.currency || '',
  });

  const updateDealMutation = useUpdateDeal();
  const deleteDealMutation = useDeleteDeal();

  // Update local state when deal prop changes
  useEffect(() => {
    setEditData({
      dealName: deal.dealName || '',
      contactPersonName: deal.contactPersonName || '',
      contactPersonEmail: deal.contactPersonEmail || '',
      contactPersonPhoneNumber: deal.contactPersonPhoneNumber || '',
      company: deal.company || '',
      supplier: deal.supplier || '',
      amount: deal.budget?.amount || '',
      currency: deal.budget?.currency || '',
    });
  }, [deal]);

  const handleEditToggle = () => {
    if (isEditMode) {
      // Reset to original data when canceling edit
      setEditData({
        dealName: deal.dealName || '',
        contactPersonName: deal.contactPersonName || '',
        contactPersonEmail: deal.contactPersonEmail || '',
        contactPersonPhoneNumber: deal.contactPersonPhoneNumber || '',
        company: deal.company || '',
        supplier: deal.supplier || '',
        amount: deal.budget?.amount || '',
        currency: deal.budget?.currency || '',
      });
    }
    setIsEditMode(!isEditMode);
  };

  const handleSave = async () => {
    // Enhanced validation
    if (!editData.dealName?.trim()) {
      message.error('Deal Name is required');
      return;
    }

    if (!editData.contactPersonName?.trim()) {
      message.error('Contact Person Name is required');
      return;
    }

    // Email format validation (if provided)
    if (
      editData.contactPersonEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editData.contactPersonEmail)
    ) {
      message.error('Please enter a valid email address');
      return;
    }

    // Amount validation
    if (editData.amount && isNaN(Number(editData.amount))) {
      message.error('Please enter a valid amount');
      return;
    }

    try {
      const updateData = {
        dealName: editData.dealName.trim(),
        contactPersonName: editData.contactPersonName.trim(),
        contactPersonEmail: editData.contactPersonEmail?.trim() || '',
        contactPersonPhoneNumber:
          editData.contactPersonPhoneNumber?.trim() || '',
        amount: editData.amount ? parseFloat(editData.amount) : undefined,
        // Note: You may need to adjust these fields based on your API structure
        // For now, keeping them as strings but you might need to convert to IDs
      };

      await updateDealMutation.mutateAsync({
        dealId: deal.id,
        dealData: updateData,
      });

      setIsEditMode(false);

      // Update local state immediately for better UX
      setEditData({
        dealName: updateData.dealName,
        contactPersonName: updateData.contactPersonName,
        contactPersonEmail: updateData.contactPersonEmail,
        contactPersonPhoneNumber: updateData.contactPersonPhoneNumber,
        company: deal.company, // Keep existing values
        supplier: deal.supplier,
        amount: updateData.amount?.toString() || '',
        currency: editData.currency,
      });

      message.success('Deal updated successfully');

      // Notify parent component to refresh deal data
      if (onDealUpdated) {
        onDealUpdated();
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        'Failed to update contact information';
      message.error(errorMessage);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDeleteDeal = async () => {
    confirm({
      title: 'Are you sure you want to delete this deal?',
      content:
        'This action cannot be undone. All deal data and attachments will be permanently removed.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteDealMutation.mutateAsync(deal.id);
          message.success('Deal deleted successfully');

          // Redirect to deals list after successful deletion
          setTimeout(() => {
            router.push('/deals');
          }, 1500);
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.message || 'Failed to delete deal';
          message.error(errorMessage);
        }
      },
    });
  };

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <Title level={5} style={{ margin: 0 }}>
            Contact Information
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
          <Row gutter={24}>
            <Col span={12}>
              <div className="ml-2">
                <Text
                  type="secondary"
                  className="text-sm font-medium mb-2 block"
                >
                  Deal Name
                </Text>
                <Input
                  value={editData.dealName}
                  onChange={(e) =>
                    handleInputChange('dealName', e.target.value)
                  }
                  placeholder="Deal Name..."
                />
              </div>
            </Col>
            <Col span={12}>
              <div className="mr-2">
                <Text
                  type="secondary"
                  className="text-sm font-medium mb-2 block"
                >
                  Contact Person
                </Text>
                <Input
                  value={editData.contactPersonName}
                  onChange={(e) =>
                    handleInputChange('contactPersonName', e.target.value)
                  }
                  placeholder="Contact Person Name..."
                />
              </div>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <div className="ml-2">
                <Text
                  type="secondary"
                  className="text-sm font-medium mb-2 block"
                >
                  Email
                </Text>
                <Input
                  value={editData.contactPersonEmail}
                  onChange={(e) =>
                    handleInputChange('contactPersonEmail', e.target.value)
                  }
                  placeholder="Email..."
                  type="email"
                />
              </div>
            </Col>
            <Col span={12}>
              <div className="mr-2">
                <Text
                  type="secondary"
                  className="text-sm font-medium mb-2 block"
                >
                  Phone
                </Text>
                <Input
                  value={editData.contactPersonPhoneNumber}
                  onChange={(e) =>
                    handleInputChange(
                      'contactPersonPhoneNumber',
                      e.target.value,
                    )
                  }
                  placeholder="Phone..."
                  maxLength={20}
                />
              </div>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <div className="ml-2">
                <Text
                  type="secondary"
                  className="text-sm font-medium mb-2 block"
                >
                  Budget Amount
                </Text>
                <Input
                  value={editData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="Amount..."
                  type="number"
                />
              </div>
            </Col>
            <Col span={12}>
              <div className="mr-2">
                <Text
                  type="secondary"
                  className="text-sm font-medium mb-2 block"
                >
                  Currency
                </Text>
                <Select
                  value={editData.currency}
                  onChange={(value) => handleInputChange('currency', value)}
                  placeholder="Select Currency"
                  style={{ width: '100%' }}
                >
                  <Option value="$">USD ($)</Option>
                  <Option value="€">EUR (€)</Option>
                  <Option value="ETB">ETB</Option>
                  <Option value="AED">AED</Option>
                </Select>
              </div>
            </Col>
          </Row>

          <div className="flex gap-2">
            <Button
              onClick={handleEditToggle}
              disabled={updateDealMutation.isLoading}
              icon={<CloseOutlined className="h-4 w-4" />}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              type="primary"
              loading={updateDealMutation.isLoading}
              icon={<SaveOutlined className="h-4 w-4" />}
              disabled={
                !editData.dealName?.trim() ||
                !editData.contactPersonName?.trim()
              }
            >
              Save
            </Button>
          </div>
        </Space>
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Budget Display */}
          <div className="mb-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-4">
              $
              {deal.budget?.amount
                ? parseFloat(deal.budget.amount).toLocaleString()
                : '0'}
            </div>
          </div>
          <Row gutter={[16, 16]}>
            <Col span={12} lg={24}>
              <div className="ml-2">
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
            <Col span={12} lg={24}>
              <div className="ml-2">
                <Text type="secondary" className="text-sm font-medium">
                  Contact Person
                </Text>
                <div className="mt-1">
                  <Text strong className="text-base">
                    {deal.contactPersonName || 'N/A'}
                  </Text>
                </div>
              </div>
            </Col>
            <Col span={12} lg={24}>
              <div className="ml-2">
                <Text type="secondary" className="text-sm font-medium">
                  Email
                </Text>
                <div className="mt-1">
                  <Text strong className="text-base">
                    {deal.contactPersonEmail || 'N/A'}
                  </Text>
                </div>
              </div>
            </Col>
            <Col span={12} lg={24}>
              <div className="ml-2">
                <Text type="secondary" className="text-sm font-medium">
                  Phone
                </Text>
                <div className="mt-1">
                  <Text strong className="text-base">
                    {deal.contactPersonPhoneNumber || 'N/A'}
                  </Text>
                </div>
              </div>
            </Col>
            <Col span={12} lg={24}>
              <div className="ml-2">
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
            <Col span={12} lg={24}>
              <div className="ml-2">
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
            <Col span={12} lg={24}>
              <Button
                danger
                type="primary"
                icon={<ExclamationCircleOutlined className="h-4 w-4" />}
                className="w-full h-10"
                onClick={handleDeleteDeal}
                loading={deleteDealMutation.isLoading}
              >
                Remove Deal
              </Button>
            </Col>
          </Row>
        </Space>
      )}
    </Card>
  );
}
