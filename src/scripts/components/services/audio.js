"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const howler_1 = require("howler");
const lodash_1 = require("lodash");
const rev_1 = require("../../client/rev");
function getTracks(season, holiday, map) {
    switch (map) {
        case 1 /* Island */:
            return [
                'island',
                'sunny-island',
            ];
        case 2 /* House */:
            return [
                'happy-house',
                'sweet-home',
            ];
        case 3 /* Cave */:
            return [
                'cave-crystals',
                'cave-secrets',
            ];
        default:
            return [
                //'largo',
                //'musicbox',
                //'unrest',
                'bossanova',
                'clop',
                'fivefour',
                'hypnosis',
                'scherzo',
                'trills',
                'waltzalt',
                ...(season === 4 /* Winter */ ? [
                    'trees-winter',
                    'reindeer-winter',
                ] : [
                    'trees',
                    'reindeer',
                ]),
                'season',
                'ambient',
                'building',
                'school',
                'falling',
                'tio',
                'orchid',
                ...(season === 4 /* Winter */ ? [
                    'xmas-air',
                    'xmas-horns',
                    'xmas-presents',
                ] : []),
                ...(holiday === 2 /* Halloween */ ? [
                    'ghost',
                    'pumpkin',
                ] : []),
            ];
    }
}
const FADE_TRACKS = true;
function fadeOut(track, id, volume) {
    const howl = track && track.howl;
    if (howl) {
        if (FADE_TRACKS) {
            howl
                .fade(volume, 0, 1000, id)
                .once('fade', () => howl.pause(id).stop(id), id);
        }
        else {
            howl
                .volume(0, id)
                .pause(id)
                .stop(id);
        }
    }
}
function fadeIn(track, id, volume) {
    if (track && track.howl) {
        track.howl.fade(0, volume, 1000, id);
    }
}
let Audio = class Audio {
    constructor() {
        this.tracks = [];
        this.volume = 0;
        this.loops = 0;
        this.playing = false;
        this.stopped = [];
        this.handlingOnEnd = 0;
        this.handlingOnEndAt = 0;
    }
    get trackName() {
        return this.instance && this.volume ? this.instance.track.name : '';
    }
    initTracks(season, holiday, map) {
        const tracks = getTracks(season, holiday, map);
        // Make new tracks more frequent
        // const duplicateTracks = tracks.filter(t => t === 'ghost' || t === 'pumpkin');
        // tracks.push(...duplicateTracks);
        // tracks.push(...duplicateTracks);
        this.tracks = tracks.map(name => ({ name, src: [rev_1.getUrl(`music/${name}.webm`), rev_1.getUrl(`music/${name}.mp3`)] }));
        this.loops = 0;
    }
    setVolume(volume) {
        this.volume = volume / 100;
        if (this.playing) {
            if (this.instance) {
                this.setInstanceVolume(this.instance, this.volume);
            }
            else if (this.volume) {
                this.playRandomTrack();
            }
        }
    }
    play() {
        try {
            if (!this.playing) {
                this.playing = true;
                if (this.volume) {
                    if (this.instance) {
                        this.resumeInstance(this.instance);
                    }
                    else {
                        this.playRandomTrack();
                    }
                }
            }
        }
        catch (e) {
            console.error(e);
        }
    }
    playOrSwitchToRandomTrack() {
        if (FADE_TRACKS) {
            if (this.playing && this.volume) {
                this.playRandomTrack();
            }
            else {
                this.play();
            }
        }
        else {
            this.play();
        }
    }
    stop() {
        if (this.playing) {
            this.playing = false;
            this.stopInstance(this.instance);
        }
    }
    forcePlay() {
        if (!this.instance || !this.instance.track.howl.playing(this.instance.id)) {
            this.playRandomTrack();
        }
    }
    touch() {
        this.stopInstances();
        this.setInstanceVolume(this.instance, this.volume);
    }
    switchToTrack(track) {
        if (this.instance && this.instance.track === track) {
            return false;
        }
        else {
            this.stopInstance(this.instance);
            this.instance = this.playTrack(track);
            return true;
        }
    }
    playRandomTrack() {
        while (!this.switchToTrack(lodash_1.sample(this.tracks)))
            ;
        this.loops = lodash_1.random(4, 7);
    }
    playTrack(track) {
        this.prepareTrack(track);
        const id = track.howl.play();
        fadeIn(track, id, this.volume);
        return { id, track };
    }
    resumeInstance({ track, id }) {
        track.howl.play(id);
        fadeIn(track, id, this.volume);
    }
    stopInstance(instance) {
        if (instance) {
            this.stopped.push(instance);
        }
        this.stopInstances();
    }
    stopInstances() {
        this.stopped.forEach(({ track, id }) => fadeOut(track, id, this.volume));
        this.stopped = this.stopped.filter(({ track, id }) => track.howl.playing(id));
    }
    setInstanceVolume(instance, volume) {
        if (instance) {
            const howl = instance.track.howl;
            howl.volume(volume, instance.id);
            if (volume && !howl.playing(instance.id)) {
                howl.play(instance.id);
            }
            else if (!volume && howl.playing(instance.id)) {
                howl.pause(instance.id);
            }
        }
    }
    prepareTrack(track) {
        if (!track.howl) {
            track.howl = new howler_1.Howl({
                src: track.src,
                loop: true,
                html5: true,
            });
            track.howl.on('end', id => this.onEnd(id));
        }
    }
    onEnd(id) {
        if (this.instance && this.instance.id === id && --this.loops < 0 &&
            (this.handlingOnEnd !== id || this.handlingOnEndAt < performance.now())) {
            this.handlingOnEnd = id;
            this.handlingOnEndAt = performance.now() + 500;
            if (this.volume && this.playing) {
                this.playRandomTrack();
            }
            else {
                this.stopInstance(this.instance);
            }
        }
    }
};
Audio = tslib_1.__decorate([
    core_1.Injectable({ providedIn: 'root' })
], Audio);
exports.Audio = Audio;
//# sourceMappingURL=audio.js.map