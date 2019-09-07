"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const platform_browser_1 = require("@angular/platform-browser");
const router_1 = require("@angular/router");
const forms_1 = require("@angular/forms");
// import { ScrollingModule } from '@angular/cdk/scrolling';
const angular_fontawesome_1 = require("@fortawesome/angular-fontawesome");
const tooltip_1 = require("ngx-bootstrap/tooltip");
const popover_1 = require("ngx-bootstrap/popover");
const buttons_1 = require("ngx-bootstrap/buttons");
const modal_1 = require("ngx-bootstrap/modal");
const action_bar_1 = require("./action-bar/action-bar");
const action_button_1 = require("./action-button/action-button");
const actions_modal_1 = require("./actions-modal/actions-modal");
const bitmap_box_1 = require("./bitmap-box/bitmap-box");
const butt_mark_editor_1 = require("./butt-mark-editor/butt-mark-editor");
const menu_item_1 = require("./menu-item/menu-item");
const menu_bar_1 = require("./menu-bar/menu-bar");
const character_list_1 = require("./character-list/character-list");
const character_preview_1 = require("./character-preview/character-preview");
const character_select_1 = require("./character-select/character-select");
const emote_box_1 = require("./emote-box/emote-box");
const slider_bar_1 = require("./slider-bar/slider-bar");
const sprite_box_1 = require("./sprite-box/sprite-box");
const sprite_selection_1 = require("./sprite-selection/sprite-selection");
const support_button_1 = require("./support-button/support-button");
const supporter_pony_1 = require("./supporter-pony/supporter-pony");
const set_selection_1 = require("./set-selection/set-selection");
const check_box_1 = require("./check-box/check-box");
const portrait_box_1 = require("./portrait-box/portrait-box");
const scale_picker_1 = require("./scale-picker/scale-picker");
const color_picker_1 = require("./color-picker/color-picker");
const custom_checkbox_1 = require("./custom-checkbox/custom-checkbox");
const date_picker_1 = require("./date-picker/date-picker");
const sign_in_box_1 = require("./sign-in-box/sign-in-box");
const pony_box_1 = require("./pony-box/pony-box");
const mod_box_1 = require("./mod-box/mod-box");
const party_box_1 = require("./party-box/party-box");
const party_list_1 = require("./party-list/party-list");
const site_info_1 = require("./site-info/site-info");
const settings_box_1 = require("./settings-box/settings-box");
const settings_modal_1 = require("./settings-modal/settings-modal");
const invites_modal_1 = require("./invites-modal/invites-modal");
const fill_outline_1 = require("./fill-outline/fill-outline");
const friends_box_1 = require("./friends-box/friends-box");
const install_button_1 = require("./install-button/install-button");
const kbd_key_1 = require("./kbd-key/kbd-key");
const play_box_1 = require("./play-box/play-box");
const chat_box_1 = require("./chat-box/chat-box");
const chat_log_1 = require("./chat-log/chat-log");
const swap_box_1 = require("./swap-box/swap-box");
const site_links_1 = require("./site-links/site-links");
const notification_item_1 = require("./notification/notification-item");
const notification_list_1 = require("./notification/notification-list");
const tabset_1 = require("./tabset/tabset");
const play_notice_1 = require("./play-notice/play-notice");
const page_loader_1 = require("./page-loader/page-loader");
const virtual_list_1 = require("./virtual-list/virtual-list");
const anchor_1 = require("./directives/anchor");
const btnHighlight_1 = require("./directives/btnHighlight");
const draggable_1 = require("./directives/draggable");
const agDrag_1 = require("./directives/agDrag");
const agAutoFocus_1 = require("./directives/agAutoFocus");
const linkCurrent_1 = require("./directives/linkCurrent");
const labelledBy_1 = require("./directives/labelledBy");
const revSrc_1 = require("./directives/revSrc");
const fixToTop_1 = require("./directives/fixToTop");
const focusTitle_1 = require("./directives/focusTitle");
const focusTrap_1 = require("./directives/focusTrap");
const hasFeature_1 = require("./directives/hasFeature");
const dropdown_1 = require("./directives/dropdown");
const saveActiveTab_1 = require("./directives/saveActiveTab");
const siteName_1 = require("./pipes/siteName");
const declarations = [
    action_bar_1.ActionBar,
    action_button_1.ActionButton,
    actions_modal_1.ActionsModal,
    bitmap_box_1.BitmapBox,
    butt_mark_editor_1.ButtMarkEditor,
    menu_bar_1.MenuBar,
    menu_item_1.MenuItem,
    character_list_1.CharacterList,
    character_preview_1.CharacterPreview,
    character_select_1.CharacterSelect,
    emote_box_1.EmoteBox,
    slider_bar_1.SliderBar,
    sprite_box_1.SpriteBox,
    sprite_selection_1.SpriteSelection,
    support_button_1.SupportButton,
    supporter_pony_1.SupporterPony,
    set_selection_1.SetSelection,
    set_selection_1.SetOutlineHidden,
    check_box_1.CheckBox,
    portrait_box_1.PortraitBox,
    scale_picker_1.ScalePicker,
    swap_box_1.SwapBox,
    color_picker_1.ColorPicker,
    custom_checkbox_1.CustomCheckbox,
    date_picker_1.DatePicker,
    sign_in_box_1.SignInBox,
    pony_box_1.PonyBox,
    mod_box_1.ModBox,
    party_box_1.PartyBox,
    party_list_1.PartyList,
    site_info_1.SiteInfo,
    settings_box_1.SettingsBox,
    settings_modal_1.SettingsModal,
    fill_outline_1.FillOutline,
    friends_box_1.FriendsBox,
    install_button_1.InstallButton,
    invites_modal_1.InvitesModal,
    kbd_key_1.KbdKey,
    play_box_1.PlayBox,
    play_notice_1.PlayNotice,
    page_loader_1.PageLoader,
    chat_box_1.ChatBox,
    chat_log_1.ChatLog,
    site_links_1.SiteLinks,
    notification_item_1.NotificationItem,
    notification_list_1.NotificationList,
    ...dropdown_1.dropdownDirectives,
    ...tabset_1.tabsetComponents,
    ...draggable_1.draggableComponents,
    ...virtual_list_1.virtualListDirectives,
    virtual_list_1.VirtualList,
    anchor_1.Anchor,
    btnHighlight_1.BtnHighlight,
    btnHighlight_1.BtnHighlightDanger,
    agDrag_1.AgDrag,
    agAutoFocus_1.AgAutoFocus,
    linkCurrent_1.LinkCurrent,
    labelledBy_1.LabelledBy,
    revSrc_1.RevSrc,
    fixToTop_1.FixToTop,
    focusTitle_1.FocusTitle,
    focusTrap_1.FocusTrap,
    hasFeature_1.HasFeature,
    saveActiveTab_1.SaveActiveTab,
    siteName_1.SiteNamePipe,
];
let SharedModule = class SharedModule {
};
SharedModule = tslib_1.__decorate([
    core_1.NgModule({
        imports: [
            platform_browser_1.BrowserModule,
            router_1.RouterModule,
            forms_1.FormsModule,
            tooltip_1.TooltipModule.forRoot(),
            popover_1.PopoverModule,
            buttons_1.ButtonsModule,
            modal_1.ModalModule.forRoot(),
            angular_fontawesome_1.FontAwesomeModule,
        ],
        declarations: declarations,
        exports: declarations,
    })
], SharedModule);
exports.SharedModule = SharedModule;
//# sourceMappingURL=shared.module.js.map