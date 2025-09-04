import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { song, user, upvote } from '$lib/server/db/schema';
import { eq, desc, gte, count, sql, and } from 'drizzle-orm';
import { fail, type Actions } from '@sveltejs/kit';
import * as BunnyStorageSDK from '@bunny.net/storage-sdk';
import * as table from '$lib/server/db/schema';
import { bunnyStorageZone } from '$lib/server/bunny';
import { randomUUID } from 'crypto';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ locals }) => {
	// Calculate date for last week
	const oneWeekAgo = new Date();
	oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

	// Calculate today for vote checking
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const tracks = await db
		.select({
			id: song.id,
			title: song.title,
			url: song.url,
			type: song.type,
			createdAt: song.createdAt,
			author: user.username,
			authorId: song.userId,
			isPromoted: song.isPromoted,
			promotedDate: song.promotedDate,
			voteCount: sql<number>`COALESCE(${count(upvote.id)}, 0)`
		})
		.from(song)
		.innerJoin(user, eq(song.userId, user.id))
		.leftJoin(upvote, and(eq(upvote.songId, song.id), gte(upvote.createdAt, oneWeekAgo)))
		.groupBy(song.id, user.username, song.userId)
		.orderBy(
			desc(song.isPromoted),
			desc(sql<number>`COALESCE(${count(upvote.id)}, 0)`),
			desc(song.promotedDate),
			desc(song.createdAt)
		)
		.limit(50);

	// Get user's votes today if user is logged in
	let userVotesToday: Set<number> = new Set();
	if (locals.user) {
		const todayVotes = await db
			.select({ songId: upvote.songId })
			.from(upvote)
			.where(and(eq(upvote.userId, locals.user.id), gte(upvote.createdAt, today)));
		userVotesToday = new Set(todayVotes.map((v) => v.songId));
	}

	// Check if user can vote today (not voted in last 24 hours)
	let canVoteToday = false;
	if (locals.user) {
		const userData = await db
			.select({ lastVoted: user.lastVoted })
			.from(user)
			.where(eq(user.id, locals.user.id));

		if (userData.length > 0 && userData[0].lastVoted) {
			const ONE_DAY = 24 * 60 * 60 * 1000;
			const nextVote = userData[0].lastVoted.valueOf() + ONE_DAY;
			canVoteToday = Date.now() >= nextVote;
		} else {
			canVoteToday = true; // Never voted before
		}
	}

	// Compute canVote for each track
	const tracksWithCanVote = tracks.map((track) => ({
		...track,
		canVote:
			locals.user &&
			!track.isPromoted &&
			track.authorId !== locals.user.id &&
			!userVotesToday.has(track.id) &&
			canVoteToday
	}));

	// Compute canUpload for user
	let canUpload = false;
	if (locals.user) {
		// Check if user can upload (not uploaded in last 24 hours or bypass is enabled)
		if (env.BYPASS_LIMIT_FOR_UPLOAD === 'true') {
			canUpload = true;
		} else {
			const userData = await db
				.select({ lastUpload: table.user.lastUpload })
				.from(table.user)
				.where(eq(table.user.id, locals.user.id));

			if (userData.length > 0 && userData[0].lastUpload) {
				const ONE_DAY = 24 * 60 * 60 * 1000;
				const nextUpload = userData[0].lastUpload.valueOf() + ONE_DAY;
				canUpload = Date.now() >= nextUpload;
			} else {
				canUpload = true; // Never uploaded before
			}
		}
	}

	// Group tracks by type
	const tracksByType = {
		Melody: tracksWithCanVote.filter((track) => track.type === 'Melody'),
		Bass: tracksWithCanVote.filter((track) => track.type === 'Bass'),
		Drum: tracksWithCanVote.filter((track) => track.type === 'Drum'),
		'Other 1': tracksWithCanVote.filter((track) => track.type === 'Other 1'),
		'Other 2': tracksWithCanVote.filter((track) => track.type === 'Other 2')
	};

	return {
		tracksByType,
		user: locals.user,
		session: locals.session,
		canUpload
	};
};

