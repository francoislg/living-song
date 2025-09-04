import * as BunnyStorageSDK from '@bunny.net/storage-sdk';
import { env } from '$env/dynamic/private';

if (!env.BUNNYNET_ACCESS_TOKEN) throw new Error('BUNNYNET_ACCESS_TOKEN is not set');
export const bunnyStorageZone = BunnyStorageSDK.zone.connect_with_accesskey(
	BunnyStorageSDK.regions.StorageRegion.Falkenstein,
	'living-song',
	env.BUNNYNET_ACCESS_TOKEN
);
