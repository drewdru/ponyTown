import { Component, Input, Output, EventEmitter } from '@angular/core';
import { times, formatISODate, parseISODate, createValidBirthDate } from '../../../common/utils';
import { MONTH_NAMES_EN } from '../../../common/constants';
import { getLocale } from '../../../client/clientUtils';

@Component({
	selector: 'date-picker',
	templateUrl: 'date-picker.pug',
})
export class DatePicker {
	readonly days = times(31, i => i + 1);
	readonly years: number[] = [];
	readonly months = getMonthNames();
	day = 0;
	month = 0;
	year = 0;
	@Output() dateChange = new EventEmitter<string | undefined>();
	constructor() {
		const minYear = 1914;
		const maxYear = (new Date()).getFullYear() - 6;

		for (let year = maxYear; year >= minYear; year--) {
			this.years.push(year);
		}
	}
	@Input() get date() {
		const date = createValidBirthDate(this.day, this.month, this.year);
		return date && formatISODate(date);
	}
	set date(value) {
		if (value) {
			const { day, month, year } = parseISODate(value);
			this.day = day;
			this.month = month;
			this.year = year;
		}
	}
	change() {
		this.dateChange.emit(this.date);
	}
}

function getMonthNames() {
	try {
		const format = new Intl.DateTimeFormat(getLocale(), { month: 'long' });

		return times(12, i => {
			const date = new Date(523456789);
			date.setMonth(i);
			return format.format(date);
		});
	} catch {
		return MONTH_NAMES_EN;
	}
}
