<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages.js';

	function handleUpload(file: File | undefined) {
		if (!file) return;
		if (file.size > 2097152) {
			// TODO: Show file size error to user
			return;
		}
		if (formElement) {
			formElement.submit();
		}
	}

	let formElement: HTMLFormElement | undefined = $state();

	let collapsed = $state(true);
</script>

{#if page.data.session}
	<div class="flex justify-center">
		{#if !page.data.canUpload}
			<div class="cursor-not-allowed rounded bg-gray-400 px-3 py-1 text-sm text-white">
				Upload cooldown active (24h limit)
			</div>
		{:else if collapsed}
			<button
				class="rounded bg-gray-500 px-3 py-1 text-sm text-white hover:cursor-pointer hover:bg-gray-600"
				onclick={() => (collapsed = false)}
			>
				{m.upload()}?
			</button>
		{:else}
			<form method="POST" action="?/upload" bind:this={formElement} enctype="multipart/form-data">
				<label>
					Title:
					<input class="bg-gray-100" name="title" />
				</label>

				<div class="flex flex-col gap-0.5">
					<label>
						{m.tracks_drums()}
						<input type="radio" name="track_type" value="Drum" defaultChecked />
					</label>
					<label>
						{m.tracks_bass()}
						<input type="radio" name="track_type" value="Bass" />
					</label>
					<label>
						{m.tracks_melody()}
						<input type="radio" name="track_type" value="Melody" />
					</label>
					<label>
						{m.tracks_other1()}
						<input type="radio" name="track_type" value="Other 1" />
					</label>
					<label>
						{m.tracks_other2()}
						<input type="radio" name="track_type" value="Other 2" />
					</label>
				</div>

				<label class="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600">
					<input
						name="files"
						type="file"
						class="hidden"
						accept="audio/mp3"
						onchange={(e) => handleUpload((e.target as HTMLInputElement).files?.[0])}
					/>
					{m.upload()}
				</label>
			</form>
		{/if}
	</div>
{/if}
