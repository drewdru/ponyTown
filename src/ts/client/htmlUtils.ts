import { hasEmojis, splitEmojis, findEmoji, getEmojiImageAsync } from './emoji';
import { Dict } from '../common/interfaces';
import { font } from './fonts';
import { getCharacterSprite } from '../graphics/spriteFont';

export function createHtmlNodes(value: string | undefined, scale: number): Node[] {
	return value ? splitEmojis(value).map(x => {
		const sprite = hasEmojis(x) && font && getCharacterSprite(x, font);

		if (sprite) {
			const emote = findEmoji(x);
			const img = document.createElement('img');
			img.className = 'pixelart';
			img.style.display = 'inline-block';
			img.style.visibility = 'hidden';
			img.style.width = `${(sprite.w + sprite.ox) * scale}px`;
			img.style.height = `${10 * scale}px`;

			if (emote) {
				img.setAttribute('aria-label', emote.names[0]);
			}

			getEmojiImageAsync(sprite, src => {
				img.alt = x;
				img.src = src;
				img.style.visibility = 'visible';
			});

			return img;
		} else {
			return document.createTextNode(x);
		}
	}) : [];
}

export function textNode(text: string) {
	return document.createTextNode(text);
}

export function element(
	tag: string, className?: string, nodes?: (Node | undefined)[], attrs?: Dict<any>, events?: Dict<() => any>
) {
	const element = document.createElement(tag);

	if (className) {
		element.className = className;
	}

	if (nodes !== undefined) {
		appendAllNodes(element, nodes);
	}

	if (attrs !== undefined) {
		Object.keys(attrs).forEach(key => element.setAttribute(key, attrs[key]));
	}

	if (events !== undefined) {
		Object.keys(events).forEach(key => element.addEventListener(key, events[key]));
	}

	return element;
}

export function appendAllNodes(element: Element, nodes: (Node | undefined)[]) {
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];

		if (node !== undefined) {
			element.appendChild(node);
		}
	}
}

export function removeAllNodes(element: Element) {
	let child: Node | null;

	while (child = element.lastChild) {
		element.removeChild(child);
	}
}

export function removeFirstChild(element: HTMLElement) {
	let child: Node | null;

	if (child = element.firstChild) {
		element.removeChild(child);
	}
}

export function removeElement(element: HTMLElement) {
	element.parentElement && element.parentElement.removeChild(element);
}

export function replaceNodes(element: HTMLElement, text: string) {
	while (element.lastChild && element.lastChild !== element.firstChild) {
		element.removeChild(element.lastChild);
	}

	let firstChild = element.firstChild;

	if (!firstChild) {
		element.appendChild(firstChild = textNode(''));
	}

	if (hasEmojis(text)) {
		firstChild.nodeValue = '';
		appendAllNodes(element, createHtmlNodes(text, 2));
	} else {
		firstChild.nodeValue = text;
	}
}

export function findParentElement(element: HTMLElement, selector: string) {
	const elements = Array.from(document.querySelectorAll(selector));
	let current = element.parentElement;

	while (current && elements.indexOf(current) === -1) {
		current = current.parentElement;
	}

	return current;
}

export function findFocusableElements(root: HTMLElement) {
	const elements = root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
	return Array.from(elements) as HTMLElement[];
}

export function focusFirstElement(root: HTMLElement) {
	const elements = findFocusableElements(root);

	if (elements.length) {
		elements[0].focus();
		return elements[0];
	}

	return undefined;
}

export function focusElement(root: HTMLElement, selector: string) {
	const target = root.querySelector(selector) as HTMLElement | null;

	if (target) {
		target.focus();
	}
}

export function focusElementAfterTimeout(root: HTMLElement, selector: string) {
	setTimeout(() => focusElement(root, selector), 10);
}

export function isParentOf(parent: Element, child: Element) {
	for (let current = child.parentElement; current; current = current.parentElement) {
		if (current === parent) {
			return true;
		}
	}

	return false;
}

export function showTextInNewTab(text: string) {
	const wnd = window.open()!;
	const pre = wnd.document.createElement('pre');
	pre.innerText = text;
	wnd.document.body.appendChild(pre);
}

export function addStyle(style: string) {
	const styleElement = document.createElement('style');
	styleElement.appendChild(document.createTextNode(style));
	document.head.appendChild(styleElement);
	return styleElement;
}
