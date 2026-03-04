
import { Elysia } from 'elysia';
import { startConsumer } from './consumer';
const app = new Elysia()
  .get('/health', () => ({ status: 'ok', service: 'notification-service' }))
  .listen(4003);
startConsumer().catch(console.error);
console.log(`Notification Service running on port ${app.server?.port}`);