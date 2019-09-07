require('./src/scripts/server/boot');
const mongoose = require('mongoose');
const fs = require('fs');
const _ = require('lodash');
const { decompressPony } = require('./src/scripts/common/compressPony');
const ponyInfo = require('./src/scripts/common/ponyInfo');
const db = require('./src/scripts/server/db');
const config = require('./src/scripts/server/config').config;
const argv = require('yargs').option('addrole', { type: 'array' }).option('removerole', { type: 'array' }).argv;

mongoose.connect(config.db, {
	reconnectTries: Number.MAX_VALUE,
	useNewUrlParser: true,
	useCreateIndex: true,
	useFindAndModify: false,
});

function iterate(query, onData, onEnd = () => process.exit()) {
	query.cursor().on('data', onData).on('end', onEnd);
}

function generatePonyStats() {
	const sets = {};
	const fields = {};
	const defaultPony = ponyInfo.createDefaultPony();
	const ignore = [
		'cm', 'eyeshadowColor', 'eyeWhites', 'eyeColorRight', 'eyeColorLeft', 'coatFill', 'coatOutline',
		'frecklesColor',
	];
	const keys = Object.keys(defaultPony).filter(key => !_.includes(ignore, key));
	const setFields = keys.filter(key => typeof defaultPony[key] === 'object' && 'type' in defaultPony[key]);
	const otherFields = keys.filter(key => typeof defaultPony[key] !== 'object' || !('type' in defaultPony[key]));
	let done = 0;

	setFields.forEach(key => sets[key] = new Map());
	otherFields.forEach(key => fields[key] = new Map());

	iterate(db.Character.find({}, '_id name info'), doc => {
		try {
			const pony = decompressPony(doc.info);

			for (const key of setFields) {
				const stats = sets[key];
				const { type = 0, pattern = 0 } = pony[key] || {};
				const row = stats.get(type) || new Map();
				stats.set(type, row);
				row.set(pattern, 1 + (row.get(pattern) || 0));
			}

			for (const key of otherFields) {
				const stats = fields[key];
				const value = pony[key];
				stats.set(value, 1 + (stats.get(value) || 0));
			}

			if ((++done % 10000) === 0) {
				console.log('done', done);
			}
		} catch (e) {
			console.log(e);
			console.log('id: ', doc._id);
			console.log('info: ', doc._info);
		}
	}, () => {
		const setsData = _.flatten(Object.keys(sets)
			.sort()
			.map(key => {
				const patterns = _.range(0, 1 + _.max(entries(sets[key]).map(e => _.max(entries(e[1]).map(x => x[0])))));

				return [
					[],
					[key],
					['', '', 'pattern'],
					['', '', ...patterns],
					...entries(sets[key])
						.sort(([a], [b]) => a - b)
						.map(([key, value], i) => [i === 0 ? 'type' : '', key, ...patterns.map(pat => value.get(pat) || 0)]),
				];
			}));

		const fieldsData = _.flatten(Object.keys(fields)
			.sort()
			.map(key => [
				[],
				[key],
				...entries(fields[key]).sort(([a], [b]) => a - b).map(([key, value]) => ['', key, value]),
			]));

		fs.writeFileSync('stats.csv', `${toCsv(setsData)}\n\n${toCsv(fieldsData)}`, 'utf8');
		console.log('done');
		process.exit();
	});

	function entries(map) {
		return Array.from(map.entries());
	}

	function toCsv(data) {
		return data.map(x => x.map(v => v === undefined ? 'undefined' : v).join(';')).join('\n');
	}
}

function fixCharacterStates() {
	const config = require('./config.json');

	db.Character.countDocuments({ state: { $exists: true } }, (err, total) => {
		let migrated = 0;
		let updating = 0;
		let done = false;

		if (err) {
			console.error(err);
			process.exit();
		}

		console.log('started', total);

		iterate(db.Character.find({ state: { $exists: true } }, '_id name state'), doc => {
			const before = doc.state;
			const after = {};

			for (const { id, name } of config.servers) {
				const state = _.clone(before[name]);

				if (state) {
					if (!state.hold) {
						delete state.hold;
					}

					if (!state.map) {
						delete state.map;
					}

					const flags = (state.right ? 1 : 0) | (state.extra ? 2 : 0);
					delete state.right;
					delete state.extra;

					if (flags) {
						state.flags = flags;
					}

					after[id] = state;
				}

				if (before[id]) {
					after[id] = _.clone(before[id]);
				}
			}

			updating++;
			db.Character.update({ _id: doc._id }, { state: after }, e => {
				migrated++;
				updating--;

				if (e) {
					console.error(e);
				}

				if ((migrated % 10000) === 0) {
					console.log('migrated', migrated, 'of', total);
				}

				if (done && updating === 0) {
					console.log('ALL DONE');
				}
			});
		}, () => {
			done = true;
			console.log('done iterating');
		});
	});
}

