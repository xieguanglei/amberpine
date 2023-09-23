import * as url from 'url';
import { Renderer, marked } from 'marked';
import hljs from 'highlight.js';
import { execSync } from 'child_process';

const currentRenderOptions = { mathjax: false };

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




const withMathjax = <T extends any[]>(
    render: (...t: T) => string,
    extractText: (...t: T) => string,
    assembleArgs: (text: string, ...t: T) => T,
    renderer: Renderer
) => {
    return function (...t: T): string {

        if (currentRenderOptions.mathjax) {

            let text = extractText(...t);

            const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
            const tex2mml = '../bin/tex2svg';

            if (text.startsWith('\\begin')) {

                text = text.replaceAll('&amp;', '&');
                console.log(`gen tex...`);
                text = execSync(`node -r esm ${tex2mml} "${text}"`, { cwd: __dirname }).toString();

            } else if (text.includes('$')) {

                const parts = text.split('$');

                if (parts.length % 2 === 1) {

                    let transformed: string[] = [];

                    for (const [i, part] of parts.entries()) {

                        console.log(`gen tex inline...`);

                        if (i % 2 === 0) {
                            transformed[i] = part;
                        } else {
                            let p = parts[i];
                            p = p.replaceAll('&amp;', '&');
                            console.log('p==>', p);
                            transformed[i] = execSync(`node -r esm ${tex2mml} "${p}" --inline`, { cwd: __dirname }).toString();
                        }
                    }

                    console.log(`transformed==>`, transformed);


                    text = transformed.join('');
                }
            }

            const args = assembleArgs(text, ...t);

            return render.call(renderer, ...args);
        } else {
            return render.call(renderer, ...t);
        }
    }
}




renderer.paragraph = withMathjax(
    renderer.paragraph,
    (source: string) => source,
    (text: string, source: string) => ([text] as [string]),
    renderer
);

renderer.listitem = withMathjax(
    renderer.listitem,
    (source: string, task: boolean, checked: boolean) => source,
    (text: string, source: string, task: boolean, checked: boolean) => ([text, task, checked] as [string, boolean, boolean]),
    renderer
);



export const renderMarkdown = (source: string, options: { mathjax?: boolean } = {}): string => {

    currentRenderOptions.mathjax = !!options.mathjax;

    return marked(source, { renderer });
};
