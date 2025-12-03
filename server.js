// server.js
require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./src/config/db');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await connectDB();
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.info(`Received ${signal}. Closing server...`);
      server.close(() => {
        console.log('HTTP server closed.');
        // optionally close DB connections here if needed
        process.exit(0);
      });

      // force exit if not closed after timeout
      setTimeout(() => {
        console.error('Forcing shutdown.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
