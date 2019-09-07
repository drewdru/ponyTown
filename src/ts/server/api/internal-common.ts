export const createReloadSettings =
	(reloadSettings: () => Promise<void>) =>
		async () =>
			await reloadSettings();
