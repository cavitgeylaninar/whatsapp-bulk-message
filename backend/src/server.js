require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const sequelize = require('./database/connection');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const whatsappWebRoutes = require('./modules/whatsapp-web/routes/whatsappWeb.routes');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const WhatsAppWebSocketHandler = require('./modules/whatsapp-web/services/SocketHandler');

const app = express();
const httpServer = createServer(app);

// Socket.io configuration
const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      const allowedOrigins = [
        'http://localhost:3501',
        'http://127.0.0.1:3501',
        process.env.FRONTEND_URL
      ];
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || 
          origin.includes('loca.lt') || 
          origin.includes('ngrok') ||
          (process.env.NODE_ENV === 'development' && 
           (origin.startsWith('http://localhost:') || 
            origin.startsWith('http://127.0.0.1:')))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New WebSocket connection:', socket.id);
  
  // Join user to their own room
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined room`);
  });
  
  socket.on('disconnect', () => {
    console.log('WebSocket disconnected:', socket.id);
  });
});

// Export io for use in other modules
app.set('io', io);

// Initialize WhatsApp Web Socket Handler
WhatsAppWebSocketHandler.initialize(io);

// COMPRESSION - Büyük payload'ları sıkıştır
app.use(compression({
  level: 6,  // Compression level (0-9)
  threshold: 1024,  // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Compress everything except images
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Configure helmet with custom settings for static files
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      mediaSrc: ["'self'", "data:", "blob:", "*"],
      connectSrc: ["'self'", "*"],
    },
  },
}));

// CORS configuration for local and remote access
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3501',
      'http://127.0.0.1:3501',
      'https://whatsapp-frontend-demo.loca.lt',
      process.env.FRONTEND_URL
    ];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Log the origin for debugging
    console.log('CORS isteği kaynağı:', origin);
    
    // Allow localhost with any port in development
    if (process.env.NODE_ENV === 'development' && 
        (origin.startsWith('http://localhost:') || 
         origin.startsWith('http://127.0.0.1:'))) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1 || 
        origin.includes('loca.lt') || 
        origin.includes('ngrok')) {
      callback(null, true);
    } else {
      console.log('CORS engellenen kaynak:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Range']
};

app.use(cors(corsOptions));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased to 1000
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for auth routes and webhook
    return req.path.startsWith('/api/auth/') || req.path.startsWith('/api/webhook/');
  }
});

// app.use('/api/', limiter); // Temporarily disabled rate limiter

// BÜYÜK ÖLÇEK İÇİN PAYLOAD LİMİTLERİ
app.use(express.json({ 
  limit: '100mb',  // 100MB limit for large-scale operations
  parameterLimit: 1000000  // Increased parameter limit
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '100mb',  // 100MB limit for URL-encoded payloads
  parameterLimit: 1000000 
}));

// Static files for uploads - with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Log all DELETE requests for debugging
app.use((req, res, next) => {
  if (req.method === 'DELETE') {
    console.log('DELETE isteği:', {
      url: req.url,
      path: req.path,
      baseUrl: req.baseUrl,
      originalUrl: req.originalUrl,
      params: req.params,
      user: req.user?.id
    });
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/whatsapp-web', whatsappWebRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build', 'index.html'));
  });
}

app.use(errorHandler);

const PORT = process.env.PORT || 3500;

sequelize.authenticate()
  .then(() => {
    logger.info('Database connection established successfully');
    return sequelize.sync();
  })
  .then(() => {
    httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT} with WebSocket support`);

      // WhatsApp Web oturumlarını otomatik başlat
      setTimeout(async () => {
        try {
          const SessionManager = require('./modules/whatsapp-web/services/SessionManager');
          const fs = require('fs').promises;
          const path = require('path');

          // Check for existing sessions
          const authPath = path.join(__dirname, '..', '.wwebjs_auth');
          try {
            const files = await fs.readdir(authPath);
            const sessionDirs = files.filter(f => f.startsWith('session-'));

            if (sessionDirs.length > 0) {
              logger.info(`Found ${sessionDirs.length} existing WhatsApp Web session(s), attempting to restore...`);

              for (const sessionDir of sessionDirs) {
                // Extract session ID: remove all 'session-' prefixes
                let sessionId = sessionDir;
                while (sessionId.startsWith('session-')) {
                  sessionId = sessionId.substring(8); // Remove 'session-' (8 characters)
                }

                logger.info(`Restoring WhatsApp Web session: ${sessionDir} -> ${sessionId}`);

                try {
                  // Create the session which will auto-restore from existing auth
                  await SessionManager.createSession(sessionId);
                  logger.info(`WhatsApp Web session restored: ${sessionId}`);
                } catch (err) {
                  logger.error(`Failed to restore session ${sessionId}:`, err);
                }
              }
            } else {
              logger.info('No existing WhatsApp Web sessions found');
            }
          } catch (err) {
            logger.info('WhatsApp Web auth directory not found, skipping session restoration');
          }
        } catch (error) {
          logger.error('Error initializing WhatsApp Web sessions:', error);
        }
      }, 5000); // Wait 5 seconds after server starts
    });
  })
  .catch(err => {
    logger.error('Unable to connect to the database:', err);
    process.exit(1);
  });