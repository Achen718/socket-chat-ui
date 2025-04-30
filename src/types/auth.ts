/**
 * Authentication related types
 */
import { User } from './user';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}