async function updateCharacterPositions() {
	const servers = ['main', 'safe', 'safe-ru'];
	const total = await db.Character.countDocuments({ state: { $exists: true } }).exec();
	let done = 0;

	console.log('updating', total);

	iterate(db.Character.find({ state: { $exists: true } }, '_id name state'), doc => {
		const state = doc.state;

		if (state) {
			let changed = false;

			for (const server of servers) {
				if (state[server]) {
					state[server].x += 40;
					state[server].y += 40;
					changed = true;
				}
			}

			if (changed) {
				db.Character.updateOne({ _id: doc._id }, { state }, () => {
					done++;

					if ((done % 10000) === 0) {
						console.log(`done ${done} / ${total}`);
					}
				});
			} else {
				done++;

				if ((done % 10000) === 0) {
					console.log(`done ${done} / ${total}`);
				}
			}
		}
	}, () => console.log('done'));
}

async function createPerfTestAccounts() {
	const ponies = await db.Character.find({ account: '57ae2336a67f4dc52e123ed1' }).exec();

	for (let i = 0; i < 1000; i++) {
		const account = await db.Account.create({ name: `perf-${i}` });
		const char = ponies[i % ponies.length];
		await db.Character.create({ account: account._id, name: `perf-${i}`, info: char.info });
	}

	process.exit();
}

function settingsStats() {
	let filterSwearWords = [0, 0];
	let filterCyrillic = [0, 0];
	let ignorePartyInvites = [0, 0];
	let ignorePublicChat = [0, 0];
	let seeThroughObjects = [0, 0];
	let chatlogOpacity = _.times(100, () => 0);
	let chatlogRange = _.times(13, () => 0);
	let filterWords = [];

	iterate(db.Account.find({}, 'settings'), doc => {
		if (doc.settings) {
			filterSwearWords[doc.settings.filterSwearWords | 0]++;
			filterCyrillic[doc.settings.filterCyrillic | 0]++;
			ignorePartyInvites[doc.settings.ignorePartyInvites | 0]++;
			ignorePublicChat[doc.settings.ignorePublicChat | 0]++;
			seeThroughObjects[doc.settings.seeThroughObjects | 0]++;
			chatlogOpacity[doc.settings.chatlogOpacity | 0]++;
			chatlogRange[doc.settings.chatlogRange | 0]++;
			doc.settings.filterWords && filterWords.push(doc.settings.filterWords);
		}
	}, () => {
		const pad = 20;
		filterWords.forEach(x => console.log(JSON.stringify(x)));
		console.log('---------------------------------------------');
		console.log(`${_.padStart(`filterSwearWords`, pad)}: ${filterSwearWords.join(', ')}`);
		console.log(`${_.padStart(`filterCyrillic`, pad)}: ${filterCyrillic.join(', ')}`);
		console.log(`${_.padStart(`ignorePartyInvites`, pad)}: ${ignorePartyInvites.join(', ')}`);
		console.log(`${_.padStart(`ignorePublicChat`, pad)}: ${ignorePublicChat.join(', ')}`);
		console.log(`${_.padStart(`seeThroughObjects`, pad)}: ${seeThroughObjects.join(', ')}`);
		console.log(`${_.padStart(`chatlogRange`, pad)}: ${chatlogRange.join(', ')}`);
		console.log(`${_.padStart(`chatlogOpacity`, pad)}: ${chatlogOpacity.join(', ')}`);
		console.log('done');
		process.exit();
	});
}

async function clearOrphanedIgnores() {
	const ids = new Set();
	let removed = 0;

	iterate(db.Account.find({}, '_id').lean(), doc => ids.add(doc._id.toString()), () => {
		iterate(db.Account.find({ ignores: { $exists: true, $not: { $size: 0 } } }, '_id ignores').lean(), doc => {
			const remove = [];

			if (doc.ignores) {
				for (const ignore of doc.ignores) {
					if (!ids.has(ignore) || doc._id.toString() === ignore) {
						remove.push(ignore);
					}
				}
			}

			if (remove.length) {
				removed += remove.length;
				db.Account.updateOne({ _id: doc._id }, { $pull: { ignores: remove } }, err => console.log(err || 'removed'));
			}
		}, () => {
			console.log('done, removed: ', removed);
			process.exit();
		});
	});
}

async function toggleRole(give, id, roles) {
	if (typeof id === 'string' && id.length === 24 && ['superadmin', 'admin', 'mod', 'dev'].indexOf(roles) !== -1) {
		if (give) {
			await db.Account.updateOne({ _id: id }, { $addToSet: { roles } }).exec();
		} else {
			await db.Account.updateOne({ _id: id }, { $pull: { roles } }).exec();
		}
		console.log('done');
	} else {
		console.log('error: usage: node cli.js --addrole <account_id> <role_name>');
		console.log('  roles: superadmin, admin, mod, dev');
	}

	process.exit();
}

if (argv.settingsstats) {
	settingsStats();
} else if (argv.shift) {
	updateCharacterPositions();
} else if (argv.clearignores) {
	clearOrphanedIgnores();
} else if (argv.addrole) {
	toggleRole(true, argv.addrole[0], argv.addrole[1]);
} else if (argv.removerole) {
	toggleRole(false, argv.removerole[0], argv.removerole[1]);
} else {
	console.log('invalid arg');
	process.exit();
}
