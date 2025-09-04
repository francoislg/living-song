<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import TrackContainer from '$lib/components/TrackContainer.svelte';
	import UploadSection from '$lib/components/UploadSection.svelte';

	let { data, form } = $props();

	// Web Audio API setup
	let audioContext: AudioContext | undefined = $state();
	let masterGainNode: GainNode | undefined = $state();
	let audioBuffers = $state(new Map<string, AudioBuffer>());
	let audioSources = $state(new Map<string, AudioBufferSourceNode>());
	let drumGainNode: GainNode | undefined = $state();
	let bassGainNode: GainNode | undefined = $state();
	let melodyGainNode: GainNode | undefined = $state();
	let other1GainNode: GainNode | undefined = $state();
	let other2GainNode: GainNode | undefined = $state();

	// Track selection state
	let selectedDrumUrl: string | undefined = $state();
	let selectedBassUrl: string | undefined = $state();
	let selectedMelodyUrl: string | undefined = $state();
	let selectedOther1Url: string | undefined = $state();
	let selectedOther2Url: string | undefined = $state();

	// Mute state
	let isDrumMuted = $state(false);
	let isBassMuted = $state(false);
	let isMelodyMuted = $state(false);
	let isOther1Muted = $state(false);
	let isOther2Muted = $state(false);

	// Loading state
	let isDrumLoading = $state(false);
	let isBassLoading = $state(false);
	let isMelodyLoading = $state(false);
	let isOther1Loading = $state(false);
	let isOther2Loading = $state(false);

	// Initialize promoted tracks
	function initializePromotedTracks() {
		const drumPromoted = data.tracksByType.Drum?.find((track) => track.isPromoted);
		if (drumPromoted) selectedDrumUrl = drumPromoted.url;

		const bassPromoted = data.tracksByType.Bass?.find((track) => track.isPromoted);
		if (bassPromoted) selectedBassUrl = bassPromoted.url;

		const melodyPromoted = data.tracksByType.Melody?.find((track) => track.isPromoted);
		if (melodyPromoted) selectedMelodyUrl = melodyPromoted.url;

		const other1Promoted = data.tracksByType['Other 1']?.find((track) => track.isPromoted);
		if (other1Promoted) selectedOther1Url = other1Promoted.url;

		const other2Promoted = data.tracksByType['Other 2']?.find((track) => track.isPromoted);
		if (other2Promoted) selectedOther2Url = other2Promoted.url;
	}

	// Initialize on component mount
	initializePromotedTracks();

	// Derived values
	let selectedTracks = $derived({
		drum: selectedDrumUrl,
		bass: selectedBassUrl,
		melody: selectedMelodyUrl,
		other1: selectedOther1Url,
		other2: selectedOther2Url
	});

	let mutedTracks = $derived(
		new Set([
			...(isDrumMuted ? ['drum'] : []),
			...(isBassMuted ? ['bass'] : []),
			...(isMelodyMuted ? ['melody'] : []),
			...(isOther1Muted ? ['other1'] : []),
			...(isOther2Muted ? ['other2'] : [])
		])
	);

	let loadingTracks = $derived(
		new Set([
			...(isDrumLoading ? ['drum'] : []),
			...(isBassLoading ? ['bass'] : []),
			...(isMelodyLoading ? ['melody'] : []),
			...(isOther1Loading ? ['other1'] : []),
			...(isOther2Loading ? ['other2'] : [])
		])
	);

	let isAnyTrackLoading = $derived(loadingTracks.size > 0);

	let trackGainNodes = $derived({
		drum: drumGainNode,
		bass: bassGainNode,
		melody: melodyGainNode,
		other1: other1GainNode,
		other2: other2GainNode
	});
	let isPlaying = $state(false);
	let playingTracks = $state(new Set<string>());
	let currentTime = $state(0);
	let intervalId: number | undefined = $state();
	let startTime = 0;

	async function initializeAudioContext() {
		if (!audioContext) {
			audioContext = new AudioContext();
			masterGainNode = audioContext.createGain();
			masterGainNode.connect(audioContext.destination);

			// Create gain nodes for each track type
			drumGainNode = audioContext.createGain();
			bassGainNode = audioContext.createGain();
			melodyGainNode = audioContext.createGain();
			other1GainNode = audioContext.createGain();
			other2GainNode = audioContext.createGain();

			// Connect all gain nodes to master
			if (masterGainNode) {
				drumGainNode?.connect(masterGainNode);
				bassGainNode?.connect(masterGainNode);
				melodyGainNode?.connect(masterGainNode);
				other1GainNode?.connect(masterGainNode);
				other2GainNode?.connect(masterGainNode);
			}
		}
	}

	async function loadAudioBuffer(url: string): Promise<AudioBuffer> {
		if (audioBuffers.has(url)) {
			return audioBuffers.get(url)!;
		}

		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();

		if (!audioContext) await initializeAudioContext();
		const audioBuffer = await audioContext!.decodeAudioData(arrayBuffer);

		audioBuffers.set(url, audioBuffer);
		return audioBuffer;
	}

	async function startAll() {
		await initializeAudioContext();

		if (isPlaying) {
			// Stop all current sources
			audioSources.forEach((source) => {
				source.stop();
			});
			audioSources.clear();
			isPlaying = false;
			if (intervalId) {
				window.clearInterval(intervalId);
				intervalId = undefined;
			}
		} else {
			// Wait for all tracks to load before starting playback
			const loadPromises: Promise<void>[] = [];

			// Load all selected tracks first
			for (const [trackType, url] of Object.entries(selectedTracks)) {
				if (url && !mutedTracks.has(trackType)) {
					setTrackLoading(trackType, true);
					const promise = (async () => {
						try {
							await loadAudioBuffer(url);
						} catch (error) {
							console.error(`Error loading ${trackType}:`, error);
						} finally {
							setTrackLoading(trackType, false);
						}
					})();
					loadPromises.push(promise);
				}
			}

			// Wait for all tracks to finish loading
			await Promise.all(loadPromises);

			// Now start playback
			isPlaying = true;
			playingTracks.clear();
			startTime = audioContext!.currentTime - currentTime;

			// Create and start sources for selected tracks
			for (const [trackType, url] of Object.entries(selectedTracks)) {
				if (url && !mutedTracks.has(trackType)) {
					try {
						const buffer = await loadAudioBuffer(url);
						const source = audioContext!.createBufferSource();
						source.buffer = buffer;

						const gainNode = trackGainNodes[trackType as keyof typeof trackGainNodes];
						if (gainNode) {
							source.connect(gainNode);
							source.start(0, currentTime);
							audioSources.set(trackType, source);
							playingTracks.add(trackType);
						}
					} catch (error) {
						console.error(`Error loading ${trackType}:`, error);
					}
				}
			}

			// Start time tracking
			intervalId = window.setInterval(() => {
				if (audioContext) {
					currentTime = audioContext.currentTime - startTime;
					if (currentTime >= 60) {
						stopAll();
					}
				}
			}, 100);
		}
	}

	function stopAll() {
		// Stop all current sources
		audioSources.forEach((source) => {
			source.stop();
		});
		audioSources.clear();
		playingTracks.clear();
		isPlaying = false;
		currentTime = 0;
		if (intervalId) {
			window.clearInterval(intervalId);
			intervalId = undefined;
		}
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function setTrackLoading(trackType: string, loading: boolean) {
		if (trackType === 'drum') isDrumLoading = loading;
		else if (trackType === 'bass') isBassLoading = loading;
		else if (trackType === 'melody') isMelodyLoading = loading;
		else if (trackType === 'other1') isOther1Loading = loading;
		else if (trackType === 'other2') isOther2Loading = loading;
	}

	async function handleTrackSelect(trackType: string, trackUrl: string | undefined) {
		if (trackType === 'drum') selectedDrumUrl = trackUrl;
		else if (trackType === 'bass') selectedBassUrl = trackUrl;
		else if (trackType === 'melody') selectedMelodyUrl = trackUrl;
		else if (trackType === 'other1') selectedOther1Url = trackUrl;
		else if (trackType === 'other2') selectedOther2Url = trackUrl;

		if (!trackUrl) return;

		if (isPlaying) {
			await hotSwapTrack(trackType, trackUrl);
		} else {
			// Set loading state and load track
			setTrackLoading(trackType, true);
			try {
				await loadAudioBuffer(trackUrl);
			} catch (error) {
				console.error(`Error loading ${trackType}:`, error);
			} finally {
				setTrackLoading(trackType, false);
			}
		}
	}

	async function hotSwapTrack(trackType: string, trackUrl: string) {
		setTrackLoading(trackType, true);
		try {
			// Load the new track
			const buffer = await loadAudioBuffer(trackUrl);

			// Stop the current source for this track type if it exists
			const currentSource = audioSources.get(trackType);
			if (currentSource) {
				currentSource.stop();
				audioSources.delete(trackType);
				playingTracks.delete(trackType);
			}

			// Don't start new track if it's muted
			if (mutedTracks.has(trackType)) {
				return;
			}

			// Create and start the new source at the current playback time
			if (!audioContext) return;

			const newSource = audioContext.createBufferSource();
			newSource.buffer = buffer;

			const gainNode = trackGainNodes[trackType as keyof typeof trackGainNodes];
			if (gainNode) {
				newSource.connect(gainNode);

				// Start from current time position
				const currentPlaybackTime = audioContext.currentTime - startTime;
				newSource.start(0, Math.max(0, currentPlaybackTime));
				audioSources.set(trackType, newSource);
				playingTracks.add(trackType);
			}
		} catch (error) {
			console.error(`Error hot-swapping ${trackType}:`, error);
		} finally {
			setTrackLoading(trackType, false);
		}
	}

	function handleMute(trackType: string, isMuted: boolean) {
		if (trackType === 'drum') isDrumMuted = isMuted;
		else if (trackType === 'bass') isBassMuted = isMuted;
		else if (trackType === 'melody') isMelodyMuted = isMuted;
		else if (trackType === 'other1') isOther1Muted = isMuted;
		else if (trackType === 'other2') isOther2Muted = isMuted;

		const gainNode = trackGainNodes[trackType as keyof typeof trackGainNodes];
		if (gainNode) gainNode.gain.value = isMuted ? 0 : 1;
	}

	async function downloadMix() {
		await initializeAudioContext();
		if (!audioContext) return;

		// Create an offline audio context for rendering
		const offlineContext = new OfflineAudioContext(2, 44100 * 60, 44100); // 2 channels, 60 seconds, 44.1kHz
		const offlineMasterGain = offlineContext.createGain();
		offlineMasterGain.connect(offlineContext.destination);

		// Load and mix all selected tracks
		const mixPromises: Promise<void>[] = [];

		for (const [trackType, url] of Object.entries(selectedTracks)) {
			if (url && !mutedTracks.has(trackType)) {
				const promise = (async () => {
					try {
						const buffer = await loadAudioBuffer(url);
						const source = offlineContext.createBufferSource();
						const gainNode = offlineContext.createGain();

						source.buffer = buffer;
						source.connect(gainNode);
						gainNode.connect(offlineMasterGain);

						// Apply muting
						gainNode.gain.value = mutedTracks.has(trackType) ? 0 : 1;

						source.start(0);
					} catch (error) {
						console.error(`Error loading ${trackType} for mix:`, error);
					}
				})();
				mixPromises.push(promise);
			}
		}

		await Promise.all(mixPromises);

		// Render the audio
		try {
			const renderedBuffer = await offlineContext.startRendering();

			// Convert AudioBuffer to WAV blob
			const wavBlob = audioBufferToWav(renderedBuffer);

			// Create download link
			const url = URL.createObjectURL(wavBlob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'living-song-mix.wav';
			a.click();

			// Cleanup
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Error rendering mix:', error);
		}
	}

	// Convert AudioBuffer to WAV blob
	function audioBufferToWav(buffer: AudioBuffer): Blob {
		const length = buffer.length;
		const numberOfChannels = buffer.numberOfChannels;
		const sampleRate = buffer.sampleRate;
		const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
		const view = new DataView(arrayBuffer);

		// Write WAV header
		const writeString = (offset: number, string: string) => {
			for (let i = 0; i < string.length; i++) {
				view.setUint8(offset + i, string.charCodeAt(i));
			}
		};

		writeString(0, 'RIFF');
		view.setUint32(4, 36 + length * numberOfChannels * 2, true);
		writeString(8, 'WAVE');
		writeString(12, 'fmt ');
		view.setUint32(16, 16, true);
		view.setUint16(20, 1, true);
		view.setUint16(22, numberOfChannels, true);
		view.setUint32(24, sampleRate, true);
		view.setUint32(28, sampleRate * numberOfChannels * 2, true);
		view.setUint16(32, numberOfChannels * 2, true);
		view.setUint16(34, 16, true);
		writeString(36, 'data');
		view.setUint32(40, length * numberOfChannels * 2, true);

		// Write audio data
		let offset = 44;
		for (let i = 0; i < length; i++) {
			for (let channel = 0; channel < numberOfChannels; channel++) {
				const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
				view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
				offset += 2;
			}
		}

		return new Blob([arrayBuffer], { type: 'audio/wav' });
	}
</script>

<div class="container mx-auto p-4">
	<header class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Living Song</h1>
		{#if data.user}
			<div class="text-lg font-medium">
				Welcome, {data.user.username}
			</div>
		{:else}
			<button class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
				{m.login()}
			</button>
		{/if}
	</header>

	<!-- Vote Success Message -->
	{#if form?.vote?.success}
		<div class="mb-6 flex justify-center">
			<div
				class="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700"
			>
				<div class="text-lg">🎉</div>
				<span class="text-sm font-medium">
					You voted for "{form.vote.votedTrackName}"!
				</span>
			</div>
		</div>
	{/if}

	<!-- Vote Error Message -->
	{#if form?.vote?.errorCode}
		<div class="mb-6 flex justify-center">
			<div
				class="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700"
			>
				<div class="text-lg">❌</div>
				<span class="text-sm font-medium">
					{#if form.vote.errorCode === 'DAILY_LIMIT_REACHED'}
						{m.vote_error_daily_limit({ time: new Date(form.vote.nextVote) })}
					{:else if form.vote.errorCode === 'UNAUTHORIZED'}
						{m.vote_error_unauthorized()}
					{:else if form.vote.errorCode === 'INVALID_SESSION'}
						{m.vote_error_invalid_session()}
					{:else if form.vote.errorCode === 'INVALID_SONG_ID'}
						{m.vote_error_invalid_song_id()}
					{:else if form.vote.errorCode === 'DATABASE_ERROR'}
						{m.vote_error_database()}
					{:else if form.vote.errorCode === 'SONG_NOT_FOUND'}
						{m.vote_error_song_not_found()}
					{:else if form.vote.errorCode === 'CANNOT_VOTE_PROMOTED'}
						{m.vote_error_cannot_vote_promoted()}
					{:else if form.vote.errorCode === 'ALREADY_VOTED_TODAY'}
						{m.vote_error_already_voted_today()}
					{:else if form.vote.errorCode === 'CANNOT_VOTE_OWN_SONG'}
						{m.vote_error_cannot_vote_own_song()}
					{:else}
						{m.vote_error_with_code({ error_code: form.vote.errorCode })}
					{/if}
				</span>
			</div>
		</div>
	{/if}

	<div class="mb-8 flex items-center justify-center gap-4">
		<button
			class="rounded px-6 py-2 font-medium text-white transition-colors {isAnyTrackLoading
				? 'cursor-wait bg-orange-500'
				: 'bg-green-500 hover:bg-green-600'}"
			onclick={startAll}
			disabled={isAnyTrackLoading}
		>
			{#if isAnyTrackLoading}
				{m.loading()}
			{:else}
				{isPlaying ? m.pause_global() : m.start()}
			{/if}
		</button>
		<button
			class="rounded bg-red-500 px-6 py-2 font-medium text-white hover:bg-red-600"
			onclick={stopAll}
		>
			{m.stop()}
		</button>
		<button
			class="rounded bg-blue-500 px-6 py-2 font-medium text-white hover:bg-blue-600"
			onclick={downloadMix}
		>
			{m.download_mix()}
		</button>
		<div class="font-mono text-xl font-semibold text-gray-700">
			{formatTime(currentTime)}/1:00
		</div>
	</div>

	<main class="flex flex-col gap-4">
		{#if data.session}
			<div class="flex flex-col justify-center gap-2">
				<UploadSection />

				{#if form?.upload?.success}
					<div class="m-2 text-center">{m.upload_success()}</div>
				{/if}

				{#if form?.upload?.errorCode}
					<div class="m-2 text-center">
						{#if form.upload.errorCode === 'MAXIMUM_LIMIT'}
							{m.upload_throttled({ time: new Date(form.upload.nextUpload) })}
						{:else}
							{m.upload_error_with_code({ error_code: form.upload.errorCode })}
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<TrackContainer
			tracksByType={data.tracksByType}
			{handleTrackSelect}
			{handleMute}
			{selectedTracks}
			{mutedTracks}
			{loadingTracks}
			{playingTracks}
		/>
	</main>

	<!-- Footer Links -->
	<footer class="mt-12 border-t border-gray-200 pt-6 pb-6">
		<div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
			<a
				href="https://ko-fi.com/fralachgui"
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center gap-2 border border-orange-300 bg-white px-3 py-2 text-sm text-orange-700 transition-colors hover:bg-orange-50"
			>
				☕ Tip me a coffee
			</a>
			<a
				href="https://github.com/francoislg/living-song"
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center gap-2 border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
			>
				⭐ See the code
			</a>
		</div>
	</footer>
</div>
