import { useMemo } from 'react';
import { formatUserName } from '@/lib/format-user-name';
import { useGetUsers } from '@/store/server/features/leads/users/queries';

/**
 * Custom hook to get user names by ID
 * Returns a function that maps user IDs to full names
 */
export const useUserNames = () => {
  const { data: usersData } = useGetUsers();

  // Create a user lookup map
  const userMap = useMemo(() => {
    if (!usersData) return new Map();
    return new Map(
      usersData.map((user) => [user.id, formatUserName(user, user.id)]),
    );
  }, [usersData]);

  // Helper function to get user name from ID
  const getUserName = (userId: string): string => {
    return userMap.get(userId) || userId; // Fallback to ID if name not found
  };

  return {
    getUserName,
    userMap,
    users: usersData || [],
    isLoading: !usersData,
  };
};
