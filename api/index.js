import express from 'express';
import { registerRoutes } from '../../server/routes.js';
import { createServer } from 'http';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const httpServer = createServer(app);
registerRoutes(httpServer, app);

export default app;
