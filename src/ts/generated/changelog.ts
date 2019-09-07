/* tslint:disable */

export const CHANGELOG: { version: string; changes: string[]; }[] = [
  {
    "version": "v0.53.1",
    "changes": [
      "Switched to autumn season",
      "Updated custom servers (about page)",
      "Added option to import and export settings and actions on action bar",
      "Added different colors of cushions for house customization",
      "Fixed scroll wheel not working on Firefox",
      "Fixed not being able to place items behind interactive items like boxes or barrels",
      "Fixed issue with crystal light"
    ]
  },
  {
    "version": "v0.53.0",
    "changes": [
      "Added custom servers (about page)",
      "Added export option for ponies (character page)",
      "Added editing house floor tiles",
      "Added more placeable object for the house",
      "Added way to cycle backwards through item list by using <kbd>Shift</kbd> + <kbd>E</kbd> while holding the hammer tool",
      "Added <code>/lockhouse</code> and <code>/unlockhouse</code> commands for preventing other people from modifying the house",
      "Added <code>/removetoolbox</code> and <code>/restoretoolbox</code> commands for removing and restoring toolbox object from house map",
      "Added switching placeable items and tiles by using mouse wheel",
      "Added switching tools using <kbd>Shift</kbd> + scroll wheel when you're inside the house",
      "Unlocked other objects in the house for removing",
      "Unlocked walls in front of windows from being placed",
      "Increased house object limit",
      "Fixed issues with house map saving using <code>/savehouse</code> command",
      "Fixed being able to place objects in the house behind wall"
    ]
  },
  {
    "version": "v0.52.0",
    "changes": [
      "Added cave/mines map",
      "Added 2 new cave/mine sound tracks",
      "Added new cave/mine objects and decorations",
      "Added bunnies around the map",
      "Added direction signs",
      "Added pickable ropes in mines",
      "Added building and removing walls in party house using saw tool",
      "Added removing furniture in party house using broom tool",
      "Added placing furniture in party house using hammer tool",
      "Added \"Switch tool\" and \"Switch item to place\" actions",
      "Added carrot field in top right corner of the map",
      "Added more fruits to fruit box",
      "Added sort tags to character descriptions (the same names are sorted by description)",
      "Added character description help tooltip",
      "Added some new emotes",
      "Improved sorting of character list",
      "Improved tags dropdown"
    ]
  },
  {
    "version": "v0.51.2",
    "changes": [
      "Added character descriptions and tags",
      "Added song switching when changing maps",
      "Fixed performance issues with login server",
      "Fixed issues with rendering avatars on friend list",
      "Fixed issues with displaying load error messages",
      "Improved character searching on character list",
      "Improved map compression"
    ]
  },
  {
    "version": "v0.51.1",
    "changes": [
      "Fixed multiple issues with party maps",
      "Fixed being able to permanently hide your own character"
    ]
  },
  {
    "version": "v0.51.0",
    "changes": [
      "Added party house on party island",
      "Added 2 new house sound tracks",
      "Added new objects for party house",
      "Added magic action and <code>/magic</code> command (usable by unicorns)",
      "Added \"darken locked outlines\" option to character editor",
      "Added permanent hides",
      "Added list of permanent hides to account settings",
      "Changed ignore party invites to not apply to friends",
      "Updated look of cliffs",
      "Fixed socks resetting if only back leg socks are set",
      "Fixed issues with invisible or duplicate player character",
      "Fixed issues with blurring of action buttons when action bar is scrolled",
      "Fixed issues with collision on boat bridge",
      "Fixed some cyrillic characters not working for expressions correctly",
      "Fixed rendering issues in character editor",
      "Fixed issues with water animation when holding lantern",
      "Fixed some rock animations overlapping with terrain",
      "Fixed apples spawning on water"
    ]
  },
  {
    "version": "v0.50.0",
    "changes": [
      "Combined portuguese and spanish safe servers into one",
      "Added new 18+ russian server",
      "Added swimming",
      "Added new sock patterns",
      "Added setting separate accessory for each leg",
      "Added switch for disabling outline darkening",
      "Added customizable eyelash color",
      "Added character count to character selection list",
      "Added pickable flower on party island",
      "Added rocks in water",
      "Added benches",
      "Added smaller island bit",
      "Added box of fruits on party island",
      "Added rare pickable pear and banana",
      "Increased party size to 30",
      "Increased friend limit to 100",
      "Fixed not updating last used pony when using swap pony option",
      "Fixed game update issues after server restart"
    ]
  },
  {
    "version": "v0.49.0",
    "changes": [
      "Added new 18+ non-ERP server",
      "Added new Safe Spanish server",
      "Added new Safe Portuguese server",
      "Added character swapping",
      "Added online/offline status switch to account dropdown",
      "Added scrolling of action bar on PC using mouse wheel",
      "Added setting separate eye white color for each eye",
      "Increased base character limit to 200 and supporter character limits to +200/+300/+450",
      "Fixed issues with game joining when spawning at the edge of the map",
      "Fixed gamepad X button causing pony to sit down",
      "Fixed player hiding getting reset on server restart",
      "Fixed connection issues in some cases",
      "Improved game performance"
    ]
  },
  {
    "version": "v0.48.2",
    "changes": [
      "Added flying over cliffs, fences and some other objects",
      "Increased hide limit to 1000",
      "Fixed issues with collision detection",
      "Fixed issues with switching maps",
      "Fixed issues with grass on party island map"
    ]
  },
  {
    "version": "v0.48.1",
    "changes": [
      "Added toy stash and item stash to party island",
      "Increased party size to 20",
      "Fixed issues with server restart",
      "Fixed issues with issues with party island map in some cases"
    ]
  },
  {
    "version": "v0.48.0",
    "changes": [
      "Added harbor",
      "Added party island map",
      "Added party island music tracks",
      "Added <b>bright night</b> settings option, that makes game brighter during in-game night",
      "Added past supporter status",
      "Added extra pony slots for past supporters",
      "Fixed issues with collision inconsistencies",
      "Fixed friend tag and name color showing even when switched to \"show as offline\"",
      "Fixed commands not working in whispers",
      "Fixed camera issue after joining to the game",
      "Fixed <kbd>-</kbd> and <kbd>=</kbd> shortcuts not working on Firefox",
      "Fixed issues when selecting player from chatlog",
      "Fixed shortcut for hiding public chat",
      "Improved displaying party and whisper commands in chatlog",
      "Improved collision handling",
      "Improved game performance",
      "Increased friend limit",
      "Updated swear filters"
    ]
  },
  {
    "version": "v0.47.0",
    "changes": [
      "Added friend list",
      "Added whispers (private messages)",
      "Added <code>/w &lt;name&gt;</code> and <code>/whisper &lt;name&gt;</code> command",
      "Added <code>/r</code> and <code>/reply</code> command",
      "Added \"Ignore friend requests\" settings option",
      "Added \"Only allow whispers from friends\" settings option",
      "Fixed issues with duplicate characters in certain cases",
      "Fixed issues with game not rendering after switching apps or tabs in some cases",
      "Fixed game loading performance issues",
      "Fixed account name not saving properly when entering name of maximum allowed length",
      "Improved performance",
      "Improved networking",
      "Improved server performance",
      "Updated swear filters"
    ]
  },
  {
    "version": "v0.46.6",
    "changes": [
      "Reverted performance improvement leading to issues with sprite rendering on some browsers"
    ]
  },
  {
    "version": "v0.46.5",
    "changes": [
      "Moved rose sign",
      "Fixed some commands not working properly when using uppercase letters",
      "Fixed issues with map regions not loading correctly in certain cases",
      "Fixed issues with map not loading in certain cases",
      "Fixed server-side performance issues",
      "Fixed issues with AFK check",
      "Fixed issues with colors missing on held items in certain cases",
      "Updated swear filters"
    ]
  },
  {
    "version": "v0.46.4",
    "changes": [
      "Fixed issues with incorrect color for chat type indicator in certain cases",
      "Fixed issues with joining after disconnect resulting in missing or duplicated characters",
      "Fixed issues with error reporting",
      "Improved some settings labels",
      "Improved server performance"
    ]
  },
  {
    "version": "v0.46.3",
    "changes": [
      "Changed longer hide to 10 days instead of 7",
      "Increased hide limit to 25",
      "Updated swear filters",
      "Fixed critical server-side issues"
    ]
  },
  {
    "version": "v0.46.2",
    "changes": [
      "Fixed items spawning on cliffs",
      "Fixed issues with date of birth month list",
      "Updated swear filters"
    ]
  },
  {
    "version": "v0.46.1",
    "changes": [
      "Fixed issues with collisions",
      "Fixed issues with disappearing player character in certain cases",
      "Fixed items spawning on cliffs",
      "Fixed some misplaced objects",
      "Fixed some issues with object sorting"
    ]
  },
  {
    "version": "v0.46.0",
    "changes": [
      "Increased map size",
      "Added new locations to the map",
      "Added new plants",
      "Increased party size limit to 10 players",
      "Increased hide limit to 20",
      "Fixed multiple issues with party UI",
      "Fixed issues with music playback",
      "Fixed issues with disappearing player character in certain cases",
      "Fixed missing range limitation for changing tiles",
      "Improved server performance",
      "Improved rendering reliability and performance",
      "Updated swear filters",
      "Updated server infrastructure"
    ]
  },
  {
    "version": "v0.45.3",
    "changes": [
      "Fixed issues with saving account settings in some cases",
      "Fixed server performance issues",
      "Fixed some styling issues",
      "Updated swear filters",
      "Improved graphics performance",
      "Improved server logging and performance analysis tools"
    ]
  },
  {
    "version": "v0.45.2",
    "changes": [
      "Added 25 more pony slots for all players",
      "Removed collectable eggs",
      "Fixed graphics memory leak issue",
      "Fixed graphics initialization issues in certain cases",
      "Fixed performance issues when joining to the game",
      "Improved networking performance"
    ]
  },
  {
    "version": "v0.45.1",
    "changes": [
      "Added egg donation barrel",
      "Fixed issues when saving settings in certain cases",
      "Fixed issues with action bar on desktop PCs with touchscreens",
      "Fixed disconnect issues in some cases",
      "Fixed broken link in about page"
    ]
  },
  {
    "version": "v0.45.0",
    "changes": [
      "Added collectable eggs",
      "Added egg emoji",
      "Added <code>/eggs</code> command",
      "Added eggs command action",
      "Added keyboard shortcut <kbd>F3</kbd> for toggling public chat",
      "Fixed custom filters not working for player names",
      "Fixed styling issues on Yandex browser",
      "Fixed tongue not visible on expression action buttons",
      "Reduced memory usage",
      "Improved graphics resource allocation management",
      "Improved memory usage for graphics resources",
      "Improved chatlog performance"
    ]
  },
  {
    "version": "v0.44.2",
    "changes": [
      "Fixed actions modal styling issues on Internet explorer",
      "Fixed error when running out of memory in some cases",
      "Fixed not being able to join server in some cases"
    ]
  },
  {
    "version": "v0.44.1",
    "changes": [
      "Changed command actions to use last used chat type (party/public)",
      "Fixed actions modal scrolling by itself on mobile",
      "Fixed some closed eyes not counted correctly as closed for sleeping emotes"
    ]
  },
  {
    "version": "v0.44.0",
    "changes": [
      "Added action bar",
      "Added action bar customization via \"Actions\" option in in-game settings dropdown",
      "Fixed issues with showing incorrect party state after disconnect in certain cases"
    ]
  },
  {
    "version": "v0.43.2",
    "changes": [
      "Added filters section to in-game settings",
      "Added custom chat filter to in-game settings",
      "Improved rendering performance",
      "Fixed chatlog range indicator showing incorrectly in some cases",
      "Fixed incorrect errors when failed to initialize graphics device",
      "Fixed connection issues when cancelling joining to the game",
      "Updated swear filters"
    ]
  },
  {
    "version": "v0.43.1",
    "changes": [
      "Added ignore public chat option to in-game settings",
      "Added button shortcut for opening chat on controller",
      "Added date of birth field to account settings",
      "Changed eyes when using uppercase Q letters in expressions <code>QcQ</code>",
      "Changed character name validation",
      "Improved camera shifting when opening mobile keyboard",
      "Improved some letters in pixel font",
      "Fixed issues when mobile keyboard is opened",
      "Fixed incorrect error messages for party invites in some cases",
      "Updated swear filters"
    ]
  },
  {
    "version": "v0.43.0",
    "changes": [
      "Added new manes",
      "Added chatlog range setting",
      "Added fps counter (option in settings)",
      "Changed \"see through objects\" and \"chatlog opacity\" settings to be saved on server",
      "Changed night to be lighter on low graphics settings to compensate for missing lights",
      "Improved party invite error messages",
      "Updated map with new flower and clover patches",
      "Updated swear filters",
      "Removed some expression combinations from PG rated servers",
      "Fixed command messages in party chat being colored white instead of yellow",
      "Fixed issues with part of game screen being outside the screen bounds on mobile devices in some cases",
      "Fixed issues with pixel scaling on low graphics mode",
      "Fixed issues with game screen turning green or black",
      "Fixed issues with game loading",
      "Fixed issues with music playing before the game loads",
      "Fixed issue with reloading game in some cases",
      "Fixed styling issues"
    ]
  },
  {
    "version": "v0.42.4",
    "changes": [
      "Changed season to spring",
      "Updated swear filters",
      "Fixed some issues with account alerts"
    ]
  },
  {
    "version": "v0.42.3",
    "changes": [
      "Added <code>:thinking:</code> emoji",
      "Added account alerts for notifying players of account related issues",
      "Removed some expression combinations from PG rated servers",
      "Updated swear filters",
      "Fixed graphical glitch with some expressions when using beak muzzle option",
      "Fixed sign-in error showing off-screen on some devices",
      "Fixed some disconnect issues",
      "Improved performance"
    ]
  },
  {
    "version": "v0.42.2",
    "changes": [
      "Fixed issue with game breaking in some cases when the connection is interrupted"
    ]
  },
  {
    "version": "v0.42.1",
    "changes": [
      "Fixed issues with color pickers on some mobile devices"
    ]
  },
  {
    "version": "v0.42.0",
    "changes": [
      "Added rose sign",
      "Added <code>/love</code>, <code>/<3</code> command",
      "Updated common issues help section",
      "Updated in-game settings window",
      "Fixed some issues with game screen positioning on mobile devices",
      "Fixed some issues with chatlog scrolling",
      "Fixed issues with switching chat mode"
    ]
  },
  {
    "version": "v0.41.0",
    "changes": [
      "Added new facial hair styles and patterns",
      "Added cookie stand",
      "Fixed issue with chatlog tab switching on Firefox",
      "Fixed issue with bats getting stuck when returning to trees",
      "Fixed issue with characters with no wings appear to hover above ground in certain cases",
      "Fixed issue with delay when joining to the game",
      "Fixed errors when using remote buttons while playing the game",
      "Fixed some off-screen messages appearing in chatlog",
      "Fixed some styling issues"
    ]
  },
  {
    "version": "v0.40.1",
    "changes": [
      "Remove loading performance optimization due to Yandex browser bug"
    ]
  },
  {
    "version": "v0.40.0",
    "changes": [
      "Added chatlog",
      "Added chatlog settings",
      "Added settings for walking by default",
      "Fixed graphical glitch when booping while sitting",
      "Fixed issues with critter movement",
      "Fixed being able to be hidden by yourself in certain situations",
      "Fixed incorrect error message displayed in certain situations",
      "Improved game loading performance"
    ]
  },
  {
    "version": "v0.39.4",
    "changes": [
      "Added number in queue indicator when joining to the game takes longer than a second",
      "Fixed issue with game not loading when graphics initialization takes longer than connecting to the server",
      "Fixed issues with gamepad dpad moving the character",
      "Fixed issues with iPad keyboards where each key would only work once, the keys will still get stuck occasionally due to iOS bug, we recommend to use arrow keys for movement instead of WASD keys."
    ]
  },
  {
    "version": "v0.39.3",
    "changes": [
      "Fixed issues with sending long messages on Edge and Internet Explorer browsers"
    ]
  },
  {
    "version": "v0.39.2",
    "changes": [
      "Removed Xmas decorations",
      "Changed support contact email",
      "Fixed some issues with disconnects",
      "Fixed party chat messages visible when party member is on another map",
      "Improved networking performance",
      "Improved server performance"
    ]
  },
  {
    "version": "v0.39.1",
    "changes": [
      "Added gift donation spot where you can donate gifts and reduce your gift count",
      "Added additional restart buttons to avoid getting stuck in game updating state",
      "Added remembering of <code>/s1</code>, <code>/s2</code> and <code>/s3</code> chat mode for next message",
      "Added more logging for analyzing sign-in issues",
      "Fixed issues with mobile keyboard when the game is installed to home screen",
      "Fixed issues with game updating",
      "Fixed issues with missing files during game update process",
      "Fixed focusing pony name input field on mobile devices causing mobile keyboard to open",
      "Fixed being able to see lantern lights of lanterns held by hidden players in some cases"
    ]
  },
  {
    "version": "v0.39.0",
    "changes": [
      "Added xmas decorations",
      "Added gifts with collectable toys (use <kbd>E</kbd> or <code>/open</code> command or <em>gift button</em> on mobile to open the gift)",
      "Added <code>/droptoy</code> command for getting rid of toy on your head",
      "Added <code>/toys</code> for listing amount of collected toys",
      "Added candy/cookie stands",
      "Added picking up apples and oranges",
      "Added set of most common Chinese characters",
      "Added Japanese Kanji characters",
      "Added cookie emoji",
      "Changed plushie sign to toy stash (keeps all your collected toys)",
      "Changed unicode symbol assigned for some emoji characters",
      "Fixed some issues with updating the game",
      "Fixed some issues with height difference when standing on ice",
      "Improved rendering performance"
    ]
  },
  {
    "version": "v0.38.0",
    "changes": [
      "Added winter environment details",
      "Changed season to winter",
      "Fixed some performance issues"
    ]
  },
  {
    "version": "v0.37.3",
    "changes": [
      "Fixed issues with character selection list on mobile devices",
      "Fixed issues with keyboard on mobile devices"
    ]
  },
  {
    "version": "v0.37.2",
    "changes": [
      "Fixed issues with character selection",
      "Fixed issues when using mouse with more than 3 buttons"
    ]
  },
  {
    "version": "v0.37.1",
    "changes": [
      "Added <code>/leave</code> command",
      "Removed Halloween decorations",
      "Fixed some duplicate objects on the map",
      "Fixed issues with cloudflare verification window not working properly",
      "Fixed issues with some sprites",
      "Fixed issues with opening mobile keyboard on some devices",
      "Fixed issues with drawing lights in certain cases",
      "Improved networking performance",
      "Improved server performance"
    ]
  },
  {
    "version": "v0.37.0",
    "changes": [
      "Added 2 new music tracks",
      "Added new head, face, neck, chest and back accessories",
      "Added new sleeve options for chest accessories",
      "Added new manes",
      "Added new tails",
      "Added new face markings",
      "Added new horn and horn patterns",
      "Added new eyelashes",
      "Added new ears",
      "Added new hooves",
      "Added ear patterns",
      "Added pants back accessory",
      "Added Halloween decorations",
      "Added spooks",
      "Changed google sign-in icon",
      "Updated team and contributors lists",
      "Updated head accessory positions for each mane",
      "Fixed issues with install button",
      "Fixed issues with mobile keyboard in app mode",
      "Fixed issues with map loading in certain cases",
      "Fixed some sprite layering issues",
      "Fixed some site links not working in certain cases",
      "Fixed cutting off some pixels when exporting fly animation as PNG",
      "Fixed color in butt mark editor changing when switching tabs",
      "Improved rendering performance"
    ]
  },
  {
    "version": "v0.36.1",
    "changes": [
      "Updated facebook sign-in",
      "Fixed some lighting issues",
      "Improved lighting performance"
    ]
  },
  {
    "version": "v0.36.0",
    "changes": [
      "Changed season to autumn",
      "Increased map size",
      "Added new locations and road system",
      "Added some rule explanations to <em>Common issues</em> section on <em>Help</em> page",
      "Improved lighting engine",
      "Fixed issues with character not shown as flying in some cases",
      "Fixed issues with updating Patreon data",
      "Fixed issues with game update process",
      "Fixed issues with loosing item counters when merging accounts in certain situations",
      "Fixed issues with getting kicked out of the party in certain situations",
      "Fixed incorrect symbol used for <code>:trans:</code> emoji"
    ]
  },
  {
    "version": "v0.35.7",
    "changes": [
      "Added warning message for some outdated browsers",
      "Improved networking performance",
      "Fixed \"Um.\" and \"Um-\" text causing expression to change",
      "Fixed some issues with character selection",
      "Fixed some issues with name display",
      "Fixed issues with Cloudflare reloading"
    ]
  },
  {
    "version": "v0.35.6",
    "changes": [
      "Improved server performance",
      "Improved network usage"
    ]
  },
  {
    "version": "v0.35.5",
    "changes": [
      "Added option to install the game on android devices",
      "Improved startup performance",
      "Improved server performance",
      "Fixed party list covering chat buttons in some cases on small screens",
      "Fixed issues with experimental progressive map loading"
    ]
  },
  {
    "version": "v0.35.4",
    "changes": [
      "Added experimental progressive map loading",
      "Added power saving option to settings",
      "Improved performance of map loading",
      "Reworked internal server communication",
      "Fixed layering issues with some accessories",
      "Fixed incorrect hitbox for flying ponies",
      "Fixed issues with drawing ponies at the edge of the screen",
      "Fixed some unhelpful error messages",
      "Fixed some words interpreted as expressions",
      "Fixed some issues with movement on slow networks",
      "Fixed some issues with boop animation when lying down",
      "Fixed some issues with error reporting"
    ]
  },
  {
    "version": "v0.35.3",
    "changes": [
      "Added <code>b.d</code> / <code>6.6</code> expression",
      "Added fly animation to character editor",
      "Improved visibility checking",
      "Improved networking performance",
      "Fixed issue with disappearing party member portraits",
      "Fixed server-side performance issues",
      "Fixed update notification not showing when joined during an update",
      "Fixed server shutdown issues",
      "Fixed incorrect hitbox for flying characters",
      "Fixed server-side timing issues"
    ]
  },
  {
    "version": "v0.35.2",
    "changes": [
      "Fixed performance issues when a lot of users are joining the server at the same time"
    ]
  },
  {
    "version": "v0.35.1",
    "changes": [
      "Fixed performance issues with ignore system and hiding system",
      "Fixed performance issues when a lot of users are joining the server at the same time"
    ]
  },
  {
    "version": "v0.35.0",
    "changes": [
      "Added flying - <kbd>C</kbd> key or <kbd class=\"gamepad gamepad-dpad\"><div class=\"dpad-up\"></div></kbd> button or <code>/fly</code> command",
      "Added booping while flying",
      "Added flying above water"
    ]
  }
];
