/**
 * User related types
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  status: 'online' | 'offline' | 'away';
  createdAt: Date | string;
  updatedAt: Date | string;
}
