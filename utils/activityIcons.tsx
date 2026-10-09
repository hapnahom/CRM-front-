/**
 * Activity icon utilities for the CRM application
 * Centralized activity icon definitions and related functions
 */

import React from 'react';
import {
  FiPhone,
  FiMail,
  FiSettings,
  FiUpload,
  FiInfo,
  FiBookOpen, // Using as a substitute for the "101" icon
  FiShoppingCart,
  FiHelpCircle,
  FiThumbsUp,
  FiPaperclip,
  FiSearch,
  FiSun,
} from 'react-icons/fi';
//import { FaHandHoldingHeart, FaShare } from 'react-icons/fa';
import { PiShareFatBold } from 'react-icons/pi';
// import { BsChatDots } from 'react-icons/bs';
import { TbMessage2 } from 'react-icons/tb';
import { LiaHandsHelpingSolid } from 'react-icons/lia';

import { HiOutlineReceiptPercent } from 'react-icons/hi2';
import { IoTrendingUp } from 'react-icons/io5';
import { GiProgression } from 'react-icons/gi';

// Interface for activity icon structure
export interface ActivityIcon {
  key: string;
  icon: React.ReactNode;
  label: string;
}

// Predefined activity icons for lead and deal activities
export const activityIcons: ActivityIcon[] = [
  // Row 1
  { key: 'FiPhone', icon: <FiPhone />, label: 'Phone' },
  { key: 'FiMail', icon: <FiMail />, label: 'Email' },
  {
    key: 'LiaHandsHelpingSolid',
    icon: <LiaHandsHelpingSolid />,
    label: 'Support',
  },
  { key: 'FiSettings', icon: <FiSettings />, label: 'Settings' },
  { key: 'FiUpload', icon: <FiUpload />, label: 'Upload' },
  { key: 'PiShareFatBold', icon: <PiShareFatBold />, label: 'Share' },

  // Row 2
  { key: 'TbMessage2', icon: <TbMessage2 />, label: 'Chat' },
  { key: 'FiInfo', icon: <FiInfo />, label: 'Info' },
  { key: 'FiBookOpen', icon: <FiBookOpen />, label: 'Learn' },
  { key: 'FiShoppingCart', icon: <FiShoppingCart />, label: 'Shopping Cart' },
  {
    key: 'HiOutlineReceiptPercent',
    icon: <HiOutlineReceiptPercent />,
    label: 'Discount',
  },
  { key: 'FiHelpCircle', icon: <FiHelpCircle />, label: 'Help' },

  // Row 3
  { key: 'IoTrendingUp', icon: <IoTrendingUp />, label: 'Growth' },
  { key: 'FiThumbsUp', icon: <FiThumbsUp />, label: 'Like' },
  { key: 'FiPaperclip', icon: <FiPaperclip />, label: 'Attachment' },
  { key: 'GiProgression ', icon: <GiProgression />, label: 'Analytics' },
  { key: 'FiSearch', icon: <FiSearch />, label: 'Search' },
  { key: 'FiSun', icon: <FiSun />, label: 'Light Mode' },
];

// Default icon for new activities
export const defaultActivityIcon = 'FiPhone';

// Utility function to get an icon by its key
export const getIconByKey = (key: string): ActivityIcon | undefined => {
  return activityIcons.find((icon) => icon.key === key);
};

// Utility function to get the default icon object
export const getDefaultIcon = (): ActivityIcon => {
  return getIconByKey(defaultActivityIcon) || activityIcons[0];
};

// Utility function to check if an icon key is valid
export const isValidIconKey = (key: string): boolean => {
  return activityIcons.some((icon) => icon.key === key);
};

// Utility function to get all icon keys
export const getAllIconKeys = (): string[] => {
  return activityIcons.map((icon) => icon.key);
};
