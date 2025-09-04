<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import TracksColumn from './TracksColumn.svelte';

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

	interface TracksByType {
		Drum: Track[];
		Bass: Track[];
		Melody: Track[];
		'Other 1': Track[];
		'Other 2': Track[];
	}

	interface Props {
		tracksByType: TracksByType;
		handleTrackSelect: (trackType: string, trackUrl: string | undefined) => void;
		handleMute: (trackType: string, isMuted: boolean) => void;
		selectedTracks: {
			drum?: string;
			bass?: string;
			melody?: string;
			other1?: string;
			other2?: string;
		};
		mutedTracks: Set<string>;
		loadingTracks: Set<string>;
		playingTracks: Set<string>;
	}

	let {
		tracksByType,
		handleTrackSelect,
		handleMute,
		selectedTracks,
		mutedTracks,
		loadingTracks,
		playingTracks
	}: Props = $props();

	function handleMuteToggle(trackType: string) {
		const isMuted = mutedTracks.has(trackType);
		handleMute(trackType, !isMuted);
	}

	function handleSolo(trackType: string) {
		const allTypes = ['drum', 'bass', 'melody', 'other1', 'other2'];
		const unmutedTypes = allTypes.filter((type) => !mutedTracks.has(type));

		if (unmutedTypes.length === 1 && unmutedTypes[0] === trackType) {
			allTypes.forEach((type) => handleMute(type, false));
		} else {
			allTypes.forEach((type) => handleMute(type, type !== trackType));
		}
	}

	function handleTrackSelectLocal(trackType: string, track: Track) {
		const currentSelectedUrl = selectedTracks[trackType as keyof typeof selectedTracks];

		if (currentSelectedUrl !== track.url) {
			handleTrackSelect(trackType, track.url);
		}
	}

	// Helper function to find track ID by URL in a track list
	function findTrackIdByUrl(tracks: Track[], url: string | undefined): number | undefined {
		if (!url) return undefined;
		return tracks.find((track) => track.url === url)?.id;
	}

	// Helper function to get muted track IDs for a track type
	function getMutedTrackIds(tracks: Track[], trackType: string): Set<number> {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const mutedIds = new Set<number>();
		const columnMuted = mutedTracks.has(trackType);
		const selectedTrackUrl = selectedTracks[trackType as keyof typeof selectedTracks];

		if (columnMuted) {
			// If column is muted, add all track IDs
			tracks.forEach((track) => mutedIds.add(track.id));
		} else if (selectedTrackUrl) {
			// If there's a selected track, mute all others in this column
			tracks.forEach((track) => {
				if (track.url !== selectedTrackUrl) {
					mutedIds.add(track.id);
				}
			});
		}

		return mutedIds;
	}

	// Derived values for each track type
	let drumMutedTrackIds = $derived(getMutedTrackIds(tracksByType.Drum, 'drum'));
	let bassMutedTrackIds = $derived(getMutedTrackIds(tracksByType.Bass, 'bass'));
	let melodyMutedTrackIds = $derived(getMutedTrackIds(tracksByType.Melody, 'melody'));
	let other1MutedTrackIds = $derived(getMutedTrackIds(tracksByType['Other 1'], 'other1'));
	let other2MutedTrackIds = $derived(getMutedTrackIds(tracksByType['Other 2'], 'other2'));

	let drumSelectedTrackId = $derived(findTrackIdByUrl(tracksByType.Drum, selectedTracks.drum));
	let bassSelectedTrackId = $derived(findTrackIdByUrl(tracksByType.Bass, selectedTracks.bass));
	let melodySelectedTrackId = $derived(
		findTrackIdByUrl(tracksByType.Melody, selectedTracks.melody)
	);
	let other1SelectedTrackId = $derived(
		findTrackIdByUrl(tracksByType['Other 1'], selectedTracks.other1)
	);
	let other2SelectedTrackId = $derived(
		findTrackIdByUrl(tracksByType['Other 2'], selectedTracks.other2)
	);

	let drumLoadingTrackId = $derived(loadingTracks.has('drum') ? drumSelectedTrackId : undefined);
	let bassLoadingTrackId = $derived(loadingTracks.has('bass') ? bassSelectedTrackId : undefined);
	let melodyLoadingTrackId = $derived(
		loadingTracks.has('melody') ? melodySelectedTrackId : undefined
	);
	let other1LoadingTrackId = $derived(
		loadingTracks.has('other1') ? other1SelectedTrackId : undefined
	);
	let other2LoadingTrackId = $derived(
		loadingTracks.has('other2') ? other2SelectedTrackId : undefined
	);

	let drumPlayingTrackId = $derived(playingTracks.has('drum') ? drumSelectedTrackId : undefined);
	let bassPlayingTrackId = $derived(playingTracks.has('bass') ? bassSelectedTrackId : undefined);
	let melodyPlayingTrackId = $derived(
		playingTracks.has('melody') ? melodySelectedTrackId : undefined
	);
	let other1PlayingTrackId = $derived(
		playingTracks.has('other1') ? other1SelectedTrackId : undefined
	);
	let other2PlayingTrackId = $derived(
		playingTracks.has('other2') ? other2SelectedTrackId : undefined
	);
