// server.js
const https = require('https');
const fs = require('fs');
const next = require('next');
const path = require('path');
const express = require('express');

const port = 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'dutchoriental.ddns.net-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'dutchoriental.ddns.net.pem')),
};

app.prepare().then(() => {
  const server = express();

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  https.createServer(httpsOptions, server).listen(port, () => {
    console.log(`> Server listening on https://dutchoriental.ddns.net:${port}`);
  });
});
