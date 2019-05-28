const path = require('path');

const fs = require('util-promisifyall')(require('fs-extra'));
const ncp = require('util').promisify(require('ncp').ncp);

const yaml = require('yaml-js');
const _ = require('lodash');
const pug = require('pug');
const marked = require('marked');
const RSS = require('rss');


const cwd = process.cwd();
const sourceDir = path.join(cwd, 'source');
const distDir = path.join(cwd, 'dist');
const templateDir = path.join(__dirname, '../templates');
const assetsDir = path.join(cwd, 'assets');

async function amberpine(cwd) {

    const blogMeta = await getBlogMeta();
    const postMetaList = await getPostMetaList();

    await generateIndex(blogMeta, postMetaList.filter(item => !item.hidden));
    for (const post of postMetaList) {
        await generatePost(blogMeta, post);
    }

    if (blogMeta.links && blogMeta.links.rss) {
        await generateFeed(blogMeta, postMetaList.filter(item => !item.hidden));
    }

    await ncp(assetsDir, path.join(distDir, 'blog/assets'));
}

async function getBlogMeta() {
    const blogMetaString = await fs.readFileAsync(path.join(sourceDir, 'blog.yaml'), 'utf-8');
    return yaml.load(blogMetaString);
}
async function getPostMetaList() {
    const files = await fs.readdirAsync(sourceDir);
    let res = [];
    for (let file of files) {
        let stat = await fs.statAsync(path.resolve(sourceDir, file));
        if (stat.isDirectory()) {
            let meta = await getPostMeta(file);
            res.push(meta);
        }
    }
    res = _.sortBy(res, r => r.date);
    res = _.reverse(res);
    return res;
}
async function getPostMeta(key) {
    let content = await fs.readFileAsync(path.resolve(sourceDir, key, 'index.yaml'), 'utf-8');
    return yaml.load(content);
}

let renderIndexFunc = null;
async function renderIndex(blogMeta, postMetaList) {
    if (!renderIndexFunc) {
        const template = await fs.readFileAsync(path.resolve(templateDir, 'index.pug'));
        renderIndexFunc = pug.compile(template, {
            filename: path.resolve(templateDir, 'index.pug'),
            pretty: true
        });
    }
    return renderIndexFunc({
        blog: blogMeta,
        postList: postMetaList
    })
}
async function generateIndex(blogMeta, postMetaList) {
    const content = await renderIndex(blogMeta, postMetaList);
    await fs.ensureDirAsync(distDir);
    await fs.writeFileAsync(path.resolve(distDir, 'index.html'), content);
    console.log(`home -- index.html done.`);
}

let renderPostFunc = null;
async function renderPost(blogMeta, postMeta) {
    if (!renderPostFunc) {
        const template = await fs.readFileAsync(path.resolve(templateDir, 'post.pug'), 'utf-8');
        renderPostFunc = pug.compile(template, {
            filename: path.resolve(templateDir, 'post.pug'),
            pretty: true
        });
    }
    const mdStr = await fs.readFileAsync(path.resolve(sourceDir, postMeta.key, 'index.md'), 'utf-8');
    const main = marked(mdStr);
    const content = renderPostFunc({
        blog: blogMeta,
        post: { ...postMeta, main: main }
    });
    return content;
}
async function generatePost(blogMeta, postMeta) {
    const content = await renderPost(blogMeta, postMeta);
    await fs.ensureDirAsync(path.resolve(distDir, 'blog/post'));
    await fs.writeFileAsync(path.resolve(distDir, 'blog/post', postMeta.key + '.html'), content);
    console.log(`post -- ${postMeta.title} done.`);
}

async function renderFeed(blogMeta, postMetaList) {

    const feed = new RSS({
        title: blogMeta.title,
        description: blogMeta.description,
        feed_url: blogMeta.links.rss,
        site_url: blogMeta.url
    });

    postMetaList = postMetaList.splice(0, 5);
    for (const post of postMetaList) {

        let mdStr = await fs.readFileAsync(path.resolve(sourceDir, post.key, 'index.md'), 'utf-8');
        let content = marked(mdStr);

        feed.item({
            title: post.title,
            description: content,
            url: `${blogMeta.site_url}post/${post.key}.html`,
            guid: post.key,
            author: blogMeta.author,
            date: post.date
        })
    }

    const xml = feed.xml({
        indent: true
    });

    return xml;
}
async function generateFeed(blogMeta, postMetaList) {

    const xml = await renderFeed(blogMeta, postMetaList);

    await fs.writeFileAsync(path.resolve(distDir, 'blog/feed.xml'), xml, 'utf-8');
    console.log(`feed -- RSS feed done.`);
}

amberpine.init = async function (cwd) {
    await ncp(path.join(__dirname, '../init'), process.cwd());
    console.log('Initialize success');
}
amberpine.renderIndex = renderIndex;
amberpine.renderPost = renderPost;
amberpine.renderFeed = renderFeed;
amberpine.getBlogMeta = getBlogMeta;
amberpine.getPostMetaList = getPostMetaList;
amberpine.getPostMeta = getPostMeta;

module.exports = amberpine;