import { tokens } from '@/lib/design-tokens';
import { Icon } from '@iconify/react';
import { TriangleAlert } from 'lucide-react';
import { Button as UIButton } from '@/components/ui/button';
import { Card as UICard, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select as UISelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import type { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Lead } from '@/store/server/features/leads/interface';
import {
  useUpdateLeadMutation,
  useDeleteLeadMutation,
} from '@/store/server/features/leads/mutation';
import { useCompaniesQuery } from '@/store/server/features/leads/queries';

function Title({ children, style }: any) {
  return (
    <h3 className="text-base font-semibold text-foreground" style={style}>
      {children}
    </h3>
  );
}

function Text({ children, type, strong, className }: any) {
  return (
    <span
      className={`${type === 'secondary' ? 'text-muted-foreground' : ''} ${
        strong ? 'font-semibold text-foreground' : ''
      } ${className ?? ''}`}
    >
      {children}
    </span>
  );
}

function Button({
  icon,
  loading,
  danger,
  type,
  size,
  children,
  className,
  ...props
}: any) {
  return (
    <UIButton
      variant={danger ? 'destructive' : type === 'text' ? 'ghost' : 'default'}
      size={size === 'small' ? 'sm' : 'default'}
      className={className}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </UIButton>
  );
}

function Card({ title, children, className, style, bodyStyle }: any) {
  return (
    <UICard className={className} style={style}>
      {title && <CardHeader className="pb-0">{title}</CardHeader>}
      <CardContent style={bodyStyle}>{children}</CardContent>
    </UICard>
  );
}

function Space({ children }: any) {
  return <div className="flex w-full flex-col gap-2">{children}</div>;
}

function Select({ value, onChange, placeholder, children, className }: any) {
  return (
    <UISelect value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </UISelect>
  );
}

function Option({ value, children }: any) {
  return <SelectItem value={value}>{children}</SelectItem>;
}

interface ContactInformationProps {
  lead: Lead;
  onLeadUpdated?: () => void;
}

export default function ContactInformation({
  lead,
  onLeadUpdated,
}: ContactInformationProps) {
  const router = useRouter();
  const { data: companies = [] } = useCompaniesQuery();

  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState({
    contactPersonFName: lead.contactPersonFName || '',
    contactPersonLName: lead.contactPersonLName || '',
    companyId: lead.companyId,
    contactPersonEmail: lead.contactPersonEmail || '',
    contactPersonPhoneNumber: lead.contactPersonPhoneNumber || '',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const updateLeadMutation = useUpdateLeadMutation();
  const deleteLeadMutation = useDeleteLeadMutation();

  // Update local state when lead prop changes
  useEffect(() => {
    setEditData({
      contactPersonFName: lead.contactPersonFName || '',
      contactPersonLName: lead.contactPersonLName || '',
      companyId: lead.companyId,
      contactPersonEmail: lead.contactPersonEmail || '',
      contactPersonPhoneNumber: lead.contactPersonPhoneNumber || '',
    });
  }, [lead]);

  // Get company name from companyId
  const getCompanyName = () => {
    if (!lead.companyId) return 'N/A';
    const company = companies.find((c) => c.id === lead.companyId);
    return company?.name || 'N/A';
  };

  // Get full contact person name
  const getContactPersonName = () => {
    const firstName = lead.contactPersonFName || '';
    const lastName = lead.contactPersonLName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || 'N/A';
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      // Reset to original data when canceling edit
      setEditData({
        contactPersonFName: lead.contactPersonFName || '',
        contactPersonLName: lead.contactPersonLName || '',
        companyId: lead.companyId,
        contactPersonEmail: lead.contactPersonEmail || '',
        contactPersonPhoneNumber: lead.contactPersonPhoneNumber || '',
      });
    }
    setIsEditMode(!isEditMode);
  };

  const handleSave = async () => {
    // Enhanced validation
    if (!editData.contactPersonFName?.trim()) {
      toast.error('Contact Person First Name is required');
      return;
    }
    if (!editData.contactPersonLName?.trim()) {
      toast.error('Contact Person Last Name is required');
      return;
    }

    // Email format validation (if provided)
    if (
      editData.contactPersonEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editData.contactPersonEmail)
    ) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      const updateData = {
        contactPersonFName: editData.contactPersonFName.trim(),
        contactPersonLName: editData.contactPersonLName.trim(),
        companyId: editData.companyId,
        contactPersonEmail: editData.contactPersonEmail?.trim() || '',
        contactPersonPhoneNumber:
          editData.contactPersonPhoneNumber?.trim() || '',
      };

      await updateLeadMutation.mutateAsync({
        leadId: lead.id,
        data: updateData,
      });

      setIsEditMode(false);

      // Update local state immediately for better UX
      setEditData({
        contactPersonFName: updateData.contactPersonFName,
        contactPersonLName: updateData.contactPersonLName,
        companyId: updateData.companyId,
        contactPersonEmail: updateData.contactPersonEmail,
        contactPersonPhoneNumber: updateData.contactPersonPhoneNumber,
      });

      // Notify parent component to refresh lead data
      if (onLeadUpdated) {
        onLeadUpdated();
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        'Failed to update contact information';
      toast.error(errorMessage);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDeleteLead = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteLeadMutation.mutateAsync(lead.id);
      toast.success('Lead deleted successfully');
      setDeleteDialogOpen(false);

      // Redirect to leads list after successful deletion
      setTimeout(() => {
        router.push('/leads');
      }, 1500);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || 'Failed to delete lead';
      toast.error(errorMessage);
    }
  };

  return (
    <>
      <Card
        title={
          <div className="flex items-center justify-between ml-2 mr-2">
            <Title level={5} style={{ margin: 0 }}>
              Contact Information
            </Title>
            <Button
              type="text"
              size="small"
              icon={
                <Icon
                  icon="fluent:edit-16-regular"
                  className="text-lg sm:text-2xl"
                  style={{
                    color: isEditMode
                      ? tokens.color.blue
                      : tokens.color.textPrimary,
                  }}
                />
              }
              onClick={handleEditToggle}
              loading={updateLeadMutation.isLoading}
              data-cy="contact-info-edit-button"
            />
          </div>
        }
        className="h-fit"
        style={{ border: '2px solid rgba(229, 231, 235, 0.7)' }}
        headStyle={{ borderBottom: 'none' }}
        bodyStyle={{ paddingTop: '4px', paddingBottom: '48px' }}
      >
        {isEditMode ? (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div className="ml-2 mr-2">
              <Text type="secondary" className="text-sm font-medium mb-1 block">
                First Name
              </Text>
              <Input
                value={editData.contactPersonFName}
                onChange={(e) =>
                  handleInputChange('contactPersonFName', e.target.value)
                }
                placeholder="First Name..."
                className="border-gray-800 bg-surface-card w-full h-11 text-base hover:border-gray-800 focus:border-gray-800 focus:shadow-none"
                data-cy="contact-info-firstname-input"
                style={{
                  borderWidth: '2px !important',
                  borderColor: '#1f2937 !important',
                }}
              />
            </div>

            <div className="ml-2 mr-2">
              <Text type="secondary" className="text-sm font-medium mb-1 block">
                Last Name
              </Text>
              <Input
                value={editData.contactPersonLName}
                onChange={(e) =>
                  handleInputChange('contactPersonLName', e.target.value)
                }
                placeholder="Last Name..."
                className="border-gray-800 bg-surface-card w-full h-11 text-base hover:border-gray-800 focus:border-gray-800 focus:shadow-none"
                data-cy="contact-info-lastname-input"
                style={{
                  borderWidth: '2px !important',
                  borderColor: '#1f2937 !important',
                }}
              />
            </div>

            <div className="ml-2 mr-2">
              <Text type="secondary" className="text-sm font-medium mb-1 block">
                Email
              </Text>
              <Input
                value={editData.contactPersonEmail}
                onChange={(e) =>
                  handleInputChange('contactPersonEmail', e.target.value)
                }
                placeholder="Email..."
                type="email"
                className="border-gray-800 bg-surface-card w-full h-11 text-base hover:border-gray-800 focus:border-gray-800 focus:shadow-none"
                data-cy="contact-info-email-input"
                style={{
                  borderWidth: '2px !important',
                  borderColor: '#1f2937 !important',
                }}
              />
            </div>

            <div className="ml-2 mr-2">
              <Text type="secondary" className="text-sm font-medium mb-1 block">
                Phone
              </Text>
              <Input
                value={editData.contactPersonPhoneNumber}
                onChange={(e) =>
                  handleInputChange('contactPersonPhoneNumber', e.target.value)
                }
                placeholder="Phone..."
                maxLength={20}
                className="border-gray-800 bg-surface-card w-full h-11 text-base hover:border-gray-800 focus:border-gray-800 focus:shadow-none"
                data-cy="contact-info-phone-input"
                style={{
                  borderWidth: '2px !important',
                  borderColor: '#1f2937 !important',
                }}
              />
            </div>

            <div className="ml-2 mr-2">
              <Text type="secondary" className="text-sm font-medium mb-1 block">
                Company
              </Text>
              <Select
                value={editData.companyId}
                onChange={(value: string) =>
                  handleInputChange('companyId', value)
                }
                placeholder="Select Company"
                style={{
                  width: '100%',
                }}
                className="h-11 custom-select-lead-detail border-gray-800"
                data-cy="contact-info-company-select"
                allowClear
                showSearch
                filterOption={(input: string, option: any) => {
                  const children = option?.children;
                  if (typeof children === 'string') {
                    return children.toLowerCase().includes(input.toLowerCase());
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

            <Button
              onClick={handleSave}
              type="primary"
              className="px-4 py-3 rounded-lg w-full h-11 focus:outline-none focus:ring-0 focus:shadow-none active:shadow-none"
              loading={updateLeadMutation.isLoading}
              disabled={
                !editData.contactPersonFName?.trim() ||
                !editData.contactPersonLName?.trim()
              }
              data-cy="contact-info-save-button"
              style={{
                backgroundColor: tokens.color.blue,
                borderColor: tokens.color.blue,
                color: tokens.color.surfaceCard,
                transition: 'background-color 0.2s ease',
                transform: 'none',
                boxShadow: 'none',
              }}
              onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = tokens.color.blue;
                e.currentTarget.style.borderColor = tokens.color.blue;
              }}
              onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = tokens.color.blue;
                e.currentTarget.style.borderColor = tokens.color.blue;
              }}
            >
              Save
            </Button>
          </Space>
        ) : (
          <div className="ml-2 mr-2">
            {/* Mobile: 2-column layout, Desktop: single column (original layout) */}
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-4 sm:gap-6">
              {/* Left column on mobile, all items on desktop */}
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <Text type="secondary" className="text-sm font-medium">
                    Name
                  </Text>
                  <div className="mt-1">
                    <Text strong className="text-base">
                      {getContactPersonName()}
                    </Text>
                  </div>
                </div>

                <div>
                  <Text type="secondary" className="text-sm font-medium">
                    Phone
                  </Text>
                  <div className="mt-1">
                    <Text strong className="text-base">
                      {lead.contactPersonPhoneNumber || 'N/A'}
                    </Text>
                  </div>
                </div>

                {/* Desktop: Show all items in single column */}
                <div className="hidden sm:block space-y-6">
                  <div>
                    <Text type="secondary" className="text-sm font-medium">
                      Email
                    </Text>
                    <div className="mt-1">
                      <Text strong className="text-base">
                        {lead.contactPersonEmail || 'N/A'}
                      </Text>
                    </div>
                  </div>

                  <div>
                    <Text type="secondary" className="text-sm font-medium">
                      Company
                    </Text>
                    <div className="mt-1">
                      <Text strong className="text-base">
                        {getCompanyName()}
                      </Text>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column on mobile only */}
              <div className="sm:hidden space-y-4">
                <div>
                  <Text type="secondary" className="text-sm font-medium">
                    Email
                  </Text>
                  <div className="mt-1">
                    <Text strong className="text-base">
                      {lead.contactPersonEmail || 'N/A'}
                    </Text>
                  </div>
                </div>

                <div>
                  <Text type="secondary" className="text-sm font-medium">
                    Company
                  </Text>
                  <div className="mt-1">
                    <Text strong className="text-base">
                      {getCompanyName()}
                    </Text>
                  </div>
                </div>

                {/* Remove Lead button - positioned in right column on mobile */}
                <div>
                  <Button
                    danger
                    type="primary"
                    icon={
                      <TriangleAlert className="h-5 w-5 text-brand-foreground" />
                    }
                    className="w-full h-12 text-xs sm:text-sm flex items-center justify-start"
                    onClick={handleDeleteLead}
                    loading={deleteLeadMutation.isLoading}
                    data-cy="contact-info-delete-button"
                  >
                    <div className="leading-tight ml-0.5">
                      <div>Remove</div>
                      <div>Lead</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Remove Lead button - full width on desktop (original position) */}
              <div className="hidden sm:block">
                <Button
                  danger
                  type="primary"
                  icon={
                    <TriangleAlert className="h-5 w-5 text-brand-foreground" />
                  }
                  className="w-full h-10 text-sm"
                  onClick={handleDeleteLead}
                  loading={deleteLeadMutation.isLoading}
                  data-cy="contact-info-delete-button"
                >
                  <span className="truncate">Remove Lead</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this Lead ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-brand text-brand hover:text-brand"
              disabled={deleteLeadMutation.isLoading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#3b82f6] text-brand-foreground hover:bg-brand"
              onClick={(event) => {
                event.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={deleteLeadMutation.isLoading}
            >
              {deleteLeadMutation.isLoading && (
                <Spinner className="mr-2 size-4 text-brand-foreground" />
              )}
              Remove Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
