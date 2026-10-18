import { io } from 'socket.io-client';

// One shared connection. Uses the same login cookie (via the Vite proxy / same origin).
export const socket = io({ autoConnect: false });
export const connectSocket = () => socket.connect(); // safe to call repeatedly