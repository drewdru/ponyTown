import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'orderBy',
})
export class OrderByPipe implements PipeTransform {
	transform(value: any[] | undefined, compare?: any) {
		return value && value.slice().sort(compare);
	}
}
