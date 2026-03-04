import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

// Branches table
export const branches = pgTable('branches', {
  code: varchar('code', { length: 20 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  address: varchar('address', { length: 500 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Inventory table - tracks stock per lens per branch
export const inventory = pgTable('inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  lensId: uuid('lens_id').notNull(),
  branchCode: varchar('branch_code', { length: 20 }).notNull().references(() => branches.code),
  totalQuantity: integer('total_quantity').notNull().default(0),
  availableQuantity: integer('available_quantity').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Reservations table - for idempotency tracking
export const reservations = pgTable('reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().unique(),
  lensId: uuid('lens_id').notNull(),
  branchCode: varchar('branch_code', { length: 20 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  status: varchar('status', { length: 20 }).notNull().default('reserved'), // reserved, released
  createdAt: timestamp('created_at').defaultNow().notNull(),
  releasedAt: timestamp('released_at'),
});

export type Branch = typeof branches.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
