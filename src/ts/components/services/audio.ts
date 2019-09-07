import { Injectable } from '@angular/core';
import { Howl } from 'howler';
import { random, sample } from 'lodash';
import { Season, Holiday, MapType } from '../../common/interfaces';
import { getUrl } from '../../client/rev';

interface Track {
	name: string;
	src: string[];
	howl?: Howl;
}

function getTracks(season: Season, holiday: Holiday, map: MapType) {
	switch (map) {
		case MapType.Island:
			return [
				'island',
				'sunny-island',
			];
		case MapType.House:
			return [
				'happy-house',
				'sweet-home',
			];
		case MapType.Cave:
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
				...(season === Season.Winter ? [
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
				...(season === Season.Winter ? [
					'xmas-air',
					'xmas-horns',
					'xmas-presents',
				] : []),
				...(holiday === Holiday.Halloween ? [
					'ghost',
					'pumpkin',
				] : []),
			];
	}
}

const FADE_TRACKS = true;

function fadeOut(track: Track, id: number, volume: number) {
	const howl = track && track.howl;

	if (howl) {
		if (FADE_TRACKS) {
			howl
				.fade(volume, 0, 1000, id)
				.once('fade', () => howl.pause(id).stop(id), id);
		} else {
			howl
				.volume(0, id)
				.pause(id)
				.stop(id);
		}
	}
}

function fadeIn(track: Track, id: number, volume: number) {
	if (track && track.howl) {
		track.howl.fade(0, volume, 1000, id);
	}
}

interface Instance {
	id: number;
	track: Track;
}

@Injectable({ providedIn: 'root' })
export class Audio {
	private tracks: Track[] = [];
	private volume = 0;
	private loops = 0;
	private playing = false;
	private stopped: Instance[] = [];
	private instance?: Instance;
	get trackName() {
		return this.instance && this.volume ? this.instance.track.name : '';
	}
	initTracks(season: Season, holiday: Holiday, map: MapType) {
		const tracks = getTracks(season, holiday, map);

		// Make new tracks more frequent
		// const duplicateTracks = tracks.filter(t => t === 'ghost' || t === 'pumpkin');
		// tracks.push(...duplicateTracks);
		// tracks.push(...duplicateTracks);

		this.tracks = tracks.map(name => ({ name, src: [getUrl(`music/${name}.webm`), getUrl(`music/${name}.mp3`)] }));
		this.loops = 0;
	}
	setVolume(volume: number) {
		this.volume = volume / 100;

		if (this.playing) {
			if (this.instance) {
				this.setInstanceVolume(this.instance, this.volume);
			} else if (this.volume) {
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
					} else {
						this.playRandomTrack();
					}
				}
			}
		} catch (e) {
			console.error(e);
		}
	}
	playOrSwitchToRandomTrack() {
		if (FADE_TRACKS) {
			if (this.playing && this.volume) {
				this.playRandomTrack();
			} else {
				this.play();
			}
		} else {
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
		if (!this.instance || !this.instance.track.howl!.playing(this.instance.id)) {
			this.playRandomTrack();
		}
	}
	touch() {
		this.stopInstances();
		this.setInstanceVolume(this.instance, this.volume);
	}
	private switchToTrack(track: Track) {
		if (this.instance && this.instance.track === track) {
			return false;
		} else {
			this.stopInstance(this.instance);
			this.instance = this.playTrack(track);
			return true;
		}
	}
	playRandomTrack() {
		while (!this.switchToTrack(sample(this.tracks)!))
			;

		this.loops = random(4, 7);
	}
	private playTrack(track: Track): Instance {
		this.prepareTrack(track);
		const id = track.howl!.play();
		fadeIn(track, id, this.volume);
		return { id, track };
	}
	private resumeInstance({ track, id }: Instance) {
		track.howl!.play(id);
		fadeIn(track, id, this.volume);
	}
	private stopInstance(instance: Instance | undefined) {
		if (instance) {
			this.stopped.push(instance);
		}

		this.stopInstances();
	}
	private stopInstances() {
		this.stopped.forEach(({ track, id }) => fadeOut(track, id, this.volume));
		this.stopped = this.stopped.filter(({ track, id }) => track.howl!.playing(id));
	}
	private setInstanceVolume(instance: Instance | undefined, volume: number) {
		if (instance) {
			const howl = instance.track.howl!;
			howl.volume(volume, instance.id);

			if (volume && !howl.playing(instance.id)) {
				howl.play(instance.id);
			} else if (!volume && howl.playing(instance.id)) {
				howl.pause(instance.id);
			}
		}
	}
	private prepareTrack(track: Track) {
		if (!track.howl) {
			track.howl = new Howl({
				src: track.src,
				loop: true,
				html5: true,
			});

			track.howl.on('end', id => this.onEnd(id));
		}
	}
	private handlingOnEnd = 0;
	private handlingOnEndAt = 0;
	private onEnd(id: number) {
		if (
			this.instance && this.instance.id === id && --this.loops < 0 &&
			(this.handlingOnEnd !== id || this.handlingOnEndAt < performance.now())
		) {
			this.handlingOnEnd = id;
			this.handlingOnEndAt = performance.now() + 500;

			if (this.volume && this.playing) {
				this.playRandomTrack();
			} else {
				this.stopInstance(this.instance);
			}
		}
	}
}
