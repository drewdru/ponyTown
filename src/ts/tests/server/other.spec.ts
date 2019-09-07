import '../lib';
import { expect } from 'chai';
import { CHANGELOG } from '../../generated/changelog';

describe('other', () => {
	it('package version is the same as latest changelog version entry', () => {
		const packageJson: any = require('../../../../package.json');
		const packageVersion = packageJson.version.replace(/-alpha$/, '');
		const changelogVersion = CHANGELOG[0].version.replace(/^v/, '');
		expect(packageVersion).equal(changelogVersion, `package: ${packageVersion}, changelog: ${changelogVersion}`);
	});
});
