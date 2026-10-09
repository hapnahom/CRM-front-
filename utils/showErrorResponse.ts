import NotificationMessage from '@/components/common/notification/notificationMessage';
import { message } from 'antd';
import { isForbiddenError } from '@/utils/isForbiddenError';

interface FirebaseError {
  code: string;
}

/**
 * Handles network errors and displays a descriptive notification message.
 * 403 Forbidden is silent — missing permissions should hide features, not notify.
 *
 * @param {any} error - The error object from the Axios request.
 */
export const handleNetworkError = (error: any) => {
  if (isForbiddenError(error)) {
    return;
  }

  if (error?.response) {
    // Server responded with a status code that falls out of the range of 2xx
    const { status, statusText, data } = error.response;

    NotificationMessage.error({
      message: `Error ${status}: ${statusText}`,
      description: `
        ${data?.message ? `Details: ${data.message}` : 'An unexpected error occurred.'}
      `,
    });
  } else if (error?.request) {
    // The request was made but no response was received
    NotificationMessage.error({
      message: 'Network Error',
      description: `
        No response received from the server. Please check your network connection.
      `,
    });
  } else {
    // An error occurred while setting up the request
    NotificationMessage.error({
      message: 'Request Error',
      description: `
        ${error?.message || 'An unexpected error occurred.'}
      `,
    });
  }
};

export const handleFirebaseSignInError = (error: FirebaseError): void => {
  let errorMessage: string;

  switch (error.code) {
    case 'auth/invalid-credential':
      errorMessage = 'Invalid email or password. Please try again.';
      break;
    case 'auth/admin-restricted-operation':
      errorMessage = 'This action requires admin access.';
      break;
    case 'auth/popup-closed-by-user':
      errorMessage = 'Sign-in was canceled. Please try again.';
      break;
    case 'auth/user-not-found':
      errorMessage = 'Account not found. Please check your details.';
      break;
    case 'auth/wrong-password':
      errorMessage = 'Incorrect password. Please try again.';
      break;
    case 'auth/invalid-email':
      errorMessage = 'Please enter a valid email address.';
      break;
    case 'auth/user-disabled':
      errorMessage = 'This account is disabled. Contact support for help.';
      break;
    case 'auth/too-many-requests':
      errorMessage = 'Too many attempts. Please wait a moment and try again.';
      break;
    case 'auth/email-already-in-use':
      errorMessage = 'This email is already registered.';
      break;
    case 'auth/operation-not-allowed':
      errorMessage = 'This sign-in method is not enabled.';
      break;
    case 'auth/id-token-expired':
      errorMessage = 'Session expired. Please sign in again.';
      break;
    case 'auth/id-token-revoked':
      errorMessage = 'Session revoked. Please sign in again.';
      break;
    case 'auth/internal-error':
      errorMessage = 'An error occurred. Please try again later.';
      break;
    case 'auth/network-request-failed':
      errorMessage = 'Network error. Please check your connection.';
      break;
    default:
      errorMessage = 'An error occurred. Please try again.';
  }

  message.error(errorMessage);
};
