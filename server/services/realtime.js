/** Holds the Socket.io instance so controllers can push events without importing the server. */
let io = null;

module.exports = {
  setIO(instance) {
    io = instance;
  },
  /** Emits to every open tab of a user. Silently no-ops when sockets are not running (e.g. in tests). */
  emitToUser(userId, event, payload) {
    if (io) io.to(`user:${userId}`).emit(event, payload);
  },
  broadcast(event, payload) {
    if (io) io.emit(event, payload);
  },
  isOnline(userId) {
    return !!io && (io.sockets.adapter.rooms.get(`user:${userId}`)?.size || 0) > 0;
  },
};
