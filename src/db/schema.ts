/**
 * Built by Reabot6 from SFG (seofg.xyz)
 * Open-source — github.com/reabot6/hookrelay
 */
import { integer, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export const endpointStatusEnum = pgEnum('status',          ['active', 'inactive']);
export const callbackStatusEnum = pgEnum('callback_status', ['pending', 'delivered', 'failed', 'dead']);

export const userTable = pgTable('user', {
    id:        text('id').primaryKey().default(sqlgen_random_uuid()),
    username:  varchar('username', { length: 255 }).notNull().unique(),
    email:     varchar('email',    { length: 255 }).notNull().unique(),
    password:  varchar('password').notNull(),
    apiKey:    varchar('api_key').unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const endpointTable = pgTable('endpoint', {
    id:              text('id').primaryKey().default(sqlgen_random_uuid()),
    endpointPath:    text('endpoint_path').notNull(),
    secret:          varchar('secret').notNull(),
    status:          endpointStatusEnum('status').notNull().default('active'),
    subscribedEvent: text('subscribed_event').array().notNull(),
    externalSource:  text('external_source').notNull(),
    userId:          text('user_id').notNull().references(() => userTable.id, { onDelete: 'cascade' }),
    createdAt:       timestamp('created_at').defaultNow().notNull(),
    updatedAt:       timestamp('updated_at').defaultNow().notNull(),
});

export const callbackTable = pgTable('callback', {
    id:           text('id').primaryKey().default(sqlgen_random_uuid()),
    status:       callbackStatusEnum('status').notNull().default('pending'),
    responseCode: varchar('response_code'),
    responseBody: text('response_body'),
    attempts:     integer('attempts').default(0).notNull(),
    nextRetry:    timestamp('next_retry', { withTimezone: true, mode: 'string' }),
    payload:      text('payload'),
    eventType:    varchar('event_type').notNull(),
    endpointId:   text('endpoint_id').notNull().references(() => endpointTable.id, { onDelete: 'cascade' }),
    createdAt:    timestamp('created_at').defaultNow().notNull(),
    updatedAt:    timestamp('updated_at').defaultNow().notNull(),
});

export const userRelations = relations(userTable, ({ many }) => ({
    endpoints: many(endpointTable),
}));

export const endpointRelations = relations(endpointTable, ({ one, many }) => ({
    user:      one(userTable, { fields: [endpointTable.userId], references: [userTable.id] }),
    callbacks: many(callbackTable),
}));

export const callbackRelations = relations(callbackTable, ({ one }) => ({
    endpoint: one(endpointTable, { fields: [callbackTable.endpointId], references: [endpointTable.id] }),
}));
