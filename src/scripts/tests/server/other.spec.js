"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const changelog_1 = require("../../generated/changelog");
describe('other', () => {
    it('package version is the same as latest changelog version entry', () => {
        const packageJson = require('../../../../package.json');
        const packageVersion = packageJson.version.replace(/-alpha$/, '');
        const changelogVersion = changelog_1.CHANGELOG[0].version.replace(/^v/, '');
        chai_1.expect(packageVersion).equal(changelogVersion, `package: ${packageVersion}, changelog: ${changelogVersion}`);
    });
});
//# sourceMappingURL=other.spec.js.map