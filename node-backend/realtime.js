const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

// admins connect with their jwt; only admins get invoice events
function initRealtime(server) {
  io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL || '*' }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('login required'));
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      if (user.role !== 'admin') return next(new Error('admin only'));
      socket.user = user;
      next();
    } catch {
      next(new Error('bad token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join('admins');
  });
}

function emitToAdmins(event, data) {
  if (io) io.to('admins').emit(event, data);
}

module.exports = { initRealtime, emitToAdmins };
