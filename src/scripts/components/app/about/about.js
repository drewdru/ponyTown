"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const emoji_1 = require("../../../client/emoji");
const rev_1 = require("../../../client/rev");
const credits_1 = require("../../../client/credits");
const changelog_1 = require("../../../generated/changelog");
const constants_1 = require("../../../common/constants");
const data_1 = require("../../../client/data");
function toCredit(credit) {
    return Object.assign({}, credit, { background: `url(${rev_1.getUrl('images/avatars.jpg')})`, position: `${(credit.avatarIndex % 4) * -82}px ${Math.floor(credit.avatarIndex / 4) * -82}px` });
}
let About = class About {
    constructor() {
        this.title = document.title;
        this.emotes = emoji_1.emojis;
        this.credits = credits_1.CREDITS.map(toCredit);
        this.contributors = credits_1.CONTRIBUTORS;
        this.changelog = changelog_1.CHANGELOG;
        this.rewards = constants_1.SUPPORTER_REWARDS_LIST;
        this.patreonLink = data_1.supporterLink;
        this.contactEmail = data_1.contactEmail;
    }
};
About = tslib_1.__decorate([
    core_1.Component({
        selector: 'about',
        templateUrl: 'about.pug',
        styleUrls: ['about.scss'],
    })
], About);
exports.About = About;
//# sourceMappingURL=about.js.map