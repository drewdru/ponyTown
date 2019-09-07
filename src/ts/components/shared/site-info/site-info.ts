import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { SocialSite, SocialSiteInfo } from '../../../common/interfaces';
import { toSocialSiteInfo } from '../../../client/clientUtils';
import { getProviderIcon } from '../sign-in-box/sign-in-box';

@Component({
	selector: 'site-info',
	templateUrl: 'site-info.pug',
	styleUrls: ['site-info.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteInfo {
	info?: SocialSiteInfo;
	icon: any;
	@Input() set site(value: SocialSite | undefined) {
		this.info = value && toSocialSiteInfo(value);
		this.icon = getProviderIcon(this.info && this.info.icon || '');
	}
}
