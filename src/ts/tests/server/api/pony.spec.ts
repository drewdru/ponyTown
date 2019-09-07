import '../../lib';
import { SinonStub, stub, useFakeTimers, SinonFakeTimers, assert, SinonStubbedInstance } from 'sinon';
import { expect } from 'chai';
import { Types } from 'mongoose';
import { OFFLINE_PONY, PLAYER_NAME_MAX_LENGTH } from '../../../common/constants';
import { randomString } from '../../../common/stringUtils';
import { ICharacter } from '../../../server/db';
import { SavePony, createSavePony, createRemovePony, RemovePony } from '../../../server/api/pony';
import { CharacterFlags, PatreonFlags } from '../../../common/adminInterfaces';
import { getCharacterLimit } from '../../../common/accountUtils';
import { genId, genObjectId, account } from '../../mocks';
import { Reporter } from '../../../server/serverInterfaces';

const info = OFFLINE_PONY;

describe('api pony', () => {
	describe('savePony()', () => {
		let savePony: SavePony;
		let findCharacter: SinonStub;
		let findAuth: SinonStub;
		let characterCount: SinonStub;
		let updateCharacterCount: SinonStub;
		let createCharacter: SinonStub;
		let log: SinonStub;
		let isSuspiciousName: SinonStub;
		let isSuspiciousPony: SinonStub;
		let clock: SinonFakeTimers;
		let reporter: SinonStubbedInstance<Reporter>;

		beforeEach(() => {
			findCharacter = stub();
			findAuth = stub();
			characterCount = stub();
			updateCharacterCount = stub();
			createCharacter = stub();
			log = stub();
			isSuspiciousName = stub();
			isSuspiciousPony = stub();
			clock = useFakeTimers();
			reporter = {
				danger: stub(),
				setPony: stub(),
				warn: stub(),
			} as any;

			savePony = createSavePony(
				findCharacter, findAuth, characterCount, updateCharacterCount, createCharacter, log,
				isSuspiciousName, isSuspiciousPony);
		});

		afterEach(() => {
			clock.restore();
		});

		describe('for existing character', () => {
			const characterId = genId();
			const characterObjectId = Types.ObjectId(characterId);
			let character: ICharacter;
			let account = { _id: 'accid' } as any;

			beforeEach(() => {
				character = {
					name: 'oldname',
					_id: characterObjectId,
					createdAt: new Date(10),
					save() { return this; }
				} as any;

				findCharacter.withArgs(characterId, 'accid').resolves(character);
			});

			it('returns pony object', async () => {
				clock.setSystemTime(123);

				await expect(savePony(account, { id: characterId, name: 'foo', info }, reporter)).eventually.eql({
					id: characterId,
					info,
					lastUsed: '1970-01-01T00:00:00.123Z',
					name: 'foo',
					desc: '',
					site: undefined,
					tag: undefined,
					hideSupport: undefined,
					respawnAtSpawn: undefined,
				});
			});

			it('saves character', async () => {
				const save = stub(character, 'save').resolves(character);

				await savePony(account, { id: characterId, name: 'foo', info }, reporter);

				assert.calledOnce(save);
			});

			it('updates character fields', async () => {
				clock.setSystemTime(123);

				await savePony(account, { id: characterId, name: 'foo', tag: 'tag', info }, reporter);

				expect(character.name).equal('foo');
				expect(character.tag).equal('tag');
				expect(character.info).equal(info);
				expect(character.lastUsed!.toISOString()).equal((new Date()).toISOString());
			});

			it('does not reject if character limit is reached', async () => {
				characterCount.resolves(getCharacterLimit({ supporter: 0 }) * 2);

				await savePony(account, { id: characterId, name: 'foo', info }, reporter);
			});

			it('logs name change', async () => {
				await savePony(account, { id: characterId, name: 'foo', info }, reporter);

				assert.calledWith(log, account._id, 'renamed pony "oldname" => "foo"');
			});

			it('does not log if nothing changed', async () => {
				await savePony(account, { id: characterId, name: 'oldname', info }, reporter);

				assert.notCalled(log);
			});

			it('reports suspicious name', async () => {
				isSuspiciousName.withArgs('moderator').returns(true);

				await savePony(account, { id: characterId, name: 'moderator', info }, reporter);

				assert.calledWith(reporter.setPony, characterId);
				assert.calledWith(reporter.warn, 'Suspicious pony created', '"moderator" (name)');
			});

			it('does not report suspicious name if not changed', async () => {
				character.name = 'moderator';
				isSuspiciousName.withArgs('moderator').returns(true);

				await savePony(account, { id: characterId, name: 'moderator', info }, reporter);
			});

			it('reports suspicious look', async () => {
				isSuspiciousPony.returns(true);

				await savePony(account, { id: characterId, name: 'moderator', info }, reporter);

				assert.calledWith(reporter.setPony, characterId);
				assert.calledWith(reporter.warn, 'Suspicious pony created', '"moderator" (look)');
			});

			it('does not report suspicious look if not changed', async () => {
				character.info = info;
				isSuspiciousPony.returns(true);

				await savePony(account, { id: characterId, name: 'moderator', info }, reporter);
			});

			it('reports suspicious name & look', async () => {
				isSuspiciousName.withArgs('moderator').returns(true);
				isSuspiciousPony.returns(true);

				await savePony(account, { id: characterId, name: 'moderator', info }, reporter);

				assert.calledWith(reporter.setPony, characterId);
				assert.calledWith(reporter.warn, 'Suspicious pony created', '"moderator" (name, look)');
			});

			it('rejects on decoding error', async () => {
				await expect(savePony(account, { id: characterId, name: 'foo', info: 'xxyf@hs' }, reporter))
					.rejectedWith('Error saving character');
			});

			it('sets bad CM flag', async () => {
				const info = 'CASZlZXapSD/1wBAPTk2QAJkI0AT8ADAAxADhAYQHMMkhhMkkJhkkMA=';

				await savePony(account, { id: characterId, name: 'foo', info }, reporter);

				expect(character.flags).equal(CharacterFlags.BadCM);
			});

			it('sets hide support pony flag', async () => {
				await savePony(account, { id: characterId, name: 'foo', info, hideSupport: true }, reporter);

				expect(character.flags).equal(CharacterFlags.HideSupport);
			});

			it('sets respawn at spawn pony flag', async () => {
				await savePony(account, { id: characterId, name: 'foo', info, respawnAtSpawn: true }, reporter);

				expect(character.flags).equal(CharacterFlags.RespawnAtSpawn);
			});

			it('sets auth', async () => {
				const authid = {} as any;
				findAuth.withArgs('authid', 'accid').resolves({ _id: authid });

				await savePony(account, { id: characterId, name: 'foo', site: 'authid', info }, reporter);

				expect(character.site).equal(authid);
			});

			it('does not set auth if not found', async () => {
				await savePony(account, { id: characterId, name: 'foo', site: 'authid', info }, reporter);

				expect(character.site).null;
			});
		});

		describe('for new character', () => {
			const characterId = genId();
			let acc = account({ _id: genObjectId() });
			let character: ICharacter;

			beforeEach(() => {
				character = {
					_id: Types.ObjectId(characterId),
					save() { return this; }
				} as any;

				createCharacter.withArgs(acc).returns(character);
			});

			it('returns pony object', async () => {
				clock.setSystemTime(123);

				await expect(savePony(acc, { name: 'foo', info }, reporter)).eventually.eql({
					id: characterId,
					info,
					lastUsed: '1970-01-01T00:00:00.123Z',
					name: 'foo',
					desc: '',
					site: undefined,
					tag: undefined,
					hideSupport: undefined,
					respawnAtSpawn: undefined,
				});
			});

			it('saves character', async () => {
				const save = stub(character, 'save').resolves(character);

				await savePony(acc, { name: 'foo', info }, reporter);

				assert.calledOnce(save);
			});

			it('sets character fields', async () => {
				clock.setSystemTime(123);

				await savePony(acc, { id: characterId, name: 'foo', tag: 'tag', info }, reporter);

				expect(character.name).equal('foo');
				expect(character.tag).equal('tag');
				expect(character.info).equal(info);
				expect(character.lastUsed!.toISOString()).equal((new Date()).toISOString());
			});

			it('rejects if character limit is reached', async () => {
				characterCount.resolves(getCharacterLimit({ supporter: 0 }));

				await expect(savePony(acc, { name: 'foo', info }, reporter))
					.rejectedWith('Character limit reached');
			});

			it('logs character creation', async () => {
				stub(character, 'save').resolves({ name: 'foo', createdAt: new Date() } as any);

				await savePony(acc, { name: 'foo', info }, reporter);

				assert.calledWith(log, acc._id, 'created pony "foo"');
			});

			describe('for supporters', () => {
				beforeEach(() => {
					acc.patreon = PatreonFlags.Supporter1;
				});

				it('has larger limit', async () => {
					characterCount.resolves(getCharacterLimit({ supporter: 0 }));
					const save = stub(character, 'save').resolves(character);

					await savePony(acc, { name: 'foo', info }, reporter);

					assert.calledOnce(save);
				});

				it('rejects if character limit is reached', async () => {
					characterCount.resolves(getCharacterLimit({ supporter: 1 }));

					await expect(savePony(acc, { name: 'foo', info }, reporter)).rejectedWith('Character limit reached');
				});
			});
		});

		it('rejects on missing pony', async () => {
			await expect(savePony({} as any, undefined as any, reporter)).rejectedWith('Invalid data');
		});

		it('rejects on missing pony name', async () => {
			await expect(savePony({} as any, { info }, reporter)).rejectedWith('Invalid data');
		});

		it('rejects on non-string pony name', async () => {
			await expect(savePony({} as any, { name: {} as any, info }, reporter)).rejectedWith('Invalid data');
		});

		it('rejects on missing pony info', async () => {
			await expect(savePony({} as any, { name: 'foo' }, reporter)).rejectedWith('Invalid data');
		});

		it('rejects on too long pony name', async () => {
			await expect(savePony({} as any, { name: randomString(PLAYER_NAME_MAX_LENGTH + 1), info }, reporter))
				.rejectedWith('Invalid name');
		});

		it('rejects on database error', async () => {
			findCharacter.rejects(new Error('test'));

			await expect(savePony({} as any, { id: 'charid', name: 'foo', info }, reporter)).rejectedWith('Invalid data');
		});
	});

	describe('removePony()', () => {
		let removePony: RemovePony;
		let kickFromAllServersByCharacter: SinonStub;
		let removeCharacter: SinonStub;
		let updateCharacterCount: SinonStub;
		let removedCharacter: SinonStub;
		let logRemovedCharacter: SinonStub;

		beforeEach(() => {
			kickFromAllServersByCharacter = stub();
			removeCharacter = stub();
			updateCharacterCount = stub();
			removedCharacter = stub();
			logRemovedCharacter = stub();

			removePony = createRemovePony(
				kickFromAllServersByCharacter, removeCharacter, updateCharacterCount, removedCharacter, logRemovedCharacter);
		});

		it('kicks user from all servers', async () => {
			await removePony('ponid', 'accid');

			assert.calledWith(kickFromAllServersByCharacter, 'ponid');
		});

		it('removes character', async () => {
			await removePony('ponid', 'accid');

			assert.calledWith(removeCharacter, 'ponid', 'accid');
		});

		it('updates character count', async () => {
			await removePony('ponid', 'accid');

			assert.calledWith(updateCharacterCount, 'accid');
		});

		it('logs character removed', async () => {
			const character = { name: 'test', info: 'INFO' };
			removeCharacter.resolves(character);

			await removePony('ponid', 'accid');

			assert.calledWith(logRemovedCharacter, character);
		});

		it('notifies of character removal', async () => {
			removeCharacter.resolves({ name: 'test' });

			await removePony('ponid', 'accid');

			assert.calledWith(removedCharacter, 'ponid');
		});

		it('does not log character removal if character is not found', async () => {
			removeCharacter.resolves(undefined);

			await removePony('ponid', 'accid');

			assert.notCalled(logRemovedCharacter);
		});

		it('does not notify of character removal if character is not found', async () => {
			removeCharacter.resolves(undefined);

			await removePony('ponid', 'accid');

			assert.notCalled(removedCharacter);
		});

		it('rejects if pony ID is not a string', async () => {
			await expect(removePony({} as any, 'accid')).rejectedWith('Invalid ponyId ([object Object])');
		});

		it('rejects if pony ID is empty', async () => {
			await expect(removePony('', 'accid')).rejectedWith('Invalid ponyId ()');
		});
	});
});
