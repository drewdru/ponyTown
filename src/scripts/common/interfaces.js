"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const colors_1 = require("./colors");
var Season;
(function (Season) {
    Season[Season["Summer"] = 1] = "Summer";
    Season[Season["Autumn"] = 2] = "Autumn";
    Season[Season["Winter"] = 4] = "Winter";
    Season[Season["Spring"] = 8] = "Spring";
})(Season = exports.Season || (exports.Season = {}));
var Holiday;
(function (Holiday) {
    Holiday[Holiday["None"] = 0] = "None";
    Holiday[Holiday["Christmas"] = 1] = "Christmas";
    Holiday[Holiday["Halloween"] = 2] = "Halloween";
    Holiday[Holiday["StPatricks"] = 3] = "StPatricks";
    Holiday[Holiday["Easter"] = 4] = "Easter";
})(Holiday = exports.Holiday || (exports.Holiday = {}));
var Weather;
(function (Weather) {
    Weather[Weather["None"] = 0] = "None";
    Weather[Weather["Rain"] = 1] = "Rain";
})(Weather = exports.Weather || (exports.Weather = {}));
var MapType;
(function (MapType) {
    MapType[MapType["None"] = 0] = "None";
    MapType[MapType["Island"] = 1] = "Island";
    MapType[MapType["House"] = 2] = "House";
    MapType[MapType["Cave"] = 3] = "Cave";
})(MapType = exports.MapType || (exports.MapType = {}));
var MapFlags;
(function (MapFlags) {
    MapFlags[MapFlags["None"] = 0] = "None";
    MapFlags[MapFlags["EditableWalls"] = 1] = "EditableWalls";
    MapFlags[MapFlags["EditableEntities"] = 2] = "EditableEntities";
    MapFlags[MapFlags["EditableTiles"] = 4] = "EditableTiles";
    MapFlags[MapFlags["EdibleGrass"] = 8] = "EdibleGrass";
})(MapFlags = exports.MapFlags || (exports.MapFlags = {}));
var NotificationFlags;
(function (NotificationFlags) {
    NotificationFlags[NotificationFlags["None"] = 0] = "None";
    NotificationFlags[NotificationFlags["Ok"] = 1] = "Ok";
    NotificationFlags[NotificationFlags["Yes"] = 2] = "Yes";
    NotificationFlags[NotificationFlags["No"] = 4] = "No";
    NotificationFlags[NotificationFlags["Accept"] = 8] = "Accept";
    NotificationFlags[NotificationFlags["Reject"] = 16] = "Reject";
    NotificationFlags[NotificationFlags["Supporter"] = 32] = "Supporter";
    NotificationFlags[NotificationFlags["Ignore"] = 64] = "Ignore";
    NotificationFlags[NotificationFlags["NameBad"] = 128] = "NameBad";
})(NotificationFlags = exports.NotificationFlags || (exports.NotificationFlags = {}));
function isPaletteSpriteBatch(batch) {
    return batch.palette;
}
exports.isPaletteSpriteBatch = isPaletteSpriteBatch;
var ServerFlags;
(function (ServerFlags) {
    ServerFlags[ServerFlags["None"] = 0] = "None";
    ServerFlags[ServerFlags["TreeCrown"] = 1] = "TreeCrown";
    ServerFlags[ServerFlags["DoNotSave"] = 2] = "DoNotSave";
    ServerFlags[ServerFlags["Seasonal"] = 4] = "Seasonal";
})(ServerFlags = exports.ServerFlags || (exports.ServerFlags = {}));
var EntityFlags;
(function (EntityFlags) {
    EntityFlags[EntityFlags["None"] = 0] = "None";
    EntityFlags[EntityFlags["Movable"] = 1] = "Movable";
    EntityFlags[EntityFlags["Decal"] = 2] = "Decal";
    EntityFlags[EntityFlags["Critter"] = 4] = "Critter";
    EntityFlags[EntityFlags["Usable"] = 8] = "Usable";
    EntityFlags[EntityFlags["Debug"] = 16] = "Debug";
    EntityFlags[EntityFlags["StaticY"] = 32] = "StaticY";
    EntityFlags[EntityFlags["CanCollide"] = 64] = "CanCollide";
    EntityFlags[EntityFlags["CanCollideWith"] = 128] = "CanCollideWith";
    EntityFlags[EntityFlags["Interactive"] = 256] = "Interactive";
    EntityFlags[EntityFlags["Light"] = 512] = "Light";
    EntityFlags[EntityFlags["OnOff"] = 1024] = "OnOff";
    EntityFlags[EntityFlags["Bobbing"] = 2048] = "Bobbing";
    EntityFlags[EntityFlags["IgnoreTool"] = 4096] = "IgnoreTool";
})(EntityFlags = exports.EntityFlags || (exports.EntityFlags = {}));
var EntityState;
(function (EntityState) {
    EntityState[EntityState["None"] = 0] = "None";
    // general
    EntityState[EntityState["Flying"] = 1] = "Flying";
    EntityState[EntityState["FacingRight"] = 2] = "FacingRight";
    // lights
    EntityState[EntityState["On"] = 4] = "On";
    // other
    EntityState[EntityState["Editable"] = 8] = "Editable";
    // pony
    EntityState[EntityState["HeadTurned"] = 4] = "HeadTurned";
    EntityState[EntityState["Magic"] = 8] = "Magic";
    // CanFly ?, // Or in flags ?
    // pony state
    EntityState[EntityState["PonyStanding"] = 0] = "PonyStanding";
    EntityState[EntityState["PonyWalking"] = 16] = "PonyWalking";
    EntityState[EntityState["PonyTrotting"] = 32] = "PonyTrotting";
    EntityState[EntityState["PonySitting"] = 48] = "PonySitting";
    EntityState[EntityState["PonyLying"] = 64] = "PonyLying";
    EntityState[EntityState["PonyFlying"] = 80] = "PonyFlying";
    EntityState[EntityState["PonyStateMask"] = 240] = "PonyStateMask";
    // animated entities
    EntityState[EntityState["AnimationMask"] = 240] = "AnimationMask";
    // max 0xff
})(EntityState = exports.EntityState || (exports.EntityState = {}));
var EntityPlayerState;
(function (EntityPlayerState) {
    EntityPlayerState[EntityPlayerState["None"] = 0] = "None";
    EntityPlayerState[EntityPlayerState["Ignored"] = 1] = "Ignored";
    EntityPlayerState[EntityPlayerState["Hidden"] = 2] = "Hidden";
    EntityPlayerState[EntityPlayerState["Friend"] = 4] = "Friend";
    // max 0xff
})(EntityPlayerState = exports.EntityPlayerState || (exports.EntityPlayerState = {}));
function getAnimationFromEntityState(state) {
    return (state & 240 /* AnimationMask */) >> 4;
}
exports.getAnimationFromEntityState = getAnimationFromEntityState;
function setAnimationToEntityState(state, animation) {
    return (state & ~240 /* AnimationMask */) | (animation << 4);
}
exports.setAnimationToEntityState = setAnimationToEntityState;
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Chat"] = 0] = "Chat";
    MessageType[MessageType["System"] = 1] = "System";
    MessageType[MessageType["Admin"] = 2] = "Admin";
    MessageType[MessageType["Mod"] = 3] = "Mod";
    MessageType[MessageType["Party"] = 4] = "Party";
    MessageType[MessageType["Thinking"] = 5] = "Thinking";
    MessageType[MessageType["PartyThinking"] = 6] = "PartyThinking";
    MessageType[MessageType["Announcement"] = 7] = "Announcement";
    MessageType[MessageType["PartyAnnouncement"] = 8] = "PartyAnnouncement";
    MessageType[MessageType["Supporter1"] = 9] = "Supporter1";
    MessageType[MessageType["Supporter2"] = 10] = "Supporter2";
    MessageType[MessageType["Supporter3"] = 11] = "Supporter3";
    MessageType[MessageType["Dismiss"] = 12] = "Dismiss";
    MessageType[MessageType["Whisper"] = 13] = "Whisper";
    MessageType[MessageType["WhisperTo"] = 14] = "WhisperTo";
    MessageType[MessageType["WhisperAnnouncement"] = 15] = "WhisperAnnouncement";
    MessageType[MessageType["WhisperToAnnouncement"] = 16] = "WhisperToAnnouncement";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
