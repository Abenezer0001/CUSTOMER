import { useContext } from 'react';
import { AuthContext, AuthProvider } from '@/context/AuthContext';

/**
 * Custom hook to use the auth context
 * @returns The auth context
 * @throws Error if used outside of AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthProvider };
export default useAuth;