</script>

<div>
	<div class="flex gap-4 overflow-x-auto lg:grid lg:grid-cols-5">
		<TracksColumn
			title={m.tracks_drums()}
			tracks={tracksByType.Drum}
			isMuted={mutedTracks.has('drum')}
			onMuteClick={() => handleMuteToggle('drum')}
			onSoloClick={() => handleSolo('drum')}
			onTrackSelect={(track) => handleTrackSelectLocal('drum', track)}
			mutedTrackIds={drumMutedTrackIds}
			selectedTrackId={drumSelectedTrackId}
			loadingTrackId={drumLoadingTrackId}
			playingTrackId={drumPlayingTrackId}
		></TracksColumn>

		<TracksColumn
			title={m.tracks_bass()}
			tracks={tracksByType.Bass}
			isMuted={mutedTracks.has('bass')}
			onMuteClick={() => handleMuteToggle('bass')}
			onSoloClick={() => handleSolo('bass')}
			onTrackSelect={(track) => handleTrackSelectLocal('bass', track)}
			mutedTrackIds={bassMutedTrackIds}
			selectedTrackId={bassSelectedTrackId}
			loadingTrackId={bassLoadingTrackId}
			playingTrackId={bassPlayingTrackId}
		></TracksColumn>

		<TracksColumn
			title={m.tracks_melody()}
			tracks={tracksByType.Melody}
			isMuted={mutedTracks.has('melody')}
			onMuteClick={() => handleMuteToggle('melody')}
			onSoloClick={() => handleSolo('melody')}
			onTrackSelect={(track) => handleTrackSelectLocal('melody', track)}
			mutedTrackIds={melodyMutedTrackIds}
			selectedTrackId={melodySelectedTrackId}
			loadingTrackId={melodyLoadingTrackId}
			playingTrackId={melodyPlayingTrackId}
		></TracksColumn>

		<TracksColumn
			title={m.tracks_other1()}
			tracks={tracksByType['Other 1']}
			isMuted={mutedTracks.has('other1')}
			onMuteClick={() => handleMuteToggle('other1')}
			onSoloClick={() => handleSolo('other1')}
			onTrackSelect={(track) => handleTrackSelectLocal('other1', track)}
			mutedTrackIds={other1MutedTrackIds}
			selectedTrackId={other1SelectedTrackId}
			loadingTrackId={other1LoadingTrackId}
			playingTrackId={other1PlayingTrackId}
		></TracksColumn>

		<TracksColumn
			title={m.tracks_other2()}
			tracks={tracksByType['Other 2']}
			isMuted={mutedTracks.has('other2')}
			onMuteClick={() => handleMuteToggle('other2')}
			onSoloClick={() => handleSolo('other2')}
			onTrackSelect={(track) => handleTrackSelectLocal('other2', track)}
			mutedTrackIds={other2MutedTrackIds}
			selectedTrackId={other2SelectedTrackId}
			loadingTrackId={other2LoadingTrackId}
			playingTrackId={other2PlayingTrackId}
		></TracksColumn>
	</div>
</div>
