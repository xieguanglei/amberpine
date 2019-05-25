const path = require('path');

const fs = require('util-promisifyall')(require('fs-extra'));
const ncp = require('util').promisify(require('ncp').ncp);

const yaml = require('yaml-js');
const _ = require('lodash');
const jade = require('jade');
const marked = require('marked');
const RSS = require('rss');


async function amberpine(cwd) {

    const source = path.join(cwd, 'blog-source');
    const dist = path.join(cwd, 'blog');
    const template = path.join(__dirname, '../templates');
    const assets = path.join(cwd, 'assets');

    const blogMeta = await getBlogMeta(source);
    const postMetaList = await getPostMetaList(source);

    await generateIndex(template, dist, blogMeta, postMetaList.filter(item => !item.hidden));
    for (const post of postMetaList) {
        await generatePost(source, template, dist, blogMeta, post);
    }
    await generateFeed(source, dist, blogMeta, postMetaList.filter(item => !item.hidden));

    await ncp(assets, path.join(dist, 'assets'));
}

async function getBlogMeta(src) {
    const blogMetaString = await fs.readFileAsync(path.join(src, 'blog.yaml'), 'utf-8');
    return yaml.load(blogMetaString);
}
async function getPostMetaList(src) {
    const files = await fs.readdirAsync(src);
    let res = [];
    for (let file of files) {
        let stat = await fs.statAsync(path.resolve(src, file));
        if (stat.isDirectory()) {
            let meta = await getPostMeta(path.resolve(src, file));
            res.push(meta);
        }
    }
    res = _.sortBy(res, r => r.date);
    res = _.reverse(res);
    return res;
}
async function getPostMeta(src) {
    let content = await fs.readFileAsync(path.resolve(src, 'index.yaml'), 'utf-8');
    return yaml.load(content);
}
async function generateIndex(tpSrc, dist, blogMeta, postMetaList) {
    const template = await fs.readFileAsync(path.resolve(tpSrc, 'index.jade'));
    const render = jade.compile(template, {
        filename: path.resolve(tpSrc, 'index.jade'),
        pretty: true
    });
    const content = render({
        blog: blogMeta,
        postList: postMetaList
    });
    await fs.ensureDirAsync(dist);
    await fs.writeFileAsync(path.resolve(dist, '../index.html'), content);
    console.log(`home -- index.html done.`);
}
async function generatePost(src, tpSrc, dist, blogMeta, postMeta) {
    const template = await fs.readFileAsync(path.resolve(tpSrc, 'post.jade'), 'utf-8');
    const render = jade.compile(template, {
        filename: path.resolve(tpSrc, 'post.jade'),
        pretty: true
    });
    const mdStr = await fs.readFileAsync(path.resolve(src, postMeta.key, 'index.md'), 'utf-8');
    const main = marked(mdStr);
    const content = render({
        blog: blogMeta,
        post: { ...postMeta, main: main }
    });
    await fs.ensureDirAsync(path.resolve(dist, 'post'));
    await fs.writeFileAsync(path.resolve(dist, 'post', postMeta.key + '.html'), content);
    console.log(`post -- ${postMeta.title} done.`);
}
async function generateFeed(src, dist, blogMeta, postMetaList) {

    var feed = new RSS({
      title: blogMeta.title,
      description: blogMeta.description,
      feed_url: blogMeta.feed_url,
      site_url: blogMeta.site_url
    });
  
    postMetaList = postMetaList.splice(0, 5);
    for (let post of postMetaList) {
  
      let mdStr = await fs.readFileAsync(path.resolve(src, post.key, 'index.md'), 'utf-8');
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
  
    var xml = feed.xml({
      indent: true
    });
  
    await fs.writeFileAsync(path.resolve(dist, 'feed.xml'), xml, 'utf-8');
  }
  



amberpine.init = function (cwd) {

}

module.exports = amberpine;