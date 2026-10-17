import { useEffect, useState } from 'react';
import { signalRService, type ConnectionStatus } from '../services/signalr';

/** Live SignalR connection status for UI indicators. */
export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(() => signalRService.getStatus());

  useEffect(() => {
    setStatus(signalRService.getStatus());
    return signalRService.subscribeStatus(setStatus);
  }, []);

  return status;
}
