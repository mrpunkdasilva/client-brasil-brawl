import { io } from 'socket.io-client';
import { reactive } from 'vue';
import { clearAuthSession } from '../utils/storage.js';

export const socketState = reactive({
  connected: false,
  onlineUsers: [],
  invites: [],
});

let socket = null;

export const connectSocket = (token) => {
  if (socket) return socket;

  socket = io('http://localhost:5000', {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    socketState.connected = true;
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    socketState.connected = false;
    socketState.onlineUsers = [];
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.log('Socket connection error:', error);
    if (error.message && error.message.includes('jwt')) {
      // Token expired, clear secure storage and redirect
      clearAuthSession();
      window.location.href = '/login';
    }
  });

  socket.on('lobby:onlineUsers', (data) => {
    socketState.onlineUsers = data.users;
  });

  socket.on('invite:received', (data) => {
    socketState.invites.push(data.invite);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};


