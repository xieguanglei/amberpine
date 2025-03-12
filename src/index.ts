import path from 'path';
import _ from 'lodash';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import pug from 'pug';
import RSS from 'rss';
import { fileURLToPath } from 'url';
import { renderMarkdown } from './marked.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type IBlogMeta = {
    title: string,
    description?: string,
    keywords?: Array<string>,
    author?: string,
    url?: string,
    links?: {
        rss?: string,
        github?: string,
        author?: string
    }
}

export type IPostMeta = {
    key: string,
    title: string,
    date: string,
    path: string,
    keywords?: Array<string>,
    mathjax?: boolean,
    highlight?: boolean,
    hidden?: boolean,
    hide_date?: boolean,
}

const cwd = process.cwd();

const sourceDir = path.join(cwd, 'source');
const distDir = path.join(cwd, 'dist');
const templateDir = path.join(__dirname, '../templates');
const assetsDir = path.join(cwd, 'assets');

async function amberpine(cwd: string): Promise<void> {

    const blogMeta: IBlogMeta = await getBlogMeta();
    const postMetaList: Array<IPostMeta> = await getPostMetaList();

    await generateIndex(blogMeta, postMetaList);
    for (const post of postMetaList) {
        await generatePost(blogMeta, post);
    }

    if (blogMeta.links && blogMeta.links.rss) {
        await generateFeed(blogMeta, postMetaList.filter(item => !item.hidden));
    }

    await fs.copy(assetsDir, path.join(distDir, 'blog/assets'), { overwrite: true });
}

export async function getBlogMeta(): Promise<IBlogMeta> {
    const blogMetaString: string = await fs.readFile(path.join(sourceDir, 'blog.yaml'), 'utf-8');
    return yaml.load(blogMetaString) as IBlogMeta;
}
export async function getPostMetaList(): Promise<Array<IPostMeta>> {
    const dates: Array<string> = await fs.readdir(sourceDir);
    let res: Array<IPostMeta> = [];
    for (let date of dates) {

        if (!date.startsWith('.') && date.match(/^\d{4}-\d{2}-\d{2}$/) && (await fs.stat(path.resolve(sourceDir, date))).isDirectory()) {

            const posts = await fs.readdir(path.resolve(sourceDir, date));
            for (const post of posts) {
                let meta = await getPostMeta(post, date);
                res.push(meta);
            }
        }
    }
    res = _.sortBy(res, r => r.date);
    res = _.reverse(res);
    return res;
}
export async function getPostMeta(title: string, date: string): Promise<IPostMeta> {
    let content = await fs.readFile(path.resolve(sourceDir, date, title, 'index.yaml'), 'utf-8');
    const meta = yaml.load(content) as IPostMeta;
    meta.key = meta.path;
    meta.title = title;
    meta.date = date;
    return meta;
}

let renderIndexFunc: pug.compileTemplate | null = null;
export async function renderIndex(blogMeta: IBlogMeta, postMetaList: Array<IPostMeta>): Promise<string> {
    if (!renderIndexFunc) {
        const template: string = await fs.readFile(path.resolve(templateDir, 'index.pug'), 'utf-8');
        renderIndexFunc = pug.compile(template, {
            filename: path.resolve(templateDir, 'index.pug'),
            pretty: true
        });
    }
    return renderIndexFunc({
        blog: blogMeta,
        postList: postMetaList.filter(meta => !meta.hidden)
    })
}
async function generateIndex(blogMeta: IBlogMeta, postMetaList: Array<IPostMeta>): Promise<void> {
    const content: string = await renderIndex(blogMeta, postMetaList);
    await fs.ensureDir(distDir);
    await fs.writeFile(path.resolve(distDir, 'index.html'), content);
    console.log(`home -- index.html done.`);
}

let renderPostFunc: pug.compileTemplate | null = null;
export async function renderPost(blogMeta: IBlogMeta, postMeta: IPostMeta): Promise<string> {
    if (!renderPostFunc) {
        const template: string = await fs.readFile(path.resolve(templateDir, 'post.pug'), 'utf-8');
        renderPostFunc = pug.compile(template, {
            filename: path.resolve(templateDir, 'post.pug'),
            pretty: true
        });
    }
    const mdStr: string = await fs.readFile(path.resolve(sourceDir, postMeta.date, postMeta.title, 'index.md'), 'utf-8');
    const main: string = await renderMarkdown(mdStr, {
        key: postMeta.key,
        mathjax: !!postMeta.mathjax,
        postDir: path.resolve(sourceDir, postMeta.date, postMeta.title)
    });
    const content: string = renderPostFunc({
        blog: {
            ...blogMeta,
            keywords: [...(blogMeta.keywords || []), ...(postMeta.keywords || [])]
        },
        post: { ...postMeta, main: main }
    });
    return content;
}
async function generatePost(blogMeta: IBlogMeta, postMeta: IPostMeta): Promise<void> {
    const content = await renderPost(blogMeta, postMeta);
    await fs.ensureDir(path.resolve(distDir, 'blog/post'));
    await fs.writeFile(path.resolve(distDir, 'blog/post', postMeta.key + '.html'), content);
    console.log(`post -- ${postMeta.title} done.`);
}

export async function renderFeed(blogMeta: IBlogMeta, postMetaList: Array<IPostMeta>): Promise<string> {

    const feed = new RSS({
        title: blogMeta.title,
        description: blogMeta.description,
        feed_url: blogMeta.links?.rss || '',
        site_url: blogMeta.url || '',
    });

    postMetaList = postMetaList.splice(0, 5);

    for (const post of postMetaList) {

        let mdStr: string = await fs.readFile(path.resolve(sourceDir, post.date, post.title, 'index.md'), 'utf-8');

        const lines = mdStr.split('\n');

        if (lines[0].startsWith('#')) {
            lines.shift();
        }
        while (lines[0].trim() === '') {
            lines.shift();
        }

        const text = lines.join('\n');

        let content: string = await renderMarkdown(text, {
            key: post.key,
            mathjax: !!post.mathjax,
            postDir: path.resolve(sourceDir, post.key)
        });

        feed.item({
            title: post.title,
            description: content,
            url: `${blogMeta.url}blog/post/${post.key}.html`,
            guid: post.key,
            author: blogMeta.author,
            date: new Date(post.date)
        });
    }

    const xml: string = feed.xml({
        indent: true
    });

    return xml;
}

async function generateFeed(blogMeta: IBlogMeta, postMetaList: Array<IPostMeta>): Promise<void> {

    const xml = await renderFeed(blogMeta, postMetaList);

    await fs.writeFile(path.resolve(distDir, 'blog/feed.xml'), xml, 'utf-8');
    console.log(`feed -- RSS feed done.`);
}

export async function init(cwd: string = process.cwd()) {
    await fs.copy(path.join(__dirname, '../init'), cwd, { overwrite: true });
    console.log('Initialize success');
}

export default amberpine;