const marked = require('marked');

const renderer = new marked.Renderer();
const renderImage = renderer.image;
renderer.image = function (href, title, text) {
    const origin = renderImage.call(this, href, title, text);
    if (text) {
        return `<figure>${origin}<figurecaption>${text}</figcaption></figure>`;
    } else {
        return origin;
    }
}

module.exports = function (mdStr) {
    return marked(mdStr, { renderer });
}