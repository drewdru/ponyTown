import '../lib';
import { expect } from 'chai';
import { SinonStub, stub } from 'sinon';
import {
	textNode, element, removeAllNodes, removeFirstChild, createHtmlNodes, replaceNodes, findParentElement
} from '../../client/htmlUtils';
import { removeItem } from '../../common/utils';

class MockHTMLElement {
	nodeType = 'element';
	children: any[] = [];
	events: any = {};
	attributes: any = {};
	className?: string;
	parentElement?: MockHTMLElement;
	constructor(public tagName: string) { }
	get firstChild() {
		return this.children[0];
	}
	get lastChild() {
		return this.children[this.children.length - 1];
	}
	setAttribute(key: string, value: any) {
		this.attributes[key] = value;
	}
	addEventListener(key: string, callback: any) {
		this.events[key] = callback;
	}
	appendChild(node: any) {
		this.children.push(node);
	}
	removeChild(node: any) {
		removeItem(this.children, node);
	}
}

class MockTextNode {
	constructor(public nodeValue: string) { }
}

describe('htmlUtils', () => {
	let querySelectorAll: SinonStub;

	beforeEach(() => {
		querySelectorAll = stub();

		(global as any).document = {
			createElement(tagName: string) {
				return new MockHTMLElement(tagName);
			},
			createTextNode(value: string) {
				return new MockTextNode(value);
			},
			querySelectorAll,
		};
	});

	afterEach(() => {
		delete (global as any).document;
	});

	describe('createHtmlNodes()', () => {
		it('creates single text node with given text', () => {
			const nodes = createHtmlNodes('foo bar', 1);

			expect(nodes.length).equal(1);
			expect(nodes[0]).instanceof(MockTextNode);
			expect(nodes[0].nodeValue).equal('foo bar');
		});

		it('creates empty array for empty text', () => {
			const nodes = createHtmlNodes('', 1);

			expect(nodes.length).equal(0);
		});
	});

	describe('textNode()', () => {
		it('creates new text node', () => {
			const node = textNode('foo');

			expect(node).instanceof(MockTextNode);
			expect(node.nodeValue).equal('foo');
		});
	});

	describe('element()', () => {
		it('creates new HTML element', () => {
			const div = element('div', 'foo-bar');

			expect(div).instanceof(MockHTMLElement);
			expect(div.tagName).equal('div');
		});

		it('sets class name', () => {
			const div = element('div', 'foo-bar');

			expect(div.className).equal('foo-bar');
		});

		it('sets attribute values', () => {
			const div = element('div', undefined, undefined, { foo: 'bar', test: 'boo' });

			expect(div.attributes).eql({ foo: 'bar', test: 'boo' });
		});

		it('sets event listeners', () => {
			const click = () => { };
			const touch = () => { };

			const div: any = element('div', undefined, undefined, undefined, { click, touch });

			expect(div.events.click).equal(click);
			expect(div.events.touch).equal(touch);
		});

		it('appends child nodes', () => {
			const a = element('a');
			const b = element('b');

			const div = element('div', undefined, [a, b]);

			expect(div.children[0]).equal(a);
			expect(div.children[1]).equal(b);
		});

		it('skips undefined nodes when appending child nodes', () => {
			const a = element('a');
			const b = element('b');

			const div = element('div', undefined, [a, undefined, b]);

			expect(div.children[0]).equal(a);
			expect(div.children[1]).equal(b);
		});
	});

	describe('removeAllNodes()', () => {
		it('removes all child nodes from element', () => {
			const div = element('div', undefined, [element('a'), element('b')]);

			removeAllNodes(div as any);

			expect(div.children).eql([]);
		});

		it('does nothing for no child nodes', () => {
			const div = element('div', undefined, []);

			removeAllNodes(div as any);

			expect(div.children).eql([]);
		});
	});

	describe('removeFirstChild()', () => {
		it('removes all child nodes from element', () => {
			const a = element('a');
			const b = element('b');
			const div = element('div', undefined, [a, b]);

			removeFirstChild(div as any);

			expect(div.children.length).equal(1);
			expect(div.children[0]).equal(b);
		});

		it('does nothing for no child nodes', () => {
			const div = element('div', undefined, []);

			removeFirstChild(div as any);

			expect(div.children).eql([]);
		});
	});

	describe('replaceNodes()', () => {
		it('adds new child nodes', () => {
			const div = element('div', undefined, []);

			replaceNodes(div as any, 'foo bar');

			expect(div.children.length).equal(1);
			expect(div.children[0]).instanceof(MockTextNode);
			expect(div.children[0].nodeValue).equal('foo bar');
		});

		it('removes all but first node', () => {
			const a = textNode('a');
			const b = textNode('b');
			const div = element('div', undefined, [a, b]);

			replaceNodes(div as any, 'foo bar');

			expect(div.children.length).equal(1);
			expect(div.children[0]).equal(a);
			expect(div.children[0].nodeValue).equal('foo bar');
		});
	});

	describe('findParentElement()', () => {
		it('returns matched parent element', () => {
			const div1 = element('div');
			const div2 = element('div');
			(div1 as any).parentElement = div2;
			querySelectorAll.withArgs('foo > bar').returns([div2]);

			expect(findParentElement(div1, 'foo > bar')).equal(div2);
		});

		it('returns matched parent element', () => {
			const div1 = element('div');
			const div2 = element('div');
			const div3 = element('div');
			(div1 as any).parentElement = div2;
			(div2 as any).parentElement = div3;
			querySelectorAll.withArgs('foo > bar').returns([div3]);

			expect(findParentElement(div1, 'foo > bar')).equal(div3);
		});
	});
});
