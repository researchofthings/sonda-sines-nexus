import { pgTable, serial, varchar, real, timestamp } from 'drizzle-orm/pg-core';

export const values = pgTable('values', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 255 }).notNull(),
  value: real('value').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const currentValues = pgTable('current_values', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: real('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
