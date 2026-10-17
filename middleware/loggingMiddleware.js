const fs = require('fs');
const path = require('path');

const logStream = fs.createWriteStream(path.join(__dirname, '..', 'access.log'), { flags: 'a' });

const loggingMiddleware = (req, res, next) => {
  const oldWrite = res.write;
  const oldEnd = res.end;

  const chunks = [];

  res.write = (...restArgs) => {
    chunks.push(Buffer.from(restArgs[0]));
    oldWrite.apply(res, restArgs);
  };

  res.end = (...restArgs) => {
    if (restArgs[0]) {
      chunks.push(Buffer.from(restArgs[0]));
    }
    const body = Buffer.concat(chunks).toString('utf8');

    const log = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode}\nRequest Body: ${JSON.stringify(req.body)}\nResponse Body: ${body}\n\n`;
    logStream.write(log);
    console.log(log);


    oldEnd.apply(res, restArgs);
  };

  next();
};

module.exports = loggingMiddleware;
