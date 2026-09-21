require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const { setupSocketIO } = require('./src/sockets/socketHandler');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
  }
});

// Attach io to express app so routes/controllers can emit events
app.set('io', io);

// Initialize socket handlers
setupSocketIO(io);

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` CampusConnect Server running on port ${PORT}`);
  console.log(` API base: http://localhost:${PORT}/api/v1`);
  console.log(` WebSocket server active`);
  console.log(`====================================================`);
});
