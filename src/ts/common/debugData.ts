import { MessageType } from './interfaces';

export const sampleMessages: { name: string; message: string; id?: number; type?: MessageType; }[] = [];

if (DEVELOPMENT) {
	sampleMessages.push(
		{ name: 'Soubi', message: 'Me lo hubieras dicho al menos.', type: MessageType.Party },
		{ name: 'Doggy', message: 'Mira un menor' },
		{ name: 'carry *br*', message: 'menos frama vai...nunca te falei isso' },
		{ name: 'Doggy', message: 'A uste le gustan menores' },
		{ name: 'Doggy', message: 'Pero no soy menor de edad' },
		{ name: 'springtrap girl(:3)', message: 'pelo menos desincalho' },
		{ name: 'Foxy (Menina)', message: 'que vida em a metade do povo sabe menos nois ;-;' },
		{ name: 'Mangle (br)', message: 'mais pelo menos meus pais ta aqui em casa', type: MessageType.Party },
		{ name: 'Experiment-z30 (ESP)', message: 'Con una menos en la clase' },
		{ name: '🌙 Ň✞ĦŦΜΔŘ€ ŞΔŇŞ 🌙', message: 'aceita q doi menos' },
		{ name: '⭐✨柊|Lihan|柊✨⭐', message: 'quanta frescura no rabo mano, aceita que doi menos' },
		{ name: '🌙 Ň✞ĦŦΜΔŘ€ ŞΔŇŞ 🌙', message: 'aceita q doi menos' },
		{ name: '⭐✨柊|Lihan|柊✨⭐', message: 'quanta frescura no rabo mano, aceita que doi menos' },
		{ name: 'Ilenos Pijama', message: 'Muito menos participar' },
		{ name: 'luz(br)', message: 'pelo menos fan nao vai comer todos os lanches' },
		{ name: '=tord=', message: 'quien saque menos' },
		{ name: 'ladybug', message: 'mais ou menos .-.' },
		{ name: 'springtrap girl(:3)', message: 'pelo menos desincalho' },
		{ name: 'Foxy (Menina)', message: 'que vida em a metade do povo sabe menos nois ;-;' },
		{ name: 'Experiment-z30 (ESP)', message: 'Con una menos en la clase' },
		{ name: 'Ilenos Pijama', message: 'Muito menos participar' },
		{ name: 'Mangle (br)', message: 'mais pelo menos meus pais ta aqui em casa', type: MessageType.Party },
		{ name: 'luz(br)', message: 'pelo menos fan nao vai comer todos os lanches' },
		{
			message: '/help - show help\n/roll [[min-]max] - randomize a number\n/s - say\n/p - party chat\n/t - thinking baloon',
			name: '', type: MessageType.System,
		},
		{ name: 'Molley', message: 'Some admin message here', type: MessageType.Admin },
		{ name: 'Dolleyert', message: 'Some moderator message here', type: MessageType.Mod },
		{ name: '', message: 'The server will restart soon', type: MessageType.Announcement },
		{ name: 'Molley', message: '🎲 rolled 5 of 100', type: MessageType.Announcement },
		{ name: 'Molley', message: 'Some thinki👻n👻g 🍎 mes<b>aaa</b>sage', type: MessageType.Thinking },
		{ name: 'Molley', message: 'Some party thinking message', type: MessageType.PartyThinking },
		{ name: 'Molley', message: 'Some supporter 🙂 message 1', type: MessageType.Supporter1 },
		{ name: 'Molley', message: 'Some supporter 🙂 message 2', type: MessageType.Supporter2, id: 1 },
		{ name: 'Molley', message: 'Some supporter 🙂 message 3', type: MessageType.Supporter3, id: 2 },
		{ name: 'Molley', message: 'Some whisper message', type: MessageType.Whisper, id: 2 },
		{ name: 'WWWWWWWWWWWWWWWWWWWW', message: 'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW' },
		{ name: 'WWWWWWWWWWWWWWWWWWWW', message: 'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW' },
		{ name: 'tord ⚧☿♁⚨⚩⚦⚢⚣⚤', message: 'quien saque menos ⚧☿♁⚨⚩⚦⚢⚣⚤' },
		{ name: 'more symbols', message: '♈♉♊♋♌♍♎♏♐♑♒♓⛎♈♉♊♋♌♍♎♏♐♑♒♓⛎♈♉♊♋♌♍♎♏♐♑♒♓⛎' },
	);
}
