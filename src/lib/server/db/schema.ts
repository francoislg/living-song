import { pgTable, serial, integer, text, timestamp, pgEnum, boolean } from 'drizzle-orm/pg-core';

export const songTypeEnum = pgEnum('song_type', ['Melody', 'Bass', 'Drum', 'Other 1', 'Other 2']);

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	age: integer('age'),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	lastUpload: timestamp('lastUpload', { withTimezone: true, mode: 'date' }),
	lastVoted: timestamp('lastVoted', { withTimezone: true, mode: 'date' })
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

export const song = pgTable('song', {
	id: serial('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	title: text('title').notNull(),
	url: text('url').notNull(),
	type: songTypeEnum('type').notNull(),
	isPromoted: boolean('is_promoted').notNull().default(false),
	promotedDate: timestamp('promoted_date', { withTimezone: true, mode: 'date' }),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

export const upvote = pgTable('upvote', {
	id: serial('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	songId: integer('song_id')
		.notNull()
		.references(() => song.id),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;

export type Song = typeof song.$inferSelect;

export type Upvote = typeof upvote.$inferSelect;
