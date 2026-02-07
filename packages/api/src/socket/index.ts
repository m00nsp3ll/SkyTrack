import { Server, Socket } from 'socket.io';

export const setupSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join room based on role
    socket.on('join:room', (room: string) => {
      socket.join(room);
      console.log(`📥 Socket ${socket.id} joined room: ${room}`);
    });

    // Leave room
    socket.on('leave:room', (room: string) => {
      socket.leave(room);
      console.log(`📤 Socket ${socket.id} left room: ${room}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  // Helper functions for emitting events
  return {
    // Notify specific pilot
    notifyPilot: (pilotId: string, event: string, data: any) => {
      io.to(`pilot:${pilotId}`).emit(event, data);
    },

    // Notify all admins
    notifyAdmins: (event: string, data: any) => {
      io.to('admin').emit(event, data);
    },

    // Notify all media sellers
    notifyMediaSellers: (event: string, data: any) => {
      io.to('media-seller').emit(event, data);
    },

    // Broadcast to all
    broadcast: (event: string, data: any) => {
      io.emit(event, data);
    },
  };
};
