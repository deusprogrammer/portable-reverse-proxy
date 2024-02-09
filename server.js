import https from 'https';
import httpProxy from 'http-proxy';
import fs from 'fs';
import axios from 'axios';

if (process.argv.length !== 3) {
    console.error("You must provide a config file path.");
    process.exit(1);
}

const configJSON = fs.readFileSync(process.argv[2]);
const servers = JSON.parse(configJSON);

servers.forEach(({mappings, hostname, port, keyPath, certPath, authUrl}) => {
    const sslOptions = {
        key: fs.readFileSync(keyPath, 'utf-8'),
        cert: fs.readFileSync(certPath, 'utf-8')
    }

    const proxy = httpProxy.createProxyServer({});

    const server = https.createServer(sslOptions, async (req, res) => {
        if (req.headers['host'] !== hostname) {
            res.setHeader("Content-Type", "text/plain");
            res.writeHead(404); // not found
            res.end("404 Not Found\n");
        }

        console.log(`${req.method} ${req.url}`);
        console.log('\tHEADERS');
        Object.keys(req.headers).forEach(key => console.log(`\t\t${key}: ${req.headers[key]}`));

        for (let {uriPattern, target, alwaysAuth} of mappings) {
            if (req.url.match(new RegExp(`^${uriPattern}/*.*$`))) {
                if (alwaysAuth === true || req.headers['x-access-token']) {
                    console.log('\tFETCHING ID CLAIM');
                    try {
                        let {data: {jwtToken}} = await axios.get(authUrl.replace("${ACCESS_TOKEN}", req.headers['x-access-token']));
                        req.headers['authorization'] = `Bearer ${jwtToken}`;
                    } catch (err) {
                        console.error(`\t${err}`);
                    }
                }
                req.url = req.url.replace(uriPattern, '');
                console.log(`\t${uriPattern} => ${target}${req.url}`);
                proxy.web(req, res, {
                    target
                });
                return;
            }
        };

        console.error(`\t${req.url} 404`);
        res.setHeader("Content-Type", "text/plain");
        res.writeHead(404); // not found
        res.end("404 Not Found\n");
    });

    console.log(`listening on port ${port} for ${hostname}`);
    server.listen(port);
});