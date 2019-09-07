import { Component } from '@angular/core';
import {
	GameServerState, SERVER_SETTINGS, LOGIN_SERVER_SETTINGS, ServerStats, RequestStats,
	UserCountStats, Stats, StatsTable
} from '../../../common/adminInterfaces';
import { hasRole } from '../../../common/accountUtils';
import { AdminModel } from '../../services/adminModel';
import { faCog, faSlidersH } from '../../../client/icons';

@Component({
	selector: 'admin-state',
	templateUrl: 'admin-state.pug',
	styleUrls: ['admin-state.scss'],
})
export class AdminState {
	readonly cogIcon = faCog;
	readonly optionsIcon = faSlidersH;
	readonly loginOptions = LOGIN_SERVER_SETTINGS;
	readonly options = SERVER_SETTINGS;
	private stats = new Map<string, ServerStats>();
	private statsTables = new Map<string, StatsTable>();
	requestStats?: RequestStats[];
	userCounts?: UserCountStats[];
	showSettings: any = {};
	constructor(private model: AdminModel) {
	}
	get state() {
		return this.model.state;
	}
	get loginServers() {
		return this.model.state.loginServers;
	}
	get servers() {
		return this.model.state.gameServers;
	}
	get isSuperadmin() {
		return hasRole(this.model.account, 'superadmin');
	}
	kickAll(server: GameServerState) {
		return this.model.kickAll(server.id);
	}
	updateLoginSetting(key: string, value: boolean) {
		return this.model.updateSettings({ [key]: value });
	}
	updateLoginSettings(state: any) {
		return this.model.updateSettings(state);
	}
	updateServerSetting(server: GameServerState, key: string, value: boolean) {
		return this.model.updateGameServerSettings(server.id, { [key]: value });
	}
	updateServerSettings(server: GameServerState, state: any) {
		return this.model.updateGameServerSettings(server.id, state);
	}
	// request stats
	fetchRequestStats() {
		this.model.getRequestStats()
			.then(stats => {
				this.requestStats = stats && stats.requests;
				this.userCounts = stats && stats.userCounts;
			});
	}
	resetRequestStats() {
		this.requestStats = undefined;
		this.userCounts = undefined;
	}
	// socket stats
	fetchStats(server: GameServerState) {
		return this.model.fetchServerStats(server.id)
			.then(stats => stats && this.stats.set(server.id, stats));
	}
	resetStats(server: GameServerState) {
		this.stats.delete(server.id);
	}
	getStats(server: GameServerState) {
		return this.stats.get(server.id);
	}
	// stats tables
	fetchCountryStats(server: GameServerState) {
		return this.fetchStatsTable(server, Stats.Country);
	}
	fetchSupportStats(server: GameServerState) {
		return this.fetchStatsTable(server, Stats.Support);
	}
	fetchMapStats(server: GameServerState) {
		return this.fetchStatsTable(server, Stats.Maps);
	}
	resetStatsTable(server: GameServerState) {
		this.statsTables.delete(server.id);
	}
	getStatsTable(server: GameServerState) {
		return this.statsTables.get(server.id);
	}
	private fetchStatsTable(server: GameServerState, stats: Stats) {
		return this.model.fetchServerStatsTable(server.id, stats)
			.then(stats => stats && this.statsTables.set(server.id, stats));
	}
	// updates
	notifyOfUpdate(server = '*') {
		if (confirm('Are you sure?')) {
			this.model.notifyUpdate(server);
		}
	}
	shutdownServers(server = '*') {
		if (confirm('Are you sure?')) {
			this.model.shutdownServers(server);
		}
	}
	resetUpdating(server = '*') {
		this.model.resetUpdating(server);
	}
}
