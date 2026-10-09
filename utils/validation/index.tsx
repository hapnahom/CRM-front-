import dayjs, { Dayjs } from 'dayjs';

export const validatePhoneNumber = (value: string): string | null => {
  if (!value) {
    return 'Phone Number is required.';
  }
  return null;
};

export const validateEmailURL = (rule: any, value: any) => {
  if (!value) {
    return Promise.reject(new Error('Please enter an email address'));
  }

  // Regular expression to validate basic email format
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$/;

  // Check if the email matches the basic pattern
  if (!emailPattern.test(value)) {
    return Promise.reject(new Error('Email must be in a valid format'));
  }

  // Split the email into local and domain parts
  const domainPart = value.split('@')[1];

  if (!domainPart) {
    return Promise.reject(new Error('Email must contain a domain part'));
  }

  // Count the number of `.com` occurrences in the domain part
  const comCount = (domainPart.match(/\.com/g) || []).length;

  if (comCount > 1) {
    return Promise.reject(
      new Error('Email domain must end with a single .com'),
    );
  }

  // Ensure the domain ends with `.com` if there is exactly one `.com`
  const domainEndingPattern = /\.com$/;
  if (!domainEndingPattern.test(domainPart)) {
    return Promise.reject(
      new Error('Email domain must end with a single .com'),
    );
  }

  return Promise.resolve();
};

// validation.ts

// Function to validate name
export const validateName = (
  key: string,
  name: string,
  isRequire?: boolean,
): string | null => {
  if (isRequire === false) {
    return '';
  }
  if (!name) {
    return `${key} is required.`;
  }

  // Check if the name length is between 3 and 20 characters
  if (name.length < 3 || name.length > 20) {
    return `${key} must be between 3 and 20 characters long.`;
  }

  // Allow only alphabetic characters and spaces
  const regex = /^[A-Za-z\s]+$/;

  if (!regex.test(name)) {
    return `${key} must contain only alphabetic characters and spaces.`;
  }

  return null;
};

// Function to validate email
export const validateEmail = (email: string): string | null => {
  if (!email) {
    return 'Email is required.';
  }
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email) || email.split('@')[1].split('.').length !== 2) {
    return 'Invalid email format. Email must contain only one dot after @.';
  }
  return null;
};

export const disabledDate = (current: Dayjs) => {
  // Can not select days before today
  return current && current.isBefore(dayjs().startOf('day'));
};