function toMessageType(type) {
    if (type === 15 /* WhisperAnnouncement */) {
        return 16 /* WhisperToAnnouncement */;
    }
    else {
        return 14 /* WhisperTo */;
    }
}
exports.toMessageType = toMessageType;
function toAnnouncementMessageType(type) {
    switch (type) {
        case 1 /* Party */: return 8 /* PartyAnnouncement */;
        case 9 /* Whisper */: return 15 /* WhisperAnnouncement */;
        default: return 7 /* Announcement */;
    }
}
exports.toAnnouncementMessageType = toAnnouncementMessageType;
function isWhisper(type) {
    return type === 13 /* Whisper */ ||
        type === 15 /* WhisperAnnouncement */;
}
exports.isWhisper = isWhisper;
function isWhisperTo(type) {
    return type === 14 /* WhisperTo */ ||
        type === 16 /* WhisperToAnnouncement */;
}
exports.isWhisperTo = isWhisperTo;
function isThinking(type) {
    return type === 5 /* Thinking */ ||
        type === 6 /* PartyThinking */;
}
exports.isThinking = isThinking;
function isModOrAdminMessage(type) {
    return type === 3 /* Mod */ ||
        type === 2 /* Admin */;
}
exports.isModOrAdminMessage = isModOrAdminMessage;
function isPartyMessage(type) {
    return type === 4 /* Party */ ||
        type === 6 /* PartyThinking */ ||
        type === 8 /* PartyAnnouncement */;
}
exports.isPartyMessage = isPartyMessage;
function isPublicMessage(type) {
    return type === 0 /* Chat */ ||
        type === 5 /* Thinking */ ||
        type === 7 /* Announcement */ ||
        type === 2 /* Admin */ ||
        type === 3 /* Mod */ ||
        type === 9 /* Supporter1 */ ||
        type === 10 /* Supporter2 */ ||
        type === 11 /* Supporter3 */;
}
exports.isPublicMessage = isPublicMessage;
function isNonIgnorableMessage(type) {
    return isModOrAdminMessage(type) ||
        isPartyMessage(type) ||
        type === 1 /* System */ ||
        type === 12 /* Dismiss */ ||
        type === 7 /* Announcement */;
}
exports.isNonIgnorableMessage = isNonIgnorableMessage;
var ChatType;
(function (ChatType) {
    ChatType[ChatType["Say"] = 0] = "Say";
    ChatType[ChatType["Party"] = 1] = "Party";
    ChatType[ChatType["Think"] = 2] = "Think";
    ChatType[ChatType["PartyThink"] = 3] = "PartyThink";
    ChatType[ChatType["Supporter"] = 4] = "Supporter";
    ChatType[ChatType["Supporter1"] = 5] = "Supporter1";
    ChatType[ChatType["Supporter2"] = 6] = "Supporter2";
    ChatType[ChatType["Supporter3"] = 7] = "Supporter3";
    ChatType[ChatType["Dismiss"] = 8] = "Dismiss";
    ChatType[ChatType["Whisper"] = 9] = "Whisper";
})(ChatType = exports.ChatType || (exports.ChatType = {}));
function isPartyChat(type) {
    return type === 1 /* Party */ || type === 3 /* PartyThink */;
}
exports.isPartyChat = isPartyChat;
function isPublicChat(type) {
    return type !== 1 /* Party */ &&
        type !== 3 /* PartyThink */ &&
        type !== 8 /* Dismiss */ &&
        type !== 9 /* Whisper */;
}
exports.isPublicChat = isPublicChat;
var InteractAction;
(function (InteractAction) {
    InteractAction[InteractAction["None"] = 0] = "None";
    InteractAction[InteractAction["Toolbox"] = 1] = "Toolbox";
    InteractAction[InteractAction["GiveLantern"] = 2] = "GiveLantern";
    InteractAction[InteractAction["GiveFruits"] = 3] = "GiveFruits";
    InteractAction[InteractAction["GiveCookie1"] = 4] = "GiveCookie1";
    InteractAction[InteractAction["GiveCookie2"] = 5] = "GiveCookie2";
})(InteractAction = exports.InteractAction || (exports.InteractAction = {}));
var DoAction;
(function (DoAction) {
    DoAction[DoAction["None"] = 0] = "None";
    DoAction[DoAction["Boop"] = 1] = "Boop";
    DoAction[DoAction["Swing"] = 2] = "Swing";
    DoAction[DoAction["HoldPoof"] = 3] = "HoldPoof";
})(DoAction = exports.DoAction || (exports.DoAction = {}));
var AccountDataFlags;
(function (AccountDataFlags) {
    AccountDataFlags[AccountDataFlags["None"] = 0] = "None";
    AccountDataFlags[AccountDataFlags["Duplicates"] = 1] = "Duplicates";
    AccountDataFlags[AccountDataFlags["PastSupporter"] = 4] = "PastSupporter";
})(AccountDataFlags = exports.AccountDataFlags || (exports.AccountDataFlags = {}));
var FriendStatusFlags;
(function (FriendStatusFlags) {
    FriendStatusFlags[FriendStatusFlags["None"] = 0] = "None";
    FriendStatusFlags[FriendStatusFlags["Online"] = 1] = "Online";
    FriendStatusFlags[FriendStatusFlags["Remove"] = 2] = "Remove";
})(FriendStatusFlags = exports.FriendStatusFlags || (exports.FriendStatusFlags = {}));
// NOTE: also update in serverActions.ts
var PlayerAction;
(function (PlayerAction) {
    PlayerAction[PlayerAction["None"] = 0] = "None";
    PlayerAction[PlayerAction["Ignore"] = 1] = "Ignore";
    PlayerAction[PlayerAction["Unignore"] = 2] = "Unignore";
    PlayerAction[PlayerAction["InviteToParty"] = 3] = "InviteToParty";
    PlayerAction[PlayerAction["RemoveFromParty"] = 4] = "RemoveFromParty";
    PlayerAction[PlayerAction["PromotePartyLeader"] = 5] = "PromotePartyLeader";
    PlayerAction[PlayerAction["HidePlayer"] = 6] = "HidePlayer";
    PlayerAction[PlayerAction["InviteToSupporterServers"] = 7] = "InviteToSupporterServers";
    PlayerAction[PlayerAction["AddFriend"] = 8] = "AddFriend";
    PlayerAction[PlayerAction["RemoveFriend"] = 9] = "RemoveFriend";
})(PlayerAction = exports.PlayerAction || (exports.PlayerAction = {}));
var ModAction;
(function (ModAction) {
    ModAction[ModAction["None"] = 0] = "None";
    ModAction[ModAction["Report"] = 1] = "Report";
    ModAction[ModAction["Mute"] = 2] = "Mute";
    ModAction[ModAction["Shadow"] = 3] = "Shadow";
    ModAction[ModAction["Kick"] = 4] = "Kick";
    ModAction[ModAction["Ban"] = 5] = "Ban";
})(ModAction = exports.ModAction || (exports.ModAction = {}));
var LeaveReason;
(function (LeaveReason) {
    LeaveReason[LeaveReason["None"] = 0] = "None";
    LeaveReason[LeaveReason["Swearing"] = 1] = "Swearing";
})(LeaveReason = exports.LeaveReason || (exports.LeaveReason = {}));
var UpdateType;
(function (UpdateType) {
    UpdateType[UpdateType["None"] = 0] = "None";
    UpdateType[UpdateType["AddEntity"] = 1] = "AddEntity";
    UpdateType[UpdateType["UpdateEntity"] = 2] = "UpdateEntity";
    UpdateType[UpdateType["RemoveEntity"] = 3] = "RemoveEntity";
    UpdateType[UpdateType["UpdateTile"] = 4] = "UpdateTile";
})(UpdateType = exports.UpdateType || (exports.UpdateType = {}));
var WorldStateFlags;
(function (WorldStateFlags) {
    WorldStateFlags[WorldStateFlags["None"] = 0] = "None";
    WorldStateFlags[WorldStateFlags["Safe"] = 1] = "Safe";
})(WorldStateFlags = exports.WorldStateFlags || (exports.WorldStateFlags = {}));
exports.defaultMapState = {
    weather: 0 /* None */,
};
var WallType;
(function (WallType) {
    WallType[WallType["None"] = 0] = "None";
    WallType[WallType["Wood"] = 1] = "Wood";
})(WallType = exports.WallType || (exports.WallType = {}));
var TileType;
(function (TileType) {
    TileType[TileType["None"] = 0] = "None";
    TileType[TileType["Dirt"] = 1] = "Dirt";
    TileType[TileType["Grass"] = 2] = "Grass";
    TileType[TileType["Water"] = 3] = "Water";
    TileType[TileType["Wood"] = 4] = "Wood";
    TileType[TileType["Ice"] = 5] = "Ice";
    TileType[TileType["SnowOnIce"] = 6] = "SnowOnIce";
    TileType[TileType["WalkableWater"] = 7] = "WalkableWater";
    TileType[TileType["Boat"] = 8] = "Boat";
    TileType[TileType["WalkableIce"] = 9] = "WalkableIce";
    TileType[TileType["Stone"] = 10] = "Stone";
    TileType[TileType["Stone2"] = 11] = "Stone2";
    TileType[TileType["ElevatedDirt"] = 12] = "ElevatedDirt";
    // special
    TileType[TileType["WallH"] = 100] = "WallH";
    TileType[TileType["WallV"] = 101] = "WallV";
})(TileType = exports.TileType || (exports.TileType = {}));
exports.tileTypeNames = [
    'none', 'dirt', 'grass', 'water', 'wood', 'ice', 'snow-on-ice', 'walkable-water', 'boat', 'walkable-ice',
    'stone', 'stone-2', 'elevated-dirt',
];
exports.houseTiles = [
    { type: 1 /* Dirt */, name: 'Dirt' },
    { type: 4 /* Wood */, name: 'Wood' },
    { type: 2 /* Grass */, name: 'Grass' },
    { type: 3 /* Water */, name: 'Water' },
    { type: 5 /* Ice */, name: 'Ice' },
    { type: 10 /* Stone */, name: 'Stone' },
    { type: 11 /* Stone2 */, name: 'Brick' },
];
function canWalk(tile) {
    return tile !== 0 /* None */;
}
exports.canWalk = canWalk;
function isValidTile(tile) {
    return tile === 1 /* Dirt */ || tile === 2 /* Grass */;
}
exports.isValidTile = isValidTile;
function isValidModTile(tile) {
    return tile >= 0 /* None */ && tile < 100 /* WallH */;
}
exports.isValidModTile = isValidModTile;
var PartyFlags;
(function (PartyFlags) {
    PartyFlags[PartyFlags["None"] = 0] = "None";
    PartyFlags[PartyFlags["Leader"] = 1] = "Leader";
    PartyFlags[PartyFlags["Pending"] = 2] = "Pending";
    PartyFlags[PartyFlags["Offline"] = 4] = "Offline";
})(PartyFlags = exports.PartyFlags || (exports.PartyFlags = {}));
var Action;
(function (Action) {
    Action[Action["None"] = 0] = "None";
    Action[Action["Boop"] = 1] = "Boop";
    Action[Action["TurnHead"] = 2] = "TurnHead";
    Action[Action["Yawn"] = 3] = "Yawn";
    Action[Action["Laugh"] = 4] = "Laugh";
    Action[Action["Sneeze"] = 5] = "Sneeze";
    Action[Action["Sit"] = 6] = "Sit";
    Action[Action["Lie"] = 7] = "Lie";
    Action[Action["Fly"] = 8] = "Fly";
    Action[Action["UnhideAllHiddenPlayers"] = 9] = "UnhideAllHiddenPlayers";
    Action[Action["Stand"] = 10] = "Stand";
    Action[Action["SwapCharacter"] = 11] = "SwapCharacter";
    Action[Action["HoldPoof"] = 12] = "HoldPoof";
    Action[Action["Sleep"] = 13] = "Sleep";
    Action[Action["Drop"] = 14] = "Drop";
    Action[Action["DropToy"] = 15] = "DropToy";
    Action[Action["Blush"] = 16] = "Blush";
    Action[Action["Cry"] = 17] = "Cry";
    Action[Action["Love"] = 18] = "Love";
    Action[Action["CancelSupporterInvite"] = 19] = "CancelSupporterInvite";
    Action[Action["Info"] = 20] = "Info";
    Action[Action["KeepAlive"] = 21] = "KeepAlive";
    Action[Action["RemoveFriend"] = 22] = "RemoveFriend";
    Action[Action["FriendsCRC"] = 23] = "FriendsCRC";
    Action[Action["RequestEntityInfo"] = 24] = "RequestEntityInfo";
    Action[Action["ACL"] = 25] = "ACL";
    Action[Action["Magic"] = 26] = "Magic";
    Action[Action["RemoveEntity"] = 27] = "RemoveEntity";
    Action[Action["PlaceEntity"] = 28] = "PlaceEntity";
    Action[Action["SwitchTool"] = 29] = "SwitchTool";
    Action[Action["SwitchToolRev"] = 30] = "SwitchToolRev";
    Action[Action["SwitchToPlaceTool"] = 31] = "SwitchToPlaceTool";
    Action[Action["SwitchToTileTool"] = 32] = "SwitchToTileTool";
})(Action = exports.Action || (exports.Action = {}));
var InfoFlags;
(function (InfoFlags) {
    InfoFlags[InfoFlags["None"] = 0] = "None";
    InfoFlags[InfoFlags["Incognito"] = 1] = "Incognito";
    InfoFlags[InfoFlags["SupportsWASM"] = 2] = "SupportsWASM";
    InfoFlags[InfoFlags["SupportsLetAndConst"] = 4] = "SupportsLetAndConst";
})(InfoFlags = exports.InfoFlags || (exports.InfoFlags = {}));
function isExpressionAction(action) {
    return action === 3 /* Yawn */ || action === 4 /* Laugh */ || action === 5 /* Sneeze */;
}
exports.isExpressionAction = isExpressionAction;
var SelectFlags;
(function (SelectFlags) {
    SelectFlags[SelectFlags["None"] = 0] = "None";
    SelectFlags[SelectFlags["FetchEx"] = 1] = "FetchEx";
    SelectFlags[SelectFlags["FetchInfo"] = 2] = "FetchInfo";
})(SelectFlags = exports.SelectFlags || (exports.SelectFlags = {}));
var PonyStateFlags;
(function (PonyStateFlags) {
    PonyStateFlags[PonyStateFlags["None"] = 0] = "None";
    PonyStateFlags[PonyStateFlags["CurlTail"] = 1] = "CurlTail";
    PonyStateFlags[PonyStateFlags["FaceForward"] = 2] = "FaceForward";
})(PonyStateFlags = exports.PonyStateFlags || (exports.PonyStateFlags = {}));
var NoDraw;
(function (NoDraw) {
    NoDraw[NoDraw["None"] = 0] = "None";
    NoDraw[NoDraw["Front"] = 1] = "Front";
    NoDraw[NoDraw["Front2"] = 2] = "Front2";
    NoDraw[NoDraw["BehindLeg"] = 4] = "BehindLeg";
    NoDraw[NoDraw["BehindBody"] = 8] = "BehindBody";
    NoDraw[NoDraw["Behind"] = 16] = "Behind";
    NoDraw[NoDraw["Body"] = 32] = "Body";
    NoDraw[NoDraw["BodyOnly"] = 64] = "BodyOnly";
    NoDraw[NoDraw["FarEar"] = 128] = "FarEar";
    NoDraw[NoDraw["CloseEar"] = 256] = "CloseEar";
    NoDraw[NoDraw["FaceAccessory1"] = 512] = "FaceAccessory1";
    NoDraw[NoDraw["FaceAccessory2"] = 1024] = "FaceAccessory2";
    NoDraw[NoDraw["TopMane"] = 2048] = "TopMane";
    NoDraw[NoDraw["FrontMane"] = 4096] = "FrontMane";
    NoDraw[NoDraw["Nose"] = 8192] = "Nose";
    NoDraw[NoDraw["Head"] = 16384] = "Head";
    NoDraw[NoDraw["Eyes"] = 32768] = "Eyes";
    NoDraw[NoDraw["BackAccessory"] = 65536] = "BackAccessory";
    NoDraw[NoDraw["BackLeg"] = 131072] = "BackLeg";
    NoDraw[NoDraw["BackFarLeg"] = 262144] = "BackFarLeg";
    NoDraw[NoDraw["FrontLeg"] = 524288] = "FrontLeg";
    NoDraw[NoDraw["FrontFarLeg"] = 1048576] = "FrontFarLeg";
    NoDraw[NoDraw["FarSleeves"] = 2097152] = "FarSleeves";
    NoDraw[NoDraw["CloseSleeves"] = 4194304] = "CloseSleeves";
    NoDraw[NoDraw["FarEarShade"] = 8388608] = "FarEarShade";
    NoDraw[NoDraw["Ears"] = 384] = "Ears";
    NoDraw[NoDraw["WholeHead"] = 24960] = "WholeHead";
    NoDraw[NoDraw["FarLegs"] = 1310720] = "FarLegs";
    NoDraw[NoDraw["CloseLegs"] = 655360] = "CloseLegs";
    NoDraw[NoDraw["AllLegs"] = 1966080] = "AllLegs";
    NoDraw[NoDraw["Sleeves"] = 6291456] = "Sleeves";
})(NoDraw = exports.NoDraw || (exports.NoDraw = {}));
// expression
var Muzzle;
(function (Muzzle) {
    Muzzle[Muzzle["Smile"] = 0] = "Smile";
    Muzzle[Muzzle["Frown"] = 1] = "Frown";
    Muzzle[Muzzle["Neutral"] = 2] = "Neutral";
    Muzzle[Muzzle["Scrunch"] = 3] = "Scrunch";
    Muzzle[Muzzle["Blep"] = 4] = "Blep";
    Muzzle[Muzzle["SmileOpen"] = 5] = "SmileOpen";
    Muzzle[Muzzle["Flat"] = 6] = "Flat";
    Muzzle[Muzzle["Concerned"] = 7] = "Concerned";
    Muzzle[Muzzle["ConcernedOpen"] = 8] = "ConcernedOpen";
    Muzzle[Muzzle["SmileOpen2"] = 9] = "SmileOpen2";
    Muzzle[Muzzle["FrownOpen"] = 10] = "FrownOpen";
    Muzzle[Muzzle["NeutralOpen2"] = 11] = "NeutralOpen2";
    Muzzle[Muzzle["ConcernedOpen2"] = 12] = "ConcernedOpen2";
    Muzzle[Muzzle["Kiss"] = 13] = "Kiss";
    Muzzle[Muzzle["SmileOpen3"] = 14] = "SmileOpen3";
    Muzzle[Muzzle["NeutralOpen3"] = 15] = "NeutralOpen3";
    Muzzle[Muzzle["ConcernedOpen3"] = 16] = "ConcernedOpen3";
    Muzzle[Muzzle["Kiss2"] = 17] = "Kiss2";
    Muzzle[Muzzle["SmileTeeth"] = 18] = "SmileTeeth";
    Muzzle[Muzzle["FrownTeeth"] = 19] = "FrownTeeth";
    Muzzle[Muzzle["NeutralTeeth"] = 20] = "NeutralTeeth";
    Muzzle[Muzzle["ConcernedTeeth"] = 21] = "ConcernedTeeth";
    Muzzle[Muzzle["SmilePant"] = 22] = "SmilePant";
    Muzzle[Muzzle["NeutralPant"] = 23] = "NeutralPant";
    Muzzle[Muzzle["Oh"] = 24] = "Oh";
    Muzzle[Muzzle["FlatBlep"] = 25] = "FlatBlep";
    // max: 31
})(Muzzle = exports.Muzzle || (exports.Muzzle = {}));
exports.CLOSED_MUZZLES = [
    0 /* Smile */, 1 /* Frown */, 2 /* Neutral */, 3 /* Scrunch */, 6 /* Flat */, 7 /* Concerned */,
    13 /* Kiss */, 17 /* Kiss2 */,
];
var Eye;
(function (Eye) {
    Eye[Eye["None"] = 0] = "None";
    Eye[Eye["Neutral"] = 1] = "Neutral";
    Eye[Eye["Neutral2"] = 2] = "Neutral2";
    Eye[Eye["Neutral3"] = 3] = "Neutral3";
    Eye[Eye["Neutral4"] = 4] = "Neutral4";
    Eye[Eye["Neutral5"] = 5] = "Neutral5";
    Eye[Eye["Closed"] = 6] = "Closed";
    Eye[Eye["Frown"] = 7] = "Frown";
    Eye[Eye["Frown2"] = 8] = "Frown2";
    Eye[Eye["Frown3"] = 9] = "Frown3";
    Eye[Eye["Frown4"] = 10] = "Frown4";
    Eye[Eye["Lines"] = 11] = "Lines";
    Eye[Eye["ClosedHappy3"] = 12] = "ClosedHappy3";
    Eye[Eye["ClosedHappy2"] = 13] = "ClosedHappy2";
    Eye[Eye["ClosedHappy"] = 14] = "ClosedHappy";
    Eye[Eye["Sad"] = 15] = "Sad";
    Eye[Eye["Sad2"] = 16] = "Sad2";
    Eye[Eye["Sad3"] = 17] = "Sad3";
    Eye[Eye["Sad4"] = 18] = "Sad4";
    Eye[Eye["Angry"] = 19] = "Angry";
    Eye[Eye["Angry2"] = 20] = "Angry2";
    Eye[Eye["Peaceful"] = 21] = "Peaceful";
    Eye[Eye["Peaceful2"] = 22] = "Peaceful2";
    Eye[Eye["X"] = 23] = "X";
    Eye[Eye["X2"] = 24] = "X2";
    // max: 31
})(Eye = exports.Eye || (exports.Eye = {}));
function isEyeSleeping(eye) {
    return eye === 6 /* Closed */ ||
        (eye >= 11 /* Lines */ && eye <= 14 /* ClosedHappy */) ||
        (eye >= 21 /* Peaceful */ && eye <= 24 /* X2 */);
}
exports.isEyeSleeping = isEyeSleeping;
var Iris;
(function (Iris) {
    Iris[Iris["Forward"] = 0] = "Forward";
    Iris[Iris["Up"] = 1] = "Up";
    Iris[Iris["Left"] = 2] = "Left";
    Iris[Iris["Right"] = 3] = "Right";
    Iris[Iris["UpLeft"] = 4] = "UpLeft";
    Iris[Iris["UpRight"] = 5] = "UpRight";
    Iris[Iris["Shocked"] = 6] = "Shocked";
    Iris[Iris["Down"] = 7] = "Down";
    // max: 15
    Iris[Iris["COUNT"] = 8] = "COUNT";
})(Iris = exports.Iris || (exports.Iris = {}));
var ExpressionExtra;
(function (ExpressionExtra) {
    ExpressionExtra[ExpressionExtra["None"] = 0] = "None";
    ExpressionExtra[ExpressionExtra["Blush"] = 1] = "Blush";
    ExpressionExtra[ExpressionExtra["Zzz"] = 2] = "Zzz";
    ExpressionExtra[ExpressionExtra["Cry"] = 4] = "Cry";
    ExpressionExtra[ExpressionExtra["Tears"] = 8] = "Tears";
    ExpressionExtra[ExpressionExtra["Hearts"] = 16] = "Hearts";
    // max: 31
})(ExpressionExtra = exports.ExpressionExtra || (exports.ExpressionExtra = {}));
var Engine;
(function (Engine) {
    Engine[Engine["Default"] = 0] = "Default";
    Engine[Engine["LayeredTiles"] = 1] = "LayeredTiles";
    Engine[Engine["Whiteness"] = 2] = "Whiteness";
    Engine[Engine["NewLighting"] = 3] = "NewLighting";
    Engine[Engine["Total"] = 4] = "Total";
})(Engine = exports.Engine || (exports.Engine = {}));
exports.defaultDrawOptions = {
    gameTime: 0,
    lightColor: colors_1.WHITE,
    shadowColor: colors_1.SHADOW_COLOR,
    drawHidden: false,
    showColliderMap: false,
    showHeightmap: false,
    debug: {},
    gridLines: false,
    tileIndices: false,
    tileGrid: false,
    engine: Engine.Default,
    season: 1 /* Summer */,
    error: () => { },
};
exports.defaultWorldState = {
    season: 1 /* Summer */,
};
var UpdateFlags;
(function (UpdateFlags) {
    UpdateFlags[UpdateFlags["None"] = 0] = "None";
    UpdateFlags[UpdateFlags["Position"] = 1] = "Position";
    UpdateFlags[UpdateFlags["Velocity"] = 2] = "Velocity";
    UpdateFlags[UpdateFlags["State"] = 4] = "State";
    UpdateFlags[UpdateFlags["Expression"] = 8] = "Expression";
    UpdateFlags[UpdateFlags["Type"] = 16] = "Type";
    UpdateFlags[UpdateFlags["Options"] = 32] = "Options";
    UpdateFlags[UpdateFlags["Info"] = 64] = "Info";
    UpdateFlags[UpdateFlags["Action"] = 128] = "Action";
    UpdateFlags[UpdateFlags["Name"] = 256] = "Name";
    UpdateFlags[UpdateFlags["NameBad"] = 512] = "NameBad";
    UpdateFlags[UpdateFlags["PlayerState"] = 1024] = "PlayerState";
    UpdateFlags[UpdateFlags["SwitchRegion"] = 2048] = "SwitchRegion";
    // max 32768
})(UpdateFlags = exports.UpdateFlags || (exports.UpdateFlags = {}));
//# sourceMappingURL=interfaces.js.map