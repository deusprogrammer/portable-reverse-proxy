import https from 'https';
import httpProxy from 'http-proxy';
import fs from 'fs';
import axios from 'axios';

const reverseProxyMapping = [
    {
        uriPattern: '/lamedimension',
        target: 'http://10.0.0.243:9990'
    },{
        uriPattern: '/api/lamedimension',
        target: 'http://10.0.0.243:9900',
    },{
        uriPattern: '/util/budget',
        target: 'http://10.0.0.243:3001'
    },{
        uriPattern: '/api/budget-svc',
        target: 'http://10.0.0.243:8082'
    },{
        uriPattern: '/util/auth',
        target: 'http://10.0.0.243:3003'
    },{
        uriPattern: '/api/auth-svc',
        target: 'http://10.0.0.243:8084'
    },{
        uriPattern: '/api/profile-svc',
        target: 'http://10.0.0.243:8090'
    },{
        uriPattern: '/streamcrabs',
        target: 'http://10.0.0.243:3200'
    },{
        uriPattern: '/api/streamcrabs',
        target: 'http://10.0.0.243:8200'
    },{
        uriPattern: '/cbd',
        target: 'http://10.0.0.243:3091'
    },{
        uriPattern: '/api/twitch',
        target: 'http://10.0.0.243:8091'
    },{
        uriPattern: '/api/img-svc',
        target: 'http://10.0.0.243:8080'
    }
];
const PORT = 443;

const sslOptions = {
    key: fs.readFileSync('./certs/privkey.pem', 'utf-8'),
    cert: fs.readFileSync('./certs/fullchain.pem', 'utf-8')
}

const proxy = httpProxy.createProxyServer({});

const server = https.createServer(sslOptions, async (req, res) => {
    console.log(`${req.method} ${req.url}`);
    console.log('\tHEADERS');
    Object.keys(req.headers).forEach(key => console.log(`\t\t${key}: ${req.headers[key]}`));
    
    // Acquire id-claim if access token is present
    if (req.headers['x-access-token']) {
        console.log('\tFETCHING ID CLAIM');
        try {
            let {data: {jwtToken}} = await axios.get(`https://deusprogrammer.com/api/auth-svc/auth/${req.headers['x-access-token']}`);
            req.headers['authorization'] = `Bearer ${jwtToken}`;
        } catch (err) {
            console.error(`\t${err}`);
        }
    }

    for (let {uriPattern, target} of reverseProxyMapping) {
        if (req.url.match(new RegExp(`^${uriPattern}/*.*$`))) {
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

console.log(`listening on port ${PORT}`);
server.listen(PORT);