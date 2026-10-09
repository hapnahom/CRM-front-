import React, { useEffect, useState } from 'react';
import {
  Drawer,
  Button,
  Input,
  Form,
  Upload,
  Row,
  Col,
  message,
  Spin,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import Image from 'next/image';
import { fileUpload } from '@/utils/fileUpload';
import { validatePhone, validateWebsite } from '@/utils/validation';

const { TextArea } = Input;

export interface CompanySupplierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: any) => Promise<void>;
  itemType: string;
  itemData?: any;
  isLoading?: boolean;
  existingNames?: string[]; // Array of existing names for validation
  existingEmails?: string[]; // Array of existing emails for companies
}

const CompanySupplierDrawer: React.FC<CompanySupplierDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  itemType,
  itemData = {},
  isLoading = false,
  existingNames = [],
  existingEmails = [],
}) => {
  const [form] = Form.useForm();
  const [isMobile, setIsMobile] = useState(false);
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      // Cleanup blob URLs when drawer closes
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setLogoUrl('');
      setPreviewUrl('');
      setSelectedFile(null);
    }
  }, [isOpen, previewUrl]);

  // Update form values when drawer opens or data changes
  useEffect(() => {
    if (isOpen && itemData) {
      if (itemType === 'Company') {
        const logoValue = itemData.logo || '';
        form.setFieldsValue({
          name: itemData.name || '',
          email: itemData.email || '',
          phone: itemData.phone || '',
          website: itemData.website || '',
          city: itemData.city || '',
          state: itemData.state || '',
          zipcode: itemData.zipcode || '',
          description: itemData.description || '',
          logo: logoValue,
        });
        // Set logo URLs - ensure we handle empty strings properly
        if (logoValue && logoValue.trim() !== '') {
          setLogoUrl(logoValue);
          setPreviewUrl(logoValue);
        } else {
          setLogoUrl('');
          setPreviewUrl('');
        }
      } else if (itemType === 'Supplier') {
        const logoValue = itemData.logo || '';
        form.setFieldsValue({
          name: itemData.name || '',
          phone: itemData.phone || '',
          email: itemData.email || '',
          website: itemData.website || '',
          city: itemData.city || '',
          state: itemData.state || '',
          zipcode: itemData.zipcode || '',
          description: itemData.description || '',
          logo: logoValue,
        });
        // Set logo URLs - ensure we handle empty strings properly
        if (logoValue && logoValue.trim() !== '') {
          setLogoUrl(logoValue);
          setPreviewUrl(logoValue);
        } else {
          setLogoUrl('');
          setPreviewUrl('');
        }
      }
    } else if (isOpen && !itemData) {
      // Reset if drawer opens without data
      setLogoUrl('');
      setPreviewUrl('');
      setSelectedFile(null);
    }
  }, [isOpen, itemData, form, itemType]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await onSave(values);
      // Note: Don't cleanup previewUrl here as it might be the server URL
      // Only cleanup blob URLs in handleClose
      form.resetFields();
    } catch (error) {
      // Form validation failed
    }
  };

  const handleClose = () => {
    // Cleanup blob URLs
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    form.resetFields();
    setLogoUrl('');
    setPreviewUrl('');
    setSelectedFile(null);
    onClose();
  };

  // File Server Upload Function - same as lead module
  const uploadToFileServer = async (file: File): Promise<string> => {
    try {
      // Use the existing fileUpload utility instead of direct fetch
      const response = await fileUpload(file);

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(
          `File server upload failed: ${response.status} ${response.statusText}`,
        );
      }

      // Extract file path/URL from response
      // The fileUpload utility returns CustomFile interface with image and viewImage
      const filePath = response.data?.image || response.data?.viewImage;

      if (!filePath) {
        // Fallback to mock path for testing
        const mockFilePath = `https://files.ienetworks.co/uploads/${file.name}`;
        return mockFilePath;
      }

      return filePath;
    } catch (error) {
      throw error;
    }
  };

  // Handle file selection - create local preview immediately
  const handleLogoChange = (info: any) => {
    const { file } = info;
    const rcFile = file.originFileObj || file;

    if (rcFile && rcFile instanceof File) {
      // Validate file type (images only)
      if (!rcFile.type?.startsWith('image/')) {
        message.error('Please upload an image file');
        return;
      }

      // Cleanup previous blob URL
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }

      // Create local preview URL immediately
      const blobUrl = URL.createObjectURL(rcFile);
      setPreviewUrl(blobUrl);
      setSelectedFile(rcFile);

      // Trigger upload
      if (file.status !== 'uploading') {
        handleLogoUpload(rcFile);
      }
    }
  };

  // Logo upload handler - following lead document upload approach
  const handleLogoUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // Step 1: Upload file to file server (same as lead module)
      const uploadedUrl = await uploadToFileServer(file);

      // Cleanup blob URL
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }

      // Store the server URL (not local file path)
      setLogoUrl(uploadedUrl);
      setPreviewUrl(uploadedUrl); // Update preview to server URL
      form.setFieldsValue({ logo: uploadedUrl });
      message.success('Logo uploaded successfully');
    } catch (error: any) {
      const errorMessage =
        error?.message || 'Failed to upload logo. Please try again.';
      message.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogoRemove = () => {
    // Cleanup blob URL
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setLogoUrl('');
    setPreviewUrl('');
    setSelectedFile(null);
    form.setFieldsValue({ logo: '' });
  };

  return (
    <Drawer
      title={
        <div>
          <div className="text-lg lg:text-xl font-bold text-foreground">
            Edit {itemType}
          </div>
          <div className="text-xs lg:text-sm text-muted-foreground mt-1">
            Update {itemType} information
          </div>
        </div>
      }
      placement={isMobile ? 'bottom' : 'right'}
      onClose={handleClose}
      open={isOpen}
      width={isMobile ? '100%' : window.innerWidth < 1024 ? 400 : 500}
      height={isMobile ? '80%' : undefined}
      closable={false}
      styles={{
        header: { borderBottom: 'none', padding: '16px 20px' },
        body: { paddingTop: '16px', padding: '16px 20px' },
        footer: { borderTop: 'none', padding: '16px 20px' },
      }}
      footer={
        <div className="flex flex-row justify-center gap-3 border-t-0 p-2 sm:p-4">
          <Button
            onClick={handleSave}
            loading={isLoading}
            disabled={isLoading}
            className="bg-brand hover:bg-brand-hover border-brand hover:border-brand-hover text-brand-foreground py-3 sm:py-5 flex-1"
          >
            Update {itemType}
          </Button>
          <Button
            onClick={handleClose}
            disabled={isLoading}
            className="text-brand border-brand hover:bg-brand-muted py-3 sm:py-5 flex-1"
          >
            Cancel
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        className="-mt-2"
        initialValues={itemData}
      >
        {/* Logo Upload - Full Width */}
        <Form.Item label={`${itemType} Logo`} name="logo">
          <div className="mt-3">
            <Spin spinning={isUploading}>
              <Upload.Dragger
                name="logo"
                accept="image/*"
                onChange={handleLogoChange}
                onRemove={handleLogoRemove}
                maxCount={1}
                showUploadList={false}
                beforeUpload={() => false}
                customRequest={({ onSuccess }) => {
                  // Prevent default upload, we handle it manually
                  if (onSuccess) {
                    onSuccess('ok');
                  }
                }}
              >
                {previewUrl ? (
                  <div className="p-4">
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border flex items-center justify-center bg-surface-elevated">
                      {previewUrl.startsWith('blob:') ? (
                        <Image
                          src={previewUrl}
                          alt="Logo preview"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element -- blob/data preview URL
                        <img
                          src={previewUrl}
                          alt="Logo preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      {isUploading ? 'Uploading...' : 'Click to change logo'}
                    </p>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <UploadOutlined className="text-4xl text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Drag or drop file or select file from device
                    </p>
                  </div>
                )}
              </Upload.Dragger>
            </Spin>
          </div>
        </Form.Item>

        {/* Conditional Form Fields based on item type */}
        {itemType === 'Company' ? (
          /* Company Fields - Responsive Layout */
          <Row gutter={[16, 16]}>
            {/* Left Column */}
            <Col xs={24} sm={24} md={12}>
              {/* Name */}
              <Form.Item
                label="Name"
                name="name"
                rules={[
                  { required: true, message: 'Company name is required' },
                  {
                    validator: (rule, value) => {
                      if (
                        value &&
                        value !== itemData.name &&
                        existingNames.includes(value.trim())
                      ) {
                        return Promise.reject(
                          new Error('A company with this name already exists'),
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  placeholder="Company Name"
                  className="border-border focus:border-brand focus:ring-brand"
                />
              </Form.Item>

              {/* Phone */}
              <Form.Item
                label="Phone"
                name="phone"
                rules={[
                  {
                    validator: (rule, value) => {
                      if (!value || value.trim() === '') {
                        return Promise.resolve();
                      }
                      if (!validatePhone(value)) {
                        return Promise.reject(
                          new Error(
                            'Phone number must contain only digits and may start with "+"',
                          ),
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  placeholder="Company Phone"
                  className="border-border focus:border-brand focus:ring-brand"
                />
              </Form.Item>

              {/* Email */}
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Email is required' },
                  { type: 'email', message: 'Please enter a valid email' },
                  {
                    validator: (rule, value) => {
                      if (
                        value &&
                        value !== itemData.email &&
                        existingEmails.includes(value.trim())
                      ) {
                        return Promise.reject(
                          new Error('A company with this email already exists'),
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  placeholder="Company Email"
                  className="border-border focus:border-brand focus:ring-brand"
                />
              </Form.Item>

              {/* Website */}
              <Form.Item
                label="Website"
                name="website"
                rules={[
                  {
                    validator: (rule, value) => {
                      if (!value || value.trim() === '') {
                        return Promise.resolve();
                      }
                      if (!validateWebsite(value)) {
                        return Promise.reject(
                          new Error(
                            'Website must be a valid URL starting with http://, https://, or www. and include a valid domain',
                          ),
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  placeholder="Company Website"
                  className="border-border focus:border-brand focus:ring-brand"
                />
              </Form.Item>
            </Col>

            {/* Right Column */}
            <Col xs={24} sm={24} md={12}>
              {/* City */}
              <Form.Item label="City" name="city">
                <Input
                  placeholder="Company City"
                  className="border-border focus:border-brand focus:ring-brand"
                />
              </Form.Item>

              {/* State */}
              <Form.Item label="State" name="state">
                <Input
                  placeholder="Company State"
                  className="border-border focus:border-brand focus:ring-brand"
                />
              </Form.Item>

              {/* Zipcode */}
              <Form.Item label="Zipcode" name="zipcode">
                <Input
                  placeholder="Company Zipcode"
                  className="border-border focus:border-brand focus:ring-brand"
                />
              </Form.Item>
            </Col>
          </Row>
        ) : (
          /* Supplier Fields - Two Column Layout */
          <>
            {/* Responsive Layout for Supplier Form Fields */}
            <Row gutter={[16, 16]}>
              {/* Left Column */}
              <Col xs={24} sm={24} md={12}>
                {/* Name */}
                <Form.Item
                  label="Name"
                  name="name"
                  rules={[
                    { required: true, message: 'Supplier name is required' },
                    {
                      validator: (rule, value) => {
                        if (
                          value &&
                          value !== itemData.name &&
                          existingNames.includes(value.trim())
                        ) {
                          return Promise.reject(
                            new Error(
                              'A supplier with this name already exists',
                            ),
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input
                    placeholder="Supplier Name"
                    className="border-border focus:border-brand focus:ring-brand"
                  />
                </Form.Item>

                {/* Phone */}
                <Form.Item
                  label="Phone"
                  name="phone"
                  rules={[
                    { required: true, message: 'Supplier phone is required' },
                    {
                      validator: (rule, value) => {
                        if (!value || value.trim() === '') {
                          return Promise.resolve();
                        }
                        if (!validatePhone(value)) {
                          return Promise.reject(
                            new Error(
                              'Phone number must contain only digits and may start with "+"',
                            ),
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input
                    placeholder="Supplier Phone"
                    className="border-border focus:border-brand focus:ring-brand"
                  />
                </Form.Item>

                {/* Email */}
                <Form.Item
                  label="Email"
                  name="email"
                  rules={[
                    { required: true, message: 'Email is required' },
                    { type: 'email', message: 'Please enter a valid email' },
                  ]}
                >
                  <Input
                    placeholder="Supplier Email"
                    className="border-border focus:border-brand focus:ring-brand"
                  />
                </Form.Item>

                {/* Website */}
                <Form.Item
                  label="Website"
                  name="website"
                  rules={[
                    {
                      validator: (rule, value) => {
                        if (!value || value.trim() === '') {
                          return Promise.resolve();
                        }
                        if (!validateWebsite(value)) {
                          return Promise.reject(
                            new Error(
                              'Website must be a valid URL starting with http://, https://, or www. and include a valid domain',
                            ),
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input
                    placeholder="Supplier Website"
                    className="border-border focus:border-brand focus:ring-brand"
                  />
                </Form.Item>
              </Col>

              {/* Right Column */}
              <Col xs={24} sm={24} md={12}>
                {/* City */}
                <Form.Item label="City" name="city">
                  <Input
                    placeholder="Supplier City"
                    className="border-border focus:border-brand focus:ring-brand"
                  />
                </Form.Item>

                {/* State */}
                <Form.Item label="State" name="state">
                  <Input
                    placeholder="Supplier State"
                    className="border-border focus:border-brand focus:ring-brand"
                  />
                </Form.Item>

                {/* Zipcode */}
                <Form.Item label="Zipcode" name="zipcode">
                  <Input
                    placeholder="Supplier Zipcode"
                    className="border-border focus:border-brand focus:ring-brand"
                  />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {/* Description - Full Width */}
        <Form.Item label={`${itemType} Description`} name="description">
          <TextArea
            placeholder="Description"
            rows={4}
            className="border-border focus:border-brand focus:ring-brand"
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default CompanySupplierDrawer;
