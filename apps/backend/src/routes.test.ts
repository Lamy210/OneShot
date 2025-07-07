import request from 'supertest';
import express from 'express';
import { appRouter, registerRestEndpoints } from './routes';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createContext } from './context';

describe('API endpoints', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/trpc', createExpressMiddleware({ router: appRouter, createContext }));
  registerRestEndpoints(app);

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/payment/checkout returns dummy intent', async () => {
    const res = await request(app).post('/api/payment/checkout').send({ postId: 'test' });
    expect(res.status).toBe(200);
    expect(res.body.paymentIntentId).toBeDefined();
    expect(res.body.clientSecret).toBeDefined();
  });

  // tRPC posts.list
  it('POST /api/trpc/posts.list returns posts', async () => {
    const res = await request(app)
      .post('/api/trpc/posts.list')
      .send({ category: '', limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('result');
  });
}); 