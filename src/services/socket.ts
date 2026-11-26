import { io } from 'socket.io-client';

export const socket = io(undefined, {
    path: '/socket.io',
    // WebSocket first: live games (Air Hockey) send 60 frames a second, long-polling batches them
    // and adds a round trip. Falls back to polling where WebSocket is blocked.
    transports: ['websocket', 'polling'],
    tryAllTransports: true
});
