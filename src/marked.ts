import { marked } from 'marked';
import hljs from 'highlight.js';

marked.setOptions({
    highlight: function (code, lang): string {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    }
});

const renderer = new marked.Renderer();

const renderImage = renderer.image;

renderer.image = function (href: string, title: string, text: string): string {

    const origin: string = renderImage.call(this, href, title, text);

    if (text) {
        return `<figure>${origin}<figurecaption>${text}</figcaption></figure>`;
    } else {
        return origin;
    }
}

export default function (src: string) {
    return marked(src, { renderer });
}