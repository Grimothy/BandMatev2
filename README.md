# BandMate

A music collaboration platform for bands to create and collaborate on music in real-time.

## Features

- Real-time collaboration via WebSockets
- Audio playback and waveform visualization using Wavesurfer.js
- Drag and drop interface for organizing tracks
- User authentication with JWT
- File uploads for music files
- Notifications system

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tool
- Tailwind CSS for styling
- Radix UI components
- Socket.io client for real-time communication

### Backend
- Node.js with Express
- TypeScript
- Prisma ORM
- Socket.io for real-time features
- JWT for authentication
- Multer for file uploads

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/BandMate.git
   cd BandMate
   ```

2. Install backend dependencies:
   ```
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```
   cd ../frontend
   npm install
   ```

4. Set up the database:
   ```
   cd ../backend
   npm run db:push
   npm run db:seed
   ```

5. Configure environment variables (create `.env` file in backend directory):
   - Database URL
   - JWT secret
   - Email settings (for notifications)

## Usage

1. Start the backend server:
   ```
   cd backend
   npm run dev
   ```

2. In a new terminal, start the frontend:
   ```
   cd frontend
   npm run dev
   ```

3. Open your browser to `http://localhost:5173`

## Scripts

- `npm run dev` - Start development server (frontend/backend)
- `npm run build` - Build for production
- `npm run start` - Start production server

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License