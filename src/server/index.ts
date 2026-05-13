import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import simulationRouter from './routes/simulation';
import { setupSocketHandlers } from './socketHandlers';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' },
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());

app.use('/api', simulationRouter);

setupSocketHandlers(io);

if (isProd) {
  const clientPath = path.join(__dirname, '../client');
  app.use(express.static(clientPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`Storm-Response Commander server running on port ${PORT}`);
  if (isProd) {
    console.log(`Serving client from dist/client/`);
  }
});

export default app;
