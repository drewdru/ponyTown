import { Pipe, PipeTransform } from '@angular/core';
import { transliterate } from 'transliteration';

@Pipe({
	name: 'translit',
})
export class TranslitPipe implements PipeTransform {
	transform(value: string) {
		if (!value || /^[a-z0-9-_.,\[\]!@#$%^&*{}|\/\\ ]+$/i.test(value))
			return undefined;

		const translit = transliterate(value);
		return translit !== value ? translit : undefined;
	}
}
