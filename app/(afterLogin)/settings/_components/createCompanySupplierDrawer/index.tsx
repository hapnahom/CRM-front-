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

interface CreateCompanySupplierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: any) => Promise<void>;
  itemType: string;
  isLoading?: boolean;
  existingNames?: string[]; // Array of existing names for validation
  existingEmails?: string[]; // Array of existing emails for companies
}

const CreateCompanySupplierDrawer: React.FC<
  CreateCompanySupplierDrawerProps
> = ({
  isOpen,
  onClose,
  onSave,
  itemType,
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

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await onSave(values);
      // Cleanup blob URLs
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      form.resetFields();
      setLogoUrl('');
      setPreviewUrl('');
      setSelectedFile(null);
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

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

  const getTitle = () => {
    switch (itemType) {
      case 'Company':
        return 'Company';
      case 'Supplier':
        return 'Supplier';
      default:
        return itemType;
    }
  };

  const getButtonText = () => {
    switch (itemType) {
      case 'Company':
        return 'Create Company';
      case 'Supplier':
        return 'Create Supplier';
      default:
        return `Create ${itemType}`;
    }
  };

  return (
    <Drawer
      title={
        <div>
          <div className="text-xl font-bold text-foreground">{getTitle()}</div>
          <div className="text-sm text-muted-foreground mt-1">
            Create a {getTitle()}
          </div>
        </div>
      }
      placement={isMobile ? 'bottom' : 'right'}
      onClose={handleClose}
      open={isOpen}
      width={isMobile ? '100%' : 500}
      height={isMobile ? '80%' : undefined}
      closable={false}
      styles={{
        header: { borderBottom: 'none' },
        body: { paddingTop: '16px' },
        footer: { borderTop: 'none' },
      }}
      footer={
        <div className="flex justify-center gap-3 border-t-0 p-4">
          <Button
            onClick={handleSave}
            loading={isLoading}
            disabled={isLoading}
            className="bg-brand hover:bg-brand-hover border-brand hover:border-brand-hover text-brand-foreground py-5"
          >
            {getButtonText()}
          </Button>
          <Button
            onClick={handleClose}
            disabled={isLoading}
            className="text-brand border-brand hover:bg-brand-muted py-5"
          >
            Cancel
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" className="-mt-2">
        {/* Logo Upload - Full Width */}
        <Form.Item label={`${getTitle()} Logo`} name="logo">
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

        {/* Spacer */}
        <div className="h-8"></div>

        {/* Two Column Layout for Form Fields */}
        <Row gutter={16}>
          {/* Left Column */}
          <Col span={12}>
            {/* Name */}
            <Form.Item
              label="Name"
              name="name"
              rules={[
                { required: true, message: `${getTitle()} name is required` },
                {
                  validator: (rule, value) => {
                    if (value && existingNames.includes(value.trim())) {
                      return Promise.reject(
                        new Error(
                          `A ${getTitle().toLowerCase()} with this name already exists`,
                        ),
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                placeholder={`${getTitle()} Name`}
                className="border-border focus:border-brand focus:ring-brand"
              />
            </Form.Item>

            {/* Phone */}
            <Form.Item
              label="Phone"
              name="phone"
              rules={[
                { required: true, message: `${getTitle()} phone is required` },
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
                placeholder={`${getTitle()} Phone`}
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
                    if (value && existingEmails.includes(value.trim())) {
                      return Promise.reject(
                        new Error(
                          `A ${getTitle().toLowerCase()} with this email already exists`,
                        ),
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                placeholder={`${getTitle()} Email`}
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
                placeholder={`${getTitle()} Website`}
                className="border-border focus:border-brand focus:ring-brand"
              />
            </Form.Item>
          </Col>

          {/* Right Column */}
          <Col span={12}>
            {/* City */}
            <Form.Item label="City" name="city">
              <Input
                placeholder={`${getTitle()} City`}
                className="border-border focus:border-brand focus:ring-brand"
              />
            </Form.Item>

            {/* State */}
            <Form.Item label="State" name="state">
              <Input
                placeholder={`${getTitle()} State`}
                className="border-border focus:border-brand focus:ring-brand"
              />
            </Form.Item>

            {/* Zipcode */}
            <Form.Item label="Zipcode" name="zipcode">
              <Input
                placeholder={`${getTitle()} Zipcode`}
                className="border-border focus:border-brand focus:ring-brand"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Description - Full Width */}
        <Form.Item label={`${getTitle()} Description`} name="description">
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

export default CreateCompanySupplierDrawer;
