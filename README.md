# 🎸 BandMate - Your Band's New Digital Studio
Hey there, music makers! Welcome to BandMate  - the collaboration platform that's about to make your band's creative workflow smoother than a jazz bassline. 🎵

## ✨ What's Under the Hood?

### 🎯 Smart Project Organization

Projects are your band's creative spaces - think of them as your digital rehearsal studios
Vibes live inside projects - these are your song ideas, themes, or experimental jam sessions
Cuts are the individual takes within each vibe - every version, every iteration, beautifully organized
Drag-and-drop reordering because life's too short for manual sorting

###🎧 Audio Management That Actually Works

Upload audio files and stems with ease (supports MP3, WAV, FLAC, OGG, and more!)
Real-time waveform visualization using Wavesurfer.js - see your music, not just hear it
Label your files with custom names so "final_FINAL_v3_actually_final.mp3" becomes a thing of the past
Support for stems (upload those multi-track ZIP files up to 500MB!)
File size limits that make sense: 100MB for regular audio, 500MB for stems
### 👥 Real-Time Collaboration

WebSocket-powered live updates - see changes as they happen, no refresh needed
Instant notifications when bandmates upload new files or make changes
Share files with external collaborators using secure share links
Role-based permissions: Admins and Members with granular project access controls

### 🔐 Authentication & Security

JWT-based authentication with refresh tokens for secure, persistent sessions
Cookie-based auth that just works™
Admin panel for user management
Per-project member permissions (some folks can create vibes, some can't - you decide!)

### 🎨 Beautiful, Modern UI

React 18 with TypeScript for that buttery-smooth experience
Tailwind CSS styling that looks good and loads fast
Radix UI components for accessible, polished interfaces
Vite for lightning-fast development and builds
Responsive design - works on your laptop, tablet, or phone

### 📁 File Explorer

Browse all your audio files across all projects in one place
Filter by project, vibe, or cut
Hierarchical view showing your entire creative catalog
Quick actions for editing, deleting, and sharing files
💬 Comments & Feedback

Leave timestamped comments on audio files
Collaborate asynchronously - drop feedback whenever inspiration strikes
Never lose track of what needs fixing or what's working

### 🔔 Smart Notifications

Real-time toast notifications when stuff happens
Notification center to review what you missed
Links directly to the relevant content
Automatic cleanup of old notifications (because nobody needs 6-month-old updates)

### 🐳 Production-Ready Deployment

Docker support with multi-stage builds
Health check endpoints
Automatic database migrations and seeding
Environment-based configuration
Nginx-ready static file serving

## 🛠️ Technical Stack (For the Nerds 🤓)

### Frontend:

React 18 + TypeScript
Vite (blazing fast!)
Tailwind CSS + Radix UI
Socket.io client
Axios for API calls
Backend:

Node.js + Express
TypeScript throughout
Prisma ORM (SQLite by default, scales to PostgreSQL)
Socket.io for real-time magic
Multer for file uploads
JWT authentication
Database Models:

Users → Projects (many-to-many with permissions)
Projects → Vibes → Cuts → Files
Comments, Notifications, Share Tokens
Refresh Tokens for secure sessions

## 🚀 What This Means For You
No more:

🚫 Confusing Dropbox folders with 47 versions of the same file
🚫 "Did you hear the latest mix?" followed by sending the wrong link
🚫 Lost feedback buried in text message threads
🚫 Wondering who uploaded what and when
Just:

✅ Organized projects with clear structure
✅ Real-time updates when your bandmates make changes
✅ Beautiful waveforms and intuitive playback
✅ Secure sharing with people outside your core team
✅ A single source of truth for your band's creative work

## 🎉 Ready to Rock?
BandMate is production-ready and waiting for your band to make some noise. Whether you're tracking demos in your bedroom or collaborating across continents, we've got you covered.


## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
