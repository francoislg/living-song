<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		trackName?: string;
		author?: string;
		isMuted?: boolean;
		isPromoted?: boolean;
		isSelected?: boolean;
		isLoading?: boolean;
		isPlaying?: boolean;
		voteCount?: number;
		canVote?: boolean;
		trackId?: number;
		onTrackClick?: () => void;
	}

	let {
		trackName = '',
		author = '',
		isMuted = false,
		isPromoted = false,
		isSelected = false,
		isLoading = false,
		isPlaying = false,
		voteCount = 0,
		canVote = false,
		trackId,
		onTrackClick
	}: Props = $props();

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onTrackClick?.();
		}
	}
</script>

<div
	class={[
		'mb-3 cursor-pointer rounded-lg p-4 shadow-sm transition-all hover:shadow-md',
		isMuted ? 'opacity-50' : 'opacity-100',
		isPromoted && 'border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50',
		!isPromoted && 'border border-gray-200 bg-white',
		isSelected && 'ring-opacity-50 ring-4 ring-blue-400',
		isLoading && 'animate-pulse border-2 border-orange-400'
	]}
	onclick={onTrackClick}
	onkeydown={handleKeydown}
	role="button"
	tabindex="0"
>
	<div class="mb-2 flex items-center justify-between">
		<h3 class="truncate text-lg font-semibold">{trackName}</h3>
	</div>
	<p class="mb-3 text-sm text-gray-600">by {author}</p>

	<div class="rounded bg-gray-100 p-3 text-center text-sm">
		{#if isLoading}
			<div class="flex items-center justify-center text-orange-600">
				<div
					class="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"
				></div>
				{m.loading_track()}
			</div>
		{:else if isPlaying}
			<div class="flex items-center justify-center text-blue-600">
				<div class="mr-2 h-3 w-3 animate-pulse rounded-full bg-blue-500"></div>
				{m.playing()}
			</div>
		{:else}
			<div class="flex items-center justify-center text-gray-500">
				<div class="mr-2 h-3 w-3 rounded-full bg-gray-400"></div>
				{m.ready()}
			</div>
		{/if}
	</div>

	{#if !isPromoted}
		<div class="mt-3 flex justify-center">
			{#if canVote && isSelected}
				<form method="POST" action="?/vote" class="contents">
					<input type="hidden" name="songId" value={trackId} />
					<button
						type="submit"
						class="flex items-center gap-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-600 transition-all hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm"
						onclick={(e) => e.stopPropagation()}
						title="Vote for this track"
					>
						👍 {voteCount}
						{voteCount === 1 ? 'vote' : 'votes'}
					</button>
				</form>
			{:else}
				<div class="flex items-center gap-1 px-3 py-2 text-sm text-gray-400">
					👍 {voteCount}
					{voteCount === 1 ? 'vote' : 'votes'}
				</div>
			{/if}
		</div>
	{/if}
</div>
