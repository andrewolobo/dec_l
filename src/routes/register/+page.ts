import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, url }) => {
	const { session } = await parent();

	// Redirect to home if already authenticated
	if (session?.user) {
		throw redirect(302, '/');
	}

	// Get redirect URL from query params
	const redirectTo = url.searchParams.get('redirectTo') || '/';

	return {
		redirectTo
	};
};