export const actions: Actions = {
	upload: async ({ locals, request }) => {
		if (!locals.session || !locals.user) {
			return fail(401);
		}

		const results = await db.select().from(table.user).where(eq(table.user.id, locals.user.id));

		if (!results || results.length !== 1) {
			return fail(401);
		}

		const [user] = results;

		if (env.BYPASS_LIMIT_FOR_UPLOAD !== 'true') {
			if (user.lastUpload) {
				const ONE_DAY = 24 * 60 * 60 * 1000;
				const nextUpload = user.lastUpload.valueOf() + ONE_DAY;

				console.log({ last: user.lastUpload, nextUpload: new Date(nextUpload), now: new Date() });

				if (Date.now() < nextUpload) {
					return fail(400, {
						upload: { errorCode: 'MAXIMUM_LIMIT', nextUpload }
					});
				}
			}
		}

		const form = await request.formData();

		const name = form.get('title');
		const trackType = form.get('track_type') as 'Melody' | 'Bass' | 'Drum' | 'Other 1' | 'Other 2';
		const files = form.getAll('files') as File[];

		if (!name) {
			return fail(400);
		}

		if (
			trackType !== 'Melody' &&
			trackType !== 'Bass' &&
			trackType !== 'Drum' &&
			trackType !== 'Other 1' &&
			trackType !== 'Other 2'
		) {
			return fail(400);
		}

		if (files.length !== 1) {
			console.error('No file...?', { files });
			return fail(400, {
				upload: { errorCode: 'NO_FILE' }
			});
		}

		const [file] = files;

		const uuid = randomUUID();
		const path = `/${trackType}/${uuid}.mp3`;

		console.log(`Starting upload to ${path}`);

		try {
			const uploadResult = await BunnyStorageSDK.file.upload(
				bunnyStorageZone,
				path,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				file.stream() as any
			);
			if (!uploadResult) {
				return fail(400, {
					upload: { errorCode: 'UPLOAD_FAILED' }
				});
			}
		} catch (error) {
			console.error('Unknown error when uploading: ', error);
			return fail(400, {
				upload: { errorCode: 'UPLOAD_FAILED' }
			});
		}

		console.log(`Finish upload to ${path}`);

		await db
			.update(table.user)
			.set({
				lastUpload: new Date()
			})
			.where(eq(table.user.id, locals.user.id));

		await db.insert(table.song).values({
			userId: locals.user.id,
			title: name.toString(),
			type: trackType,
			url: `https://living-song.b-cdn.net${path}`
		});

		return { upload: { success: true } };
	},

	vote: async ({ locals, request }) => {
		// Check authentication
		if (!locals.session || !locals.user) {
			return fail(401, { vote: { errorCode: 'UNAUTHORIZED' } });
		}

		// Validate user ID exists
		if (!locals.user.id || typeof locals.user.id !== 'string') {
			return fail(400, { vote: { errorCode: 'INVALID_SESSION' } });
		}

		// Check if user can vote today (not voted in last 24 hours)
		const userData = await db
			.select({ lastVoted: user.lastVoted })
			.from(user)
			.where(eq(user.id, locals.user.id));

		if (userData.length > 0 && userData[0].lastVoted) {
			const ONE_DAY = 24 * 60 * 60 * 1000;
			const nextVote = userData[0].lastVoted.valueOf() + ONE_DAY;
			if (Date.now() < nextVote) {
				return fail(429, { vote: { errorCode: 'DAILY_LIMIT_REACHED', nextVote } });
			}
		}

		const formData = await request.formData();
		const songId = Number(formData.get('songId'));

		// Enhanced songId validation
		if (!songId || !Number.isInteger(songId) || songId <= 0) {
			return fail(400, { vote: { errorCode: 'INVALID_SONG_ID' } });
		}

		let songData;
		try {
			// Check if song exists and get its details
			songData = await db.select().from(song).where(eq(song.id, songId));
		} catch (dbError) {
			console.error('Database error fetching song:', dbError);
			return fail(500, { vote: { errorCode: 'DATABASE_ERROR' } });
		}

		if (!songData || songData.length === 0) {
			return fail(404, { vote: { errorCode: 'SONG_NOT_FOUND' } });
		}

		const songRecord = songData[0];

		// Validate song is not promoted
		if (songRecord.isPromoted === true) {
			return fail(403, { vote: { errorCode: 'CANNOT_VOTE_PROMOTED' } });
		}

		// Check if user already voted on this song today
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		let existingVote;
		try {
			existingVote = await db
				.select()
				.from(upvote)
				.where(
					and(
						eq(upvote.userId, locals.user.id),
						eq(upvote.songId, songId),
						gte(upvote.createdAt, today)
					)
				);
		} catch (dbError) {
			console.error('Database error checking existing vote:', dbError);
			return fail(500, { vote: { errorCode: 'DATABASE_ERROR' } });
		}

		if (existingVote && existingVote.length > 0) {
			return fail(409, { vote: { errorCode: 'ALREADY_VOTED_TODAY' } });
		}

		// Additional validation: Check if user is trying to vote on their own song
		if (songRecord.userId === locals.user.id) {
			return fail(403, { vote: { errorCode: 'CANNOT_VOTE_OWN_SONG' } });
		}

		// Add the upvote and update user's lastVoted timestamp
		try {
			await db.transaction(async (tx) => {
				// Insert the upvote
				await tx.insert(upvote).values({
					userId: locals.user!.id,
					songId: songId
				});

				// Update user's lastVoted timestamp
				await tx.update(user).set({ lastVoted: new Date() }).where(eq(user.id, locals.user!.id));
			});
		} catch (dbError) {
			console.error('Database error inserting upvote:', dbError);
			return fail(500, { vote: { errorCode: 'DATABASE_ERROR' } });
		}

		return { vote: { success: true, votedTrackName: songRecord.title } };
	}
};
