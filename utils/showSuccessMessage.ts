import NotificationMessage from '@/components/common/notification/notificationMessage';

/**
 * Handles success messages for different types of operations (POST, UPDATE, DELETE).
 *
 * @param {string} method - The HTTP method type (e.g., 'POST', 'PUT', 'DELETE').
 * @param {string} message - The custom success message.
 */
export const handleSuccessMessage = (method: string, message?: string) => {
  if (method === 'POST') {
    NotificationMessage.success({
      message: 'Success',
      description: message || `The item was successfully created.`,
    });
  } else if (method === 'PUT' || method === 'PATCH') {
    NotificationMessage.success({
      message: 'Success',
      description: message || `The item was successfully updated.`,
    });
  } else if (method === 'DELETE') {
    NotificationMessage.success({
      message: 'Success',
      description: message || `The item was successfully deleted.`,
    });
  } else {
    NotificationMessage.success({
      message: 'Success',
      description: message || `Operation completed successfully.`,
    });
  }
};
