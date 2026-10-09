import React from 'react';
import { Form, Radio, Space, TimePicker, Select, Checkbox, Input } from 'antd';
import { FieldType } from '@/types/enumTypes';

const DynamicQuestionField = ({
  fieldType,
  fieldOptions,
  name,
  label,
  rules,
}: any) => {
  const renderField = () => {
    switch (fieldType) {
      case FieldType.RADIO:
        return (
          <Radio.Group>
            <Space direction="vertical">
              {fieldOptions.map((option: any) => (
                <Radio key={option.value} value={option.value}>
                  {option.value}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        );
      case FieldType.TIME:
        return <TimePicker format="HH:mm" />;
      case FieldType.DROPDOWN:
        return (
          <Select className="w-full">
            {fieldOptions.map((option: any) => (
              <Select.Option key={option.value} value={option.value}>
                {option.value}
              </Select.Option>
            ))}
          </Select>
        );
      case FieldType.CHECKBOX:
        return <Checkbox.Group options={fieldOptions} />;
      case FieldType.MULTIPLE_CHOICE:
        return (
          <Select mode="multiple" className="w-full">
            {fieldOptions.map((option: any) => (
              <Select.Option key={option.value} value={option.value}>
                {option.value}
              </Select.Option>
            ))}
          </Select>
        );
      case FieldType.SHORT_TEXT:
        return <Input />;
      case FieldType.PARAGRAPH:
        return <Input.TextArea rows={4} />;

      default:
        return <span>Custom Field</span>; // Replace with your TextEditor or another component
    }
  };

  return (
    <Form.Item
      name={name}
      label={label}
      labelCol={{ span: 24 }}
      wrapperCol={{ span: 24 }}
      className="mx-3 mb-8"
      rules={rules}
    >
      {renderField()}
    </Form.Item>
  );
};

export default DynamicQuestionField;
