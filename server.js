require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const compression = require('compression');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const helmet = require('helmet');
const killPort = require('kill-port');
const path = require('path');
const createError = require('http-errors');
const fileUpload = require('express-fileupload');
const { startTokenCleanupCronJob } = require('./src/utils/tokenCleanupCron.js');

const config = require('config');
// check for required environment variables
require('./config/checkEnvVars');

const MAX_FILE_SIZE = config.get('maxFileSize');

// database connection
const connectDB = require('./config/db');
const {
  startReservationCleanupCronJob,
  startCancelledCleanupCronJob,
  startPendingCleanupCronJob
} = require('./src/utils/reservationCleanup.js');
const userSocketManager = require('./src/utils/userSocketManager.js');
const Notification = require('./src/models/Notification.js');
connectDB(config);

const app = express();
var httpServer = require('http').createServer(app);
var io = require('socket.io')(httpServer);

// view engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'client', 'views'));

// check the environment variable to decide on security features
const disableSecurity = config.get('disableSecurity');

app.disable('x-powered-by'); // reduce fingerprinting
app.use(cookieParser());
// enable compression reduces the size of html css and js to significantly improves the latency
app.use(compression());
// for logging HTTP requests.
app.use(morgan('dev'));

if (!disableSecurity) {
  // CORS middleware allows your API to be accessed from other origins (domains)
  app.use(cors());
  //It protects against common security vulnerabilities like clickjacking, XSS, etc.
  app.use(helmet());
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", 'https://nominatim.openstreetmap.org', 'https://raw.githubusercontent.com'],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org'],
        objectSrc: ["'none'"],
        scriptSrc: [
          "'self'",
          'https://code.jquery.com',
          'https://cdn.jsdelivr.net',
          'https://stackpath.bootstrapcdn.com'
        ],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        upgradeInsecureRequests: []
      },
      reportOnly: false
    })
  );
} else {
  console.log('Security features disabled, CORS and Helmet are not applied.');
}

// middleware to parse JSON bodies from incoming requests
app.use(express.json());
// Middleware to handle file uploads
app.use(
  fileUpload({
    limits: { fileSize: MAX_FILE_SIZE },
    responseOnLimit: 'File size exceeds the maximum limit.'
  })
);

// custom middleware to handle JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      code: 400,
      message: 'Invalid JSON format. Please check your request body.'
    });
  }
  next(); // Pass to the next middleware or route handler if no error
});
// middleware to parse URL-encoded bodies (e.g., form submissions)
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// serve public folder as static and cache it
app.use(
  express.static(path.join(path.join(__dirname), 'public'), {
    setHeaders(res) {
      res.setHeader('Cache-Control', 'public,max-age=31536000,immutable');
    }
  })
);

io.on('connection', (socket) => {
  console.log('New client connected');
  const userId = socket.handshake.query.userId;

  if (userId) {
    userSocketManager.addUserSocket(userId, socket);
    console.log(`User ${userId} connected. Current users: ${userSocketManager.getUserList()}`);

    socket.on('clientReady', () => {
      console.log(`User ${userId} is ready.`);
      socket.emit('welcome', { message: 'You are now connected and ready to receive notifications!' });
    });

    socket.on('newNotification', async ({ userId, notification }) => {
      try {
        const newNotif = await Notification.create(notification);
        io.to(userId).emit('notification', newNotif);
      } catch (err) {
        console.error('Failed to create notification', err);
      }
    });

    socket.on('disconnect', () => {
      userSocketManager.removeUserSocket(userId);
      console.log(`User ${userId} disconnected.`);
    });
  } else {
    console.error('User ID not provided during socket connection.');
  }

  socket.on('message', (message) => {
    console.log('Received message:', message);
  });
});

// initialize and register all the application routes
require('./src/routes/indexRoutes')(app);
require('./src/routes/authRoutes')(app);
require('./src/routes/superadminRoutes')(app);
require('./src/routes/userRoutes')(app, io);

//  handle unregistered route for all HTTP Methods
app.all('*', function (req, res, next) {
  // Forward to next closest middleware
  next();
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  const isProduction = req.app.get('env') === 'production';

  // set the error message and status
  res.locals.message = err.message;
  res.locals.error = isProduction ? null : err;

  // set the response status (default to 500 if none is set)
  const statusCode = err.status || 500;
  res.status(statusCode);

  // render the error page and pass the status and message
  res.render('error', {
    error: isProduction ? null : err,
    status: statusCode,
    message: err.message
  });
});

const server = httpServer.listen(config.get('port'), config.get('host'), () => {
  console.log(`Server is running at http://${config.get('host')}:${config.get('port')}`);

  // start the token cleanup cron job
  startTokenCleanupCronJob();
  // start the reservation cleanup cron job
  startReservationCleanupCronJob();

  startCancelledCleanupCronJob(io);
  startPendingCleanupCronJob(io);
});

// handle graceful shutdown
process.on('SIGINT', shutdownHandler);
process.on('SIGTERM', shutdownHandler);

async function shutdownHandler() {
  console.log('Shutting down server...');

  // Close server connections
  await server.close(async () => {
    console.log('Closed out remaining connections.');

    // Close MongoDB connection
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
    } catch (error) {
      console.error('Error while closing MongoDB connection:', error);
    }
    // Kill the port
    const PORT = config.get('port');
    try {
      await killPort(PORT, 'tcp');
      console.log(`Successfully killed processes running on port ${PORT}`);
    } catch (error) {
      console.error(`Error killing port ${PORT}:`, error);
    }

    process.exit(0);
  });
}
