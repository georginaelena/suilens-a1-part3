import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { db } from './db';
import { branches, inventory, reservations } from './db/schema';
import { eq, and, sql } from 'drizzle-orm';

const PORT = process.env.PORT || 4004;

const app = new Elysia()
  .use(cors())
  
  // Health check
  .get('/health', () => ({ status: 'ok', service: 'inventory-service' }))
  
  // Get all branches
  .get('/api/branches', async () => {
    return await db.select().from(branches);
  })
  
  // Get stock for a specific lens across all branches
  .get('/api/inventory/lenses/:lensId', async ({ params, set }) => {
    const { lensId } = params;
    
    const stocks = await db
      .select({
        branchCode: inventory.branchCode,
        branchName: branches.name,
        branchAddress: branches.address,
        totalQuantity: inventory.totalQuantity,
        availableQuantity: inventory.availableQuantity,
      })
      .from(inventory)
      .leftJoin(branches, eq(inventory.branchCode, branches.code))
      .where(eq(inventory.lensId, lensId));
    
    if (stocks.length === 0) {
      set.status = 404;
      return { error: 'No inventory found for this lens' };
    }
    
    return stocks;
  }, {
    params: t.Object({
      lensId: t.String(),
    }),
  })
  
  // Reserve stock (called by order-service)
  .post('/api/inventory/reserve', async ({ body, set }) => {
    const { orderId, lensId, branchCode, quantity = 1 } = body;
    
    // Check if already reserved (idempotency)
    const existingReservation = await db
      .select()
      .from(reservations)
      .where(eq(reservations.orderId, orderId))
      .limit(1);
    
    if (existingReservation.length > 0) {
      const reservation = existingReservation[0];
      if (reservation && reservation.status === 'reserved') {
        return {
          reservationId: reservation.id,
          message: 'Already reserved',
          alreadyReserved: true,
        };
      }
    }
    
    // Get current stock
    const stockRecords = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.lensId, lensId),
          eq(inventory.branchCode, branchCode)
        )
      )
      .limit(1);
    
    if (stockRecords.length === 0) {
      set.status = 404;
      return { error: 'Lens not found at this branch' };
    }
    
    const stock = stockRecords[0];
    if (!stock) {
      set.status = 404;
      return { error: 'Stock record not found' };
    }
    
    if (stock.availableQuantity < quantity) {
      set.status = 409;
      return {
        error: `Insufficient stock at branch ${branchCode}`,
        available: stock.availableQuantity,
        requested: quantity,
      };
    }
    
    // Reserve stock (atomic update)
    await db
      .update(inventory)
      .set({
        availableQuantity: sql`${inventory.availableQuantity} - ${quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, stock.id));
    
    // Create reservation record
    const [reservation] = await db
      .insert(reservations)
      .values({
        orderId,
        lensId,
        branchCode,
        quantity,
        status: 'reserved',
      })
      .returning();
    
    if (!reservation) {
      set.status = 500;
      return { error: 'Failed to create reservation' };
    }
    
    console.log(`✅ Reserved ${quantity}x lens ${lensId} at ${branchCode} for order ${orderId}`);
    
    return {
      reservationId: reservation.id,
      message: 'Stock reserved successfully',
      branchCode,
      quantity,
    };
  }, {
    body: t.Object({
      orderId: t.String(),
      lensId: t.String(),
      branchCode: t.String(),
      quantity: t.Optional(t.Number()),
    }),
  })
  
  // Release stock (called when order is cancelled - idempotent)
  .post('/api/inventory/release', async ({ body, set }) => {
    const { orderId } = body;
    
    // Find reservation
    const reservationRecords = await db
      .select()
      .from(reservations)
      .where(eq(reservations.orderId, orderId))
      .limit(1);
    
    if (reservationRecords.length === 0) {
      set.status = 404;
      return { error: 'Reservation not found' };
    }
    
    const reservation = reservationRecords[0];
    if (!reservation) {
      set.status = 404;
      return { error: 'Reservation record not found' };
    }
    
    // Check if already released (idempotency)
    if (reservation.status === 'released') {
      return {
        message: 'Stock already released',
        alreadyReleased: true,
      };
    }
    
    // Release stock (atomic update)
    const stockRecords = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.lensId, reservation.lensId),
          eq(inventory.branchCode, reservation.branchCode)
        )
      )
      .limit(1);
    
    if (stockRecords.length > 0 && stockRecords[0]) {
      await db
        .update(inventory)
        .set({
          availableQuantity: sql`${inventory.availableQuantity} + ${reservation.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, stockRecords[0].id));
    }
    
    // Update reservation status
    await db
      .update(reservations)
      .set({
        status: 'released',
        releasedAt: new Date(),
      })
      .where(eq(reservations.id, reservation.id));
    
    console.log(`✅ Released ${reservation.quantity}x lens ${reservation.lensId} at ${reservation.branchCode} for order ${orderId}`);
    
    return {
      message: 'Stock released successfully',
      branchCode: reservation.branchCode,
      quantity: reservation.quantity,
    };
  }, {
    body: t.Object({
      orderId: t.String(),
    }),
  })
  
  .listen(PORT);

console.log(`🚀 Inventory Service running on port ${app.server?.port}`);
