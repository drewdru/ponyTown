declare module 'patreon' {
	export interface PatronDataRelation {
		data: {
			id: string;
			type: string;
		};
		links: {
			related: string;
		};
	}
	
	export interface PatronDataEntry {
		attributes: {
			title?: string;
			description?: string;
			amount_cents?: number;
			created_at?: string;
			declined_since?: string | null;
			patron_pays_fees?: boolean;
			pledge_cap_cents?: number;
			total_historical_amount_cents?: number;
		};
		id: string;
		relationships: {
			patron: PatronDataRelation;
			reward: PatronDataRelation;
		};
		type: string;
	}

	export interface PatronData {
		rawJson: {
			data: PatronDataEntry[];
			included: PatronDataEntry[];
			links: {
				next?: string;
			};
		};
	}

	export interface PatreonClient {
		(pathname: string): Promise<PatronData>;
		getStore(): any;
		setStore(store: { sync: () => void }): void;
	}

	export interface PatreonTokens {
		access_token: string;
		refresh_token: string;
		expires_in: string;
		scope: string;
		token_type: string;
	}

	export interface PatreonOAuthClient {
		getTokens(redirectCode: string, redirectUri: string): Promise<PatreonTokens>;
		refreshToken(refreshToken: string): Promise<any>;
	}

	export function patreon(accessToken: string): PatreonClient;
	export function oauth(clientId: string, clientSecret: string): PatreonOAuthClient;
}
