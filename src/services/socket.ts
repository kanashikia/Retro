import { io } from 'socket.io-client';

export const socket = io(undefined, {
    path: '/socket.io',
    transports: ['polling', 'websocket']
});
