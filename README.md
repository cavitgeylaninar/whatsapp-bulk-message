# WhatsApp Bulk Message System

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![React](https://img.shields.io/badge/react-19.1.1-61dafb.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Enterprise-grade WhatsApp bulk messaging platform with real-time chat management**

**Developed by [Cavit Geylani Nar](https://github.com/cavitgeylaninar)**

[Features](#features) • [Demo](#demo) • [Installation](#installation) • [Documentation](#documentation) • [Tech Stack](#tech-stack)

</div>

---

## Overview

WhatsApp Bulk Message System is a comprehensive solution for managing WhatsApp communications at scale. Built with modern web technologies, it provides a robust platform for sending bulk messages, managing contacts, and handling real-time WhatsApp conversations through an intuitive web interface.

### Key Highlights

- **Real-time WhatsApp Integration** - Direct integration with WhatsApp Web using whatsapp-web.js
- **Bulk Messaging** - Send messages to multiple contacts simultaneously with CSV import support
- **Contact Management** - Organize and manage WhatsApp contacts with advanced filtering
- **Session Management** - Persistent WhatsApp sessions with QR code authentication
- **Modern UI/UX** - Material Design interface with responsive layouts
- **Socket.io Real-time Updates** - Live message status and session updates
- **Multi-user Support** - JWT-based authentication with role-based access control

---

## Features

### Core Features

- **WhatsApp Web Integration**
  - QR code authentication
  - Persistent session management
  - Multi-device support
  - Real-time message synchronization

- **Bulk Messaging**
  - CSV/TXT file import for contact lists
  - Manual number input
  - Message templating
  - Batch processing with rate limiting
  - Delivery status tracking

- **Contact Management**
  - Import contacts from WhatsApp
  - Search and filter contacts
  - Tag-based organization
  - Contact synchronization
  - Profile picture support

- **Real-time Chat Interface**
  - Live message updates via WebSocket
  - Message history
  - Read receipts
  - Typing indicators
  - Media support (images, videos, documents)

### Security & Performance

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting and request throttling
- SQL injection protection with Sequelize ORM
- CORS and Helmet security headers
- Input validation and sanitization
- Session encryption

### Administration

- User management
- Session monitoring
- Message queue management with Bull
- Redis caching
- PostgreSQL database
- Comprehensive logging with Winston
- Error tracking and reporting

---

## Demo

### Screenshots

**Dashboard**
- Main interface with contact list and messaging panel
- Real-time session status indicator
- WhatsApp QR code authentication dialog

**Bulk Messaging**
- CSV file upload interface
- Contact selection with checkboxes
- Message composition with preview
- Send progress tracking

**Contact Management**
- Searchable contact list
- Filter by tags and status
- Sync with WhatsApp contacts
- Contact details view

---

## Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework |
| **PostgreSQL** | Primary database |
| **Sequelize** | ORM for database operations |
| **Redis** | Caching and session storage |
| **Socket.io** | Real-time bidirectional communication |
| **whatsapp-web.js** | WhatsApp Web API integration |
| **Bull** | Job queue for message processing |
| **JWT** | Authentication tokens |
| **Winston** | Logging framework |
| **Joi** | Input validation |
| **Helmet** | Security headers |

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **TypeScript** | Type-safe JavaScript |
| **Material-UI (MUI)** | Component library |
| **Socket.io Client** | Real-time updates |
| **Axios** | HTTP client |
| **React Router** | Client-side routing |
| **date-fns** | Date manipulation |
| **Framer Motion** | Animations |
| **React Hot Toast** | Notifications |
| **Emoji Picker React** | Emoji support |

### DevOps

- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy and static file serving
- **PM2** (recommended) - Process management

---

## Installation

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 15
- Redis >= 5.0 (optional, for caching)
- npm or yarn

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd whatsapp-bulk-message
```

2. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Configure environment variables**
```bash
# Backend configuration
cd backend
cp .env.example .env
# Edit .env with your configuration
```

**Required environment variables:**
```env
# Server
PORT=3500
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatsapp_bulk_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Frontend URL
FRONTEND_URL=http://localhost:3501
```

4. **Set up the database**
```bash
# Create PostgreSQL database
createdb whatsapp_bulk_db

# Run migrations
cd backend
npm run migrate
```

5. **Start the application**

**Development mode:**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
PORT=3501 npm start
```

The application will be available at:
- Frontend: http://localhost:3501
- Backend API: http://localhost:3500

### Docker Installation

For production deployment using Docker:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Docker services:**
- PostgreSQL: `localhost:5432`
- pgAdmin: `localhost:5050`

---

## Usage

### Initial Setup

1. **Create an account**
   - Navigate to http://localhost:3501
   - Click "Register" and create your account

2. **Login**
   - Use your credentials to log in
   - You'll be redirected to the dashboard

3. **Connect WhatsApp**
   - Click "WhatsApp'a Bağlan" (Connect to WhatsApp)
   - Scan the QR code with your phone
   - WhatsApp Web app → Settings → Linked Devices → Link a Device

4. **Import contacts**
   - Go to "Kişiler" (Contacts) tab
   - Click "Kişileri Yükle" (Load Contacts)
   - Your WhatsApp contacts will sync automatically

### Sending Bulk Messages

1. **Navigate to "Toplu Mesaj" (Bulk Message) tab**

2. **Add recipients:**
   - **Option 1:** Upload CSV/TXT file with phone numbers
   - **Option 2:** Type numbers manually (comma-separated)
   - **Option 3:** Select from synced contacts

3. **Compose your message**
   - Type your message in the text area
   - Preview will show character count

4. **Send**
   - Click "Gönder" (Send)
   - Monitor progress in real-time
   - Check delivery status for each recipient

### Contact Management

- **Search:** Use the search bar to find contacts
- **Filter:** Apply tags and filters
- **Sync:** Click refresh to sync latest WhatsApp contacts
- **View:** Click on any contact to see details

---

## API Documentation

### Authentication Endpoints

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### WhatsApp Session Endpoints

```http
POST   /api/whatsapp/session/initialize
GET    /api/whatsapp/session/status/:sessionId
DELETE /api/whatsapp/session/:sessionId
GET    /api/whatsapp/qr/:sessionId
```

### Contact Endpoints

```http
GET    /api/contacts
POST   /api/contacts
GET    /api/contacts/:id
PUT    /api/contacts/:id
DELETE /api/contacts/:id
POST   /api/contacts/sync
```

### Message Endpoints

```http
POST   /api/messages/send
POST   /api/messages/bulk
GET    /api/messages/history/:contactId
GET    /api/messages/status/:messageId
```

### Socket.io Events

**Client → Server:**
- `join_session` - Join a WhatsApp session room
- `send_message` - Send a message
- `typing` - Send typing indicator

**Server → Client:**
- `session_status` - Session status update
- `qr_code` - QR code for authentication
- `message_received` - New message received
- `message_sent` - Message sent confirmation
- `contact_sync` - Contact sync status

---

## Project Structure

```
whatsapp-bulk-message/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── database/        # Database setup and seeders
│   │   ├── middleware/      # Express middleware
│   │   ├── models/          # Sequelize models
│   │   ├── modules/         # WhatsApp integration modules
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utility functions
│   │   └── server.js        # Application entry point
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts (Auth, etc.)
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── utils/           # Utility functions
│   │   ├── types/           # TypeScript types
│   │   ├── theme/           # MUI theme configuration
│   │   └── App.tsx          # Main App component
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## Configuration

### Backend Configuration

**Database Configuration** (`backend/src/config/database.js`)
- Connection pooling
- SSL/TLS options
- Query logging

**WhatsApp Configuration**
- Session persistence directory: `.wwebjs_auth/`
- Puppeteer options for headless browser
- Authentication strategy

**Rate Limiting**
- Default: 100 requests per 15 minutes
- Configurable per endpoint

### Frontend Configuration

**Proxy Configuration** (`frontend/src/setupProxy.js`)
- API proxy to backend
- WebSocket proxy for Socket.io

**Theme Configuration** (`frontend/src/theme/`)
- Material-UI theme customization
- Dark/Light mode support (if implemented)

---

## Development

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Code Quality

```bash
# Linting
npm run lint

# Format code
npm run format
```

### Database Migrations

```bash
# Create a new migration
cd backend
npm run migrate:create -- --name create_new_table

# Run migrations
npm run migrate

# Rollback migration
npm run migrate:undo
```

### Debugging

**Backend debugging:**
```bash
NODE_ENV=development DEBUG=* npm start
```

**View logs:**
- Application logs: `backend/logs/`
- Winston logger configured for different log levels

---

## Deployment

### Production Build

**Frontend:**
```bash
cd frontend
npm run build
# Build output: frontend/build/
```

**Backend:**
```bash
cd backend
NODE_ENV=production npm start
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3500
DB_HOST=your-db-host
DB_PASSWORD=secure-password
JWT_SECRET=long-random-secret
FRONTEND_URL=https://yourdomain.com
```

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start src/server.js --name whatsapp-backend

# Start frontend (after build)
pm2 serve frontend/build 3501 --name whatsapp-frontend

# Save PM2 configuration
pm2 save
pm2 startup
```

### Docker Production Deployment

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose up -d --scale backend=3
```

---

## Troubleshooting

### Common Issues

**1. QR Code not appearing**
- Check WhatsApp session status in backend logs
- Clear `.wwebjs_auth/` directory and restart
- Ensure Puppeteer dependencies are installed

**2. Database connection errors**
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists: `createdb whatsapp_bulk_db`

**3. WebSocket connection fails**
- Check CORS configuration in backend
- Verify Socket.io port is not blocked
- Check proxy configuration in frontend

**4. Messages not sending**
- Verify WhatsApp session is active (status: READY)
- Check rate limits
- Ensure phone numbers are in correct format (e.g., 905431234567)

**5. Session keeps disconnecting**
- Check `.wwebjs_auth/` directory permissions
- Ensure sufficient disk space
- Review browser automation logs

### Logs Location

```bash
# Backend logs
backend/logs/error.log
backend/logs/combined.log

# View real-time logs
tail -f backend/logs/combined.log
```

---

## Performance Optimization

### Backend Optimization

- **Database Connection Pooling**: Configured in Sequelize
- **Redis Caching**: Cache frequently accessed data
- **Job Queue**: Bull queue for async message processing
- **Rate Limiting**: Prevent API abuse
- **Compression**: Gzip compression enabled

### Frontend Optimization

- **Code Splitting**: React lazy loading
- **Image Optimization**: Sharp for image processing
- **Bundle Size**: Analyzed with webpack-bundle-analyzer
- **Memoization**: React.memo for expensive components

---

## Security Best Practices

1. **Authentication**
   - Strong JWT secrets (minimum 32 characters)
   - Token expiration configured
   - Refresh token implementation

2. **Database**
   - Parameterized queries (Sequelize ORM)
   - Database user with limited privileges
   - Regular backups

3. **API Security**
   - Helmet.js for security headers
   - CORS properly configured
   - Input validation on all endpoints
   - Rate limiting enabled

4. **WhatsApp Sessions**
   - Session files encrypted
   - Secure storage of authentication data
   - Regular session cleanup

5. **Environment Variables**
   - Never commit `.env` files
   - Use secrets management in production
   - Rotate credentials regularly

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Standards

- Follow ESLint configuration
- Write meaningful commit messages
- Add tests for new features
- Update documentation

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Roadmap

### Version 1.1 (Planned)
- [ ] Message scheduling
- [ ] Template management
- [ ] Analytics dashboard
- [ ] Export message history
- [ ] Multi-language support

### Version 1.2 (Planned)
- [ ] Group messaging
- [ ] Media bulk sending
- [ ] Advanced filtering
- [ ] Webhook integrations
- [ ] API rate limit dashboard

### Version 2.0 (Future)
- [ ] WhatsApp Business API integration
- [ ] AI-powered chatbot
- [ ] Message automation workflows
- [ ] CRM integration
- [ ] Mobile app (React Native)

---

## Support

For support, please:
- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting section

---

## Acknowledgments

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) - WhatsApp Web API implementation
- [Material-UI](https://mui.com/) - React component library
- [Express.js](https://expressjs.com/) - Web framework
- [Socket.io](https://socket.io/) - Real-time engine

---

## Developer

**Developed by Cavit Geylani Nar**

---

<div align="center">

**Star this repository if you find it helpful!**

Made using React, Node.js, and WhatsApp Web.js

</div>
