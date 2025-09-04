<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import TrackCard from './TrackCard.svelte';

	interface Track {
		id: number;
		title: string;
		author: string;
		url: string;
		type: string;
		createdAt: Date;
		isPromoted: boolean;
		promotedDate: Date | null;
		voteCount: number;
		canVote: boolean;
	}

	interface Props {
		title?: string;
		tracks?: Track[];
		isMuted?: boolean;
		onMuteClick?: () => void;
		onSoloClick?: () => void;
		onTrackSelect?: (track: Track) => void;
		mutedTrackIds?: Set<number>;
		selectedTrackId?: number;
		loadingTrackId?: number;
		playingTrackId?: number;
	}

	let {
		title = '',
		tracks = [],
		isMuted = false,
		onMuteClick,
		onSoloClick,
		onTrackSelect,
		mutedTrackIds,
		selectedTrackId,
		loadingTrackId,
		playingTrackId
	}: Props = $props();
</script>

<div class="rounded-lg bg-gray-100 p-4">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-xl font-semibold">{title}</h2>
	</div>

	<!-- Mute/Solo Controls -->
	<div class="mb-4 flex gap-2">
		<button
			class="rounded px-3 py-1 text-sm font-medium transition-colors {isMuted
				? 'bg-red-500 text-white'
				: 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
			onclick={onMuteClick}
		>
			{m.mute()}
		</button>
		<button
			class="rounded bg-yellow-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-yellow-600"
			onclick={onSoloClick}
		>
			{m.solo()}
		</button>
	</div>

	<div class="space-y-3">
		{#each tracks as track (track.id)}
			<TrackCard
				trackName={track.title}
				author={track.author}
				isMuted={mutedTrackIds ? mutedTrackIds.has(track.id) : isMuted}
				isPromoted={track.isPromoted}
				isSelected={selectedTrackId === track.id}
				isLoading={loadingTrackId === track.id}
				isPlaying={playingTrackId === track.id}
				voteCount={track.voteCount}
				canVote={track.canVote}
				trackId={track.id}
				onTrackClick={() => onTrackSelect?.(track)}
			/>
		{:else}
			<div class="text-center text-gray-500 py-8">
				<p>No tracks yet</p>
				<p class="text-sm mt-1">Be the first to submit a track!</p>
			</div>
		{/each}
	</div>
</div>
