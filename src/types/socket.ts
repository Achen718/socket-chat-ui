/**
 * Socket related types
 */
export interface SocketState {
  connected: boolean;
  typing: {
    [userId: string]: boolean;
  };
}
