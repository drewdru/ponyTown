"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const router_1 = require("@angular/router");
const forms_1 = require("@angular/forms");
const http_1 = require("@angular/common/http");
const platform_browser_1 = require("@angular/platform-browser");
const animations_1 = require("@angular/platform-browser/animations");
const angular_fontawesome_1 = require("@fortawesome/angular-fontawesome");
const popover_1 = require("ngx-bootstrap/popover");
const typeahead_1 = require("ngx-bootstrap/typeahead");
const buttons_1 = require("ngx-bootstrap/buttons");
const shared_module_1 = require("../shared/shared.module");
const errorReporter_1 = require("../services/errorReporter");
const tools_range_1 = require("./shared/tools-range/tools-range");
const tools_frame_1 = require("./shared/tools-frame/tools-frame");
const tools_offset_1 = require("./shared/tools-offset/tools-offset");
const tools_xy_1 = require("./shared/tools-xy/tools-xy");
const tools_expressions_1 = require("./tools-expressions/tools-expressions");
const tools_animation_1 = require("./tools-animation/tools-animation");
const tools_chat_1 = require("./tools-chat/tools-chat");
const tools_variants_1 = require("./tools-variants/tools-variants");
const tools_webgl_1 = require("./tools-webgl/tools-webgl");
const tools_palette_1 = require("./tools-palette/tools-palette");
const tools_perf_1 = require("./tools-perf/tools-perf");
const tools_regions_1 = require("./tools-regions/tools-regions");
const tools_entity_1 = require("./tools-entity/tools-entity");
const tools_sheet_1 = require("./tools-sheet/tools-sheet");
const tools_states_1 = require("./tools-states/tools-states");
const tools_ui_1 = require("./tools-ui/tools-ui");
const tools_collisions_1 = require("./tools-collisions/tools-collisions");
const tools_map_1 = require("./tools-map/tools-map");
const tools_index_1 = require("./tools-index/tools-index");
const tools_1 = require("./tools");
exports.routes = [
    { path: '', component: tools_index_1.ToolsIndex },
    { path: 'sheet', component: tools_sheet_1.ToolsSheet },
    { path: 'states', component: tools_states_1.ToolsStates },
    { path: 'variants', component: tools_variants_1.ToolsVariants },
    { path: 'webgl', component: tools_webgl_1.ToolsWebgl },
    { path: 'animation/:id', component: tools_animation_1.ToolsAnimation },
    { path: 'animation', component: tools_animation_1.ToolsAnimation },
    { path: 'chat', component: tools_chat_1.ToolsChat },
    { path: 'expressions', component: tools_expressions_1.ToolsExpressions },
    { path: 'entity', component: tools_entity_1.ToolsEntity },
    { path: 'palette', component: tools_palette_1.ToolsPalette },
    { path: 'perf', component: tools_perf_1.ToolsPerf },
    { path: 'regions', component: tools_regions_1.ToolsRegions },
    { path: 'ui', component: tools_ui_1.ToolsUI },
    { path: 'collisions', component: tools_collisions_1.ToolsCollisions },
    { path: 'map', component: tools_map_1.ToolsMap },
];
let ToolsAppModule = class ToolsAppModule {
};
ToolsAppModule = tslib_1.__decorate([
    core_1.NgModule({
        imports: [
            platform_browser_1.BrowserModule,
            router_1.RouterModule,
            forms_1.FormsModule,
            http_1.HttpClientModule,
            shared_module_1.SharedModule,
            popover_1.PopoverModule.forRoot(),
            typeahead_1.TypeaheadModule.forRoot(),
            buttons_1.ButtonsModule.forRoot(),
            router_1.RouterModule.forRoot(exports.routes),
            angular_fontawesome_1.FontAwesomeModule,
            animations_1.NoopAnimationsModule,
        ],
        declarations: [
            tools_range_1.ToolsRange,
            tools_frame_1.ToolsFrame,
            tools_offset_1.ToolsOffset,
            tools_xy_1.ToolsXY,
            tools_expressions_1.ToolsExpressions,
            tools_animation_1.ToolsAnimation,
            tools_chat_1.ToolsChat,
            tools_variants_1.ToolsVariants,
            tools_webgl_1.ToolsWebgl,
            tools_palette_1.ToolsPalette,
            tools_perf_1.ToolsPerf,
            tools_regions_1.ToolsRegions,
            tools_entity_1.ToolsEntity,
            tools_sheet_1.ToolsSheet,
            tools_states_1.ToolsStates,
            tools_collisions_1.ToolsCollisions,
            tools_map_1.ToolsMap,
            tools_ui_1.ToolsUI,
            tools_index_1.ToolsIndex,
            tools_1.ToolsApp,
        ],
        providers: [
            errorReporter_1.ErrorReporter,
        ],
        bootstrap: [tools_1.ToolsApp],
    })
], ToolsAppModule);
exports.ToolsAppModule = ToolsAppModule;
//# sourceMappingURL=tools.module.js.map