"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emoji_1 = require("./emoji");
const fonts_1 = require("./fonts");
const spriteFont_1 = require("../graphics/spriteFont");
function createHtmlNodes(value, scale) {
    return value ? emoji_1.splitEmojis(value).map(x => {
        const sprite = emoji_1.hasEmojis(x) && fonts_1.font && spriteFont_1.getCharacterSprite(x, fonts_1.font);
        if (sprite) {
            const emote = emoji_1.findEmoji(x);
            const img = document.createElement('img');
            img.className = 'pixelart';
            img.style.display = 'inline-block';
            img.style.visibility = 'hidden';
            img.style.width = `${(sprite.w + sprite.ox) * scale}px`;
            img.style.height = `${10 * scale}px`;
            if (emote) {
                img.setAttribute('aria-label', emote.names[0]);
            }
            emoji_1.getEmojiImageAsync(sprite, src => {
                img.alt = x;
                img.src = src;
                img.style.visibility = 'visible';
            });
            return img;
        }
        else {
            return document.createTextNode(x);
        }
    }) : [];
}
exports.createHtmlNodes = createHtmlNodes;
function textNode(text) {
    return document.createTextNode(text);
}
exports.textNode = textNode;
function element(tag, className, nodes, attrs, events) {
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
exports.element = element;
function appendAllNodes(element, nodes) {
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node !== undefined) {
            element.appendChild(node);
        }
    }
}
exports.appendAllNodes = appendAllNodes;
function removeAllNodes(element) {
    let child;
    while (child = element.lastChild) {
        element.removeChild(child);
    }
}
exports.removeAllNodes = removeAllNodes;
function removeFirstChild(element) {
    let child;
    if (child = element.firstChild) {
        element.removeChild(child);
    }
}
exports.removeFirstChild = removeFirstChild;
function removeElement(element) {
    element.parentElement && element.parentElement.removeChild(element);
}
exports.removeElement = removeElement;
function replaceNodes(element, text) {
    while (element.lastChild && element.lastChild !== element.firstChild) {
        element.removeChild(element.lastChild);
    }
    let firstChild = element.firstChild;
    if (!firstChild) {
        element.appendChild(firstChild = textNode(''));
    }
    if (emoji_1.hasEmojis(text)) {
        firstChild.nodeValue = '';
        appendAllNodes(element, createHtmlNodes(text, 2));
    }
    else {
        firstChild.nodeValue = text;
    }
}
exports.replaceNodes = replaceNodes;
function findParentElement(element, selector) {
    const elements = Array.from(document.querySelectorAll(selector));
    let current = element.parentElement;
    while (current && elements.indexOf(current) === -1) {
        current = current.parentElement;
    }
    return current;
}
exports.findParentElement = findParentElement;
function findFocusableElements(root) {
    const elements = root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    return Array.from(elements);
}
exports.findFocusableElements = findFocusableElements;
function focusFirstElement(root) {
    const elements = findFocusableElements(root);
    if (elements.length) {
        elements[0].focus();
        return elements[0];
    }
    return undefined;
}
exports.focusFirstElement = focusFirstElement;
function focusElement(root, selector) {
    const target = root.querySelector(selector);
    if (target) {
        target.focus();
    }
}
exports.focusElement = focusElement;
function focusElementAfterTimeout(root, selector) {
    setTimeout(() => focusElement(root, selector), 10);
}
exports.focusElementAfterTimeout = focusElementAfterTimeout;
function isParentOf(parent, child) {
    for (let current = child.parentElement; current; current = current.parentElement) {
        if (current === parent) {
            return true;
        }
    }
    return false;
}
exports.isParentOf = isParentOf;
function showTextInNewTab(text) {
    const wnd = window.open();
    const pre = wnd.document.createElement('pre');
    pre.innerText = text;
    wnd.document.body.appendChild(pre);
}
exports.showTextInNewTab = showTextInNewTab;
function addStyle(style) {
    const styleElement = document.createElement('style');
    styleElement.appendChild(document.createTextNode(style));
    document.head.appendChild(styleElement);
    return styleElement;
}
exports.addStyle = addStyle;
//# sourceMappingURL=htmlUtils.js.map