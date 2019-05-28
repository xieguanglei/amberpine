const express = require('express');
const open = require('open');
const { renderIndex, renderPost, renderFeed, getBlogMeta, getPostMetaList, getPostMeta } = require('./index');
const expressWs = require('express-ws');
const fs = require('fs-extra');
const path = require('path');

const port = 8080;

function devServer() {

    const app = express();
    expressWs(app);

    app.get('/', async (req, res) => {

        const blogMeta = await getBlogMeta();
        const postMetaList = await getPostMetaList();

        const content = await renderIndex(blogMeta, postMetaList);
        res.send(content);
    });

    app.get('/blog/post/*', async (req, res) => {

        try {
            const matched = req.path.match(/\/blog\/post\/(.+)\.html/);
            const key = matched[1];
            const blogMeta = await getBlogMeta();
            const postMeta = await getPostMeta(key);
            postMeta.devhr = true;
            const content = await renderPost(blogMeta, postMeta);
            res.send(content);
        } catch (e) {
            res.send('no post matched');
            console.log('invalid path : ' + req.path);
        }
    });

    app.use('/blog/assets', express.static('assets'));

    app.ws('/', async function (ws, req) {

        ws.onmessage = function (msg) {

            const data = JSON.parse(msg.data);

            if (data.type === 'init') {
                const watcher = fs.watch(
                    path.join(process.cwd(), `source/${data.key}/index.md`),
                    function () {
                        ws.send(JSON.stringify({
                            type: 'refresh'
                        }));
                        watcher.close();
                    }
                )
                ws.on('close', function () {
                    watcher.close();
                });
            }
        }
    });

    app.listen(port, () => {
        open(`http://127.0.0.1:${port}`);
        console.log(`Amberpine dev-server listening on port ${port}!`);
    });
}

module.exports = devServer;
