'use client';
import { useEffect } from 'react';
import { useUpdateTimeZone } from '@/store/server/features/timesheet/timeZone/mutation';
import { Button, Form, Select } from 'antd';

interface GmtOffsetOption {
  value: string;
  label: string;
}

const gmtOffsets: GmtOffsetOption[] = Array.from(
  { length: 27 },
  (notused, i) => {
    const hour = i - 12;
    const sign = hour >= 0 ? '+' : '-';
    const absHour = Math.abs(hour).toString().padStart(2, '0');

    const minuteOptions: string[] =
      hour === -12 || hour === 14
        ? ['00']
        : [3, 5, 9, 10].includes(hour)
          ? ['00', '30']
          : [5.75, 8.75, 12.75].includes(hour)
            ? ['45']
            : ['00', '15', '30', '45'];

    return minuteOptions.map((min) => ({
      value: `${sign}${absHour}:${min}`,
      label: `GMT ${sign}${absHour}:${min}`,
    }));
  },
).flat();

interface TimezoneComponentProps {
  autoDetectedTimeZone: string;
}

const TimezoneComponent = ({
  autoDetectedTimeZone,
}: TimezoneComponentProps) => {
  const [form] = Form.useForm();
  const { mutate: updateTimeZone, isLoading } = useUpdateTimeZone();

  // Converts time zone like "Africa/Addis_Ababa" to "+03:00"
  const convertTZToOffset = (tzName: string): string | null => {
    try {
      const date = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: tzName,
        hourCycle: 'h23',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'shortOffset',
      };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(date);
      const offset = parts
        .find((p) => p.type === 'timeZoneName')
        ?.value.replace('GMT', '')
        .trim();
      return offset || null;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const offset = convertTZToOffset(autoDetectedTimeZone);
    if (offset) {
      form.setFieldsValue({ timezone: offset });
    }
  }, [autoDetectedTimeZone, form]);

  const handleFinish = (values: any) => {
    updateTimeZone(values);
  };

  return (
    <div className="mt-4">
      <Form form={form} onFinish={handleFinish}>
        <Form.Item
          name="timezone"
          rules={[{ required: true, message: 'Please select your timezone!' }]}
        >
          <Select
            showSearch
            placeholder="Select GMT offset"
            style={{ width: 200 }}
            options={gmtOffsets}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isLoading}>
            Set Timezone
          </Button>
        </Form.Item>
      </Form>
      <hr />
      <div className="text-xl">
        Your Current Timezone:{' '}
        <span className="font-extrabold">{autoDetectedTimeZone}</span>
      </div>
    </div>
  );
};

export default TimezoneComponent;
