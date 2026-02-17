# Bloomtech ERP System

A comprehensive Enterprise Resource Planning system built with React, TypeScript, Express, and PostgreSQL.

## Features

- **Project Management**: 3-level hierarchy (Projects → Contracts → Items)
- **Financial Management**: Receivables, Payables, Petty Cash tracking
- **Purchase Orders**: Complete PO workflow with approval system and email notifications
- **Quote Generator**: Professional quote generation with follow-up reminders
- **Employee Management**: Time tracking, PTO requests, and employee records
- **Document Bank**: Centralized document management system
- **Vendor Management**: Vendor database with transaction tracking
- **Asset Management**: Track company assets and depreciation
- **Analytics Dashboard**: Real-time financial and project insights
- **RBAC System**: Role-based access control with granular permissions
- **Email Notifications**: Automated email system for POs, quotes, and user management

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL 12+

## Local Development Setup

### 1) Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in `backend/` with:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/Bloomtech
   NODE_ENV=development
   PORT=3000
   FRONTEND_URL=http://localhost:5173
   
   # Email Configuration (Optional for development)
   SMTP_HOST=smtp.zoho.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@domain.com
   SMTP_PASS=your-app-password
   SMTP_FROM=Your App Name <your-email@domain.com>
   ```

4. Create database and import schema:
   ```bash
   # Create database
   createdb Bloomtech
   
   # Import schema
   psql -d Bloomtech -f src/databasse.sql
   ```

5. Seed the admin user:
   ```bash
   npm run seed:admin
   ```
   Default credentials:
   - Username/Email: `admin` or `admin@example.com`
   - Password: `admin123`

### 2) Frontend Setup

1. Navigate to client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in `client/` with:
   ```env
   VITE_API_URL=http://localhost:3000
   ```

### 3) Run in Development

Start both servers:

**Backend:**
```bash
cd backend
npm run dev
# API: http://localhost:3000
```

**Frontend:**
```bash
cd client
npm run dev
# App: http://localhost:5173
```

### 4) Login

Navigate to `http://localhost:5173` and login with:
- Email: `admin@example.com`
- Password: `admin123`

## Railway Production Deployment

### Prerequisites

1. Railway account with PostgreSQL database provisioned
2. GitHub repository connected to Railway
3. Environment variables configured (see `.env.railway.example`)

### Deployment Steps

1. **Database Migration:**
   ```bash
   # Export local database
   pg_dump -h localhost -U postgres -d Bloomtech -F p -f bloomtech_export.sql
   
   # Import to Railway
   PGPASSWORD=<railway-password> psql -h <railway-host> -U postgres -p <railway-port> -d railway -f bloomtech_export.sql
   ```

2. **Configure Railway Services:**
   - Create two services: Backend and Client
   - Connect both to your GitHub repository
   - Set environment variables as documented in `.env.railway.example`

3. **Critical Environment Variables:**
   - **Backend**: DATABASE_URL, NODE_ENV=production, SMTP credentials
   - **Client**: VITE_API_URL (pointing to backend Railway URL)

4. **Email Server Setup:**
   - SMTP credentials must be configured for email functionality
   - System supports: Welcome emails, Password resets, PO notifications, Quote reminders
   - Email service gracefully degrades if SMTP not configured

### Email Functionality

The system includes automated email notifications for:
- **User Management**: Welcome emails with temp passwords, password reset notifications
- **Purchase Orders**: Creation confirmations, approval requests, approval/rejection notifications
- **Quote Reminders**: Automated follow-up reminders (cron job runs daily at 8 AM)

Email configuration is handled via environment variables. See `backend/src/utils/emailService.ts` for implementation details.

## Useful Commands

### Backend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run typecheck` - Run TypeScript type checking
- `npm run seed:admin` - Create admin user

### Client
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
Bloomtech_ERP/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth & authorization
│   │   ├── utils/           # Utilities (email, JWT, etc.)
│   │   ├── jobs/            # Cron jobs (quote reminders)
│   │   ├── scripts/         # Database migration scripts
│   │   └── index.ts         # Express server entry point
│   ├── .env.example         # Environment variables template
│   └── railway.json         # Railway deployment config
│
├── client/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service layer
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Frontend utilities
│   ├── .env.example         # Environment variables template
│   └── railway.json         # Railway deployment config
│
└── .env.railway.example     # Railway production env vars
```

## Tech Stack

**Frontend:**
- React 19
- TypeScript
- Vite
- Axios
- Recharts (Analytics)
- jsPDF (PDF generation)
- Lucide React (Icons)

**Backend:**
- Node.js / Express
- TypeScript
- PostgreSQL
- JWT Authentication
- Nodemailer (Email)
- node-cron (Scheduled tasks)
- bcryptjs (Password hashing)

## Security Features

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC) with granular permissions
- Password strength validation
- Password history tracking (prevents reuse of last 3 passwords)
- Forced password change for new users
- Audit logging for RBAC actions

## Troubleshooting

### Port Conflicts
Ensure only one instance is running:
- Backend: `3000`
- Frontend: `5173`

### Database Connection Errors
1. Verify PostgreSQL is running
2. Check `.env` DATABASE_URL is correct
3. Ensure database exists

### CORS Issues
Backend CORS is configured for:
- Production: `FRONTEND_URL` from environment
- Development: `*` (all origins)

### Email Not Sending
1. Verify SMTP credentials are correct
2. Check Railway logs for email service errors
3. Ensure SMTP provider allows connections from Railway IPs
4. Email service will log warnings but not crash the app if misconfigured

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Proprietary - Bloomtech Systems

## Support

For issues or questions, contact the development team.
