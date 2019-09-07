import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
// import { ScrollingModule } from '@angular/cdk/scrolling';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { ModalModule } from 'ngx-bootstrap/modal';

import { ActionBar } from './action-bar/action-bar';
import { ActionButton } from './action-button/action-button';
import { ActionsModal } from './actions-modal/actions-modal';
import { BitmapBox } from './bitmap-box/bitmap-box';
import { ButtMarkEditor } from './butt-mark-editor/butt-mark-editor';
import { MenuItem } from './menu-item/menu-item';
import { MenuBar } from './menu-bar/menu-bar';
import { CharacterList } from './character-list/character-list';
import { CharacterPreview } from './character-preview/character-preview';
import { CharacterSelect } from './character-select/character-select';
import { EmoteBox } from './emote-box/emote-box';
import { SliderBar } from './slider-bar/slider-bar';
import { SpriteBox } from './sprite-box/sprite-box';
import { SpriteSelection } from './sprite-selection/sprite-selection';
import { SupportButton } from './support-button/support-button';
import { SupporterPony } from './supporter-pony/supporter-pony';
import { SetSelection, SetOutlineHidden } from './set-selection/set-selection';
import { CheckBox } from './check-box/check-box';
import { PortraitBox } from './portrait-box/portrait-box';
import { ScalePicker } from './scale-picker/scale-picker';
import { ColorPicker } from './color-picker/color-picker';
import { CustomCheckbox } from './custom-checkbox/custom-checkbox';
import { DatePicker } from './date-picker/date-picker';
import { SignInBox } from './sign-in-box/sign-in-box';
import { PonyBox } from './pony-box/pony-box';
import { ModBox } from './mod-box/mod-box';
import { PartyBox } from './party-box/party-box';
import { PartyList } from './party-list/party-list';
import { SiteInfo } from './site-info/site-info';
import { SettingsBox } from './settings-box/settings-box';
import { SettingsModal } from './settings-modal/settings-modal';
import { InvitesModal } from './invites-modal/invites-modal';
import { FillOutline } from './fill-outline/fill-outline';
import { FriendsBox } from './friends-box/friends-box';
import { InstallButton } from './install-button/install-button';
import { KbdKey } from './kbd-key/kbd-key';
import { PlayBox } from './play-box/play-box';
import { ChatBox } from './chat-box/chat-box';
import { ChatLog } from './chat-log/chat-log';
import { SwapBox } from './swap-box/swap-box';
import { SiteLinks } from './site-links/site-links';
import { NotificationItem } from './notification/notification-item';
import { NotificationList } from './notification/notification-list';
import { tabsetComponents } from './tabset/tabset';
import { PlayNotice } from './play-notice/play-notice';
import { PageLoader } from './page-loader/page-loader';
import { virtualListDirectives, VirtualList } from './virtual-list/virtual-list';

import { Anchor } from './directives/anchor';
import { BtnHighlight, BtnHighlightDanger } from './directives/btnHighlight';
import { draggableComponents } from './directives/draggable';
import { AgDrag } from './directives/agDrag';
import { AgAutoFocus } from './directives/agAutoFocus';
import { LinkCurrent } from './directives/linkCurrent';
import { LabelledBy } from './directives/labelledBy';
import { RevSrc } from './directives/revSrc';
import { FixToTop } from './directives/fixToTop';
import { FocusTitle } from './directives/focusTitle';
import { FocusTrap } from './directives/focusTrap';
import { HasFeature } from './directives/hasFeature';
import { dropdownDirectives } from './directives/dropdown';
import { SaveActiveTab } from './directives/saveActiveTab';

import { SiteNamePipe } from './pipes/siteName';

const declarations = [
	ActionBar,
	ActionButton,
	ActionsModal,
	BitmapBox,
	ButtMarkEditor,
	MenuBar,
	MenuItem,
	CharacterList,
	CharacterPreview,
	CharacterSelect,
	EmoteBox,
	SliderBar,
	SpriteBox,
	SpriteSelection,
	SupportButton,
	SupporterPony,
	SetSelection,
	SetOutlineHidden,
	CheckBox,
	PortraitBox,
	ScalePicker,
	SwapBox,
	ColorPicker,
	CustomCheckbox,
	DatePicker,
	SignInBox,
	PonyBox,
	ModBox,
	PartyBox,
	PartyList,
	SiteInfo,
	SettingsBox,
	SettingsModal,
	FillOutline,
	FriendsBox,
	InstallButton,
	InvitesModal,
	KbdKey,
	PlayBox,
	PlayNotice,
	PageLoader,
	ChatBox,
	ChatLog,
	SiteLinks,
	NotificationItem,
	NotificationList,
	...dropdownDirectives,
	...tabsetComponents,
	...draggableComponents,
	...virtualListDirectives,
	VirtualList,
	Anchor,
	BtnHighlight,
	BtnHighlightDanger,
	AgDrag,
	AgAutoFocus,
	LinkCurrent,
	LabelledBy,
	RevSrc,
	FixToTop,
	FocusTitle,
	FocusTrap,
	HasFeature,
	SaveActiveTab,
	SiteNamePipe,
];

@NgModule({
	imports: [
		BrowserModule,
		RouterModule,
		FormsModule,
		TooltipModule.forRoot(),
		PopoverModule,
		ButtonsModule,
		ModalModule.forRoot(),
		FontAwesomeModule,
		// ScrollingModule,
	],
	declarations: declarations,
	exports: declarations,
})
export class SharedModule {
}
