import express from 'express';
import open from 'open';
import expressWs from 'express-ws';
import fs from 'fs-extra';
import path from 'path';

import { renderIndex, renderPost, renderFeed, getBlogMeta, getPostMetaList, getPostMeta, IBlogMeta, IPostMeta } from './index.js';

const port = 8080;

function devServer() {

    const app: express.Application = express();
    expressWs(app);
    const appWs = app as (express.Application & expressWs.WithWebsocketMethod);

    app.get('/', async (req: express.Request, res: express.Response): Promise<void> => {

        const blogMeta: IBlogMeta = await getBlogMeta();
        const postMetaList: Array<IPostMeta> = await getPostMetaList();

        const content: string = await renderIndex(blogMeta, postMetaList);
        res.send(content);
    });

    app.get('/blog/post/*', async (req: express.Request, res: express.Response): Promise<void> => {

        try {
            const matched = req.path.match(/\/blog\/post\/(.+)\.html/);
            const key = (matched && matched[1]);
            if (key) {
                const blogMeta: IBlogMeta = await getBlogMeta();
                const postMeta: IPostMeta = await getPostMeta(key);
                (postMeta as any)['devhr'] = true;
                const content: string = await renderPost(blogMeta, postMeta);
                res.send(content);
            }
        } catch (e) {
            res.send('no post matched');
            console.log('invalid path : ' + req.path);
        }
    });

    app.get('/blog/feed.xml', async (req: express.Request, res: express.Response): Promise<void> => {
        const blogMeta: IBlogMeta = await getBlogMeta();
        const postMetaList: Array<IPostMeta> = await getPostMetaList();

        const content: string = await renderFeed(blogMeta, postMetaList);
        res.send(content);
    });

    app.use('/blog/assets', express.static('assets'));

    appWs.ws('/', function (ws, req) {

        ws.onmessage = function (msg) {

            const data = JSON.parse(msg.data.toString());

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

export default devServer;
