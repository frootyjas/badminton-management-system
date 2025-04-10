const fs = require('fs');
const createError = require('http-errors');

const serveFile = (filePath, res, next) => {
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return next(createError(404, 'File Not Found'));
    }

    res.sendFile(filePath, (sendFileErr) => {
      if (sendFileErr) {
        // Only call next if the headers haven't been sent
        if (!res.headersSent) {
          return next(createError(500, 'Internal Server Error'));
        }
      }
    });
  });
};

module.exports = serveFile;
