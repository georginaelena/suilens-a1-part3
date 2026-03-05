import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { db } from './db';
import { orders } from './db/schema';
import { eq } from 'drizzle-orm';
import { publishEvent } from './events';

const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:4001';
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:4004';

interface CatalogLens {
  id: string;
  modelName: string;
  manufacturerName: string;
  dayPrice: string;
}

const app = new Elysia()
  .use(cors())
  .post('/api/orders', async ({ body, set }) => {
    // Validate lens exists
    const lensResponse = await fetch(`${CATALOG_SERVICE_URL}/api/lenses/${body.lensId}`);
    if (!lensResponse.ok) {
      set.status = 404;
      return { error: 'Lens not found' };
    }
    const lens = await lensResponse.json() as CatalogLens;

    // Validate dates
    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) {
      set.status = 400;
      return { error: 'End date must be after start date' };
    }
    const totalPrice = (days * parseFloat(lens.dayPrice)).toFixed(2);

    // Create order first (to get orderId)
    const [order] = await db.insert(orders).values({
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      lensId: body.lensId,
      branchCode: body.branchCode,
      lensSnapshot: {
        modelName: lens.modelName,
        manufacturerName: lens.manufacturerName,
        dayPrice: lens.dayPrice,
      },
      startDate: start,
      endDate: end,
      totalPrice,
      status: 'pending',
    }).returning();
    
    if (!order) {
      set.status = 500;
      return { error: 'Failed to create order' };
    }

    // Reserve inventory (synchronous call)
    try {
      const reserveResponse = await fetch(`${INVENTORY_SERVICE_URL}/api/inventory/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          lensId: body.lensId,
          branchCode: body.branchCode,
          quantity: 1,
        }),
      });

      if (!reserveResponse.ok) {
        const error = await reserveResponse.json() as { error?: string };
        // Rollback: delete order
        await db.delete(orders).where(eq(orders.id, order.id));
        set.status = reserveResponse.status;
        return { error: error.error || 'Failed to reserve inventory' };
      }

      // Update order status to confirmed
      await db.update(orders).set({ status: 'confirmed' }).where(eq(orders.id, order.id));

    } catch (error) {
      // Rollback: delete order
      await db.delete(orders).where(eq(orders.id, order.id));
      set.status = 500;
      return { error: 'Inventory service unavailable' };
    }

    // Publish order.placed event
    await publishEvent('order.placed', {
      orderId: order.id,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      lensName: lens.modelName,
      branchCode: body.branchCode,
    });

    set.status = 201;
    return { ...order, status: 'confirmed' };
  }, {
    body: t.Object({
      customerName: t.String(),
      customerEmail: t.String({ format: 'email' }),
      lensId: t.String({ format: 'uuid' }),
      branchCode: t.String(),
      startDate: t.String(),
      endDate: t.String(),
    }),
  })
  .get('/api/orders', async () => db.select().from(orders))
  .get('/api/orders/:id', async ({ params, set }) => {
    const results = await db.select().from(orders).where(eq(orders.id, params.id));
    if (!results[0]) {
      set.status = 404;
      return { error: 'Order not found' };
    }
    return results[0];
  })
  .patch('/api/orders/:id/cancel', async ({ params, set }) => {
    const { id } = params;
    
    // Get order
    const results = await db.select().from(orders).where(eq(orders.id, id));
    if (!results[0]) {
      set.status = 404;
      return { error: 'Order not found' };
    }
    
    const order = results[0];
    
    // Check if already cancelled
    if (order.status === 'cancelled') {
      return { message: 'Order already cancelled', order };
    }
    
    // Update order status
    const [updatedOrder] = await db
      .update(orders)
      .set({ status: 'cancelled' })
      .where(eq(orders.id, id))
      .returning();
    
    // Publish order.cancelled event (async - inventory will release stock)
    await publishEvent('order.cancelled', {
      orderId: id,
      lensId: order.lensId,
      branchCode: order.branchCode,
      quantity: 1,
      timestamp: new Date().toISOString(),
    });
    
    console.log(`✅ Order ${id} cancelled, event published`);
    
    return { message: 'Order cancelled successfully', order: updatedOrder };
  })
  .get('/health', () => ({ status: 'ok', service: 'order-service' }))
  .listen(4002);

console.log(`Order Service running on port ${app.server?.port}`);
