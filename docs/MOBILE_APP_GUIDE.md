# Mobile App Development Guide for BandMate

This guide outlines the approaches and steps needed to create Android and iOS mobile applications for BandMate.

---

## Overview

BandMate is currently a web application built with:
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, RESTful API, WebSockets (Socket.io)

To create mobile apps, you have several options, each with different trade-offs:

---

## Option 1: Progressive Web App (PWA) - Easiest ⭐

**Effort**: Low | **Native Feel**: Medium | **Recommended for**: Quick mobile presence

### What is it?
A PWA allows users to "install" your web app on their mobile device with minimal code changes.

### Steps Required:

1. **Add a Web App Manifest** (`frontend/public/manifest.json`):
```json
{
  "name": "BandMate",
  "short_name": "BandMate",
  "description": "Music collaboration platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

2. **Add Service Worker** for offline capabilities (`frontend/public/sw.js`):
```javascript
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

3. **Link manifest in `index.html`**:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#000000">
```

4. **Register Service Worker** in your app entry point.

### Pros:
- ✅ Minimal code changes
- ✅ Works on both iOS and Android
- ✅ No app store submission needed
- ✅ Instant updates

### Cons:
- ❌ Limited access to native features
- ❌ Less discoverable (not in app stores)
- ❌ iOS has limited PWA support

---

## Option 2: Capacitor by Ionic - Recommended 🌟

**Effort**: Medium | **Native Feel**: High | **Recommended for**: Full native experience with web codebase

### What is it?
Capacitor wraps your existing web app in a native container, giving access to native device features while keeping your React codebase.

### Steps Required:

1. **Install Capacitor**:
```bash
cd frontend
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
npx cap init
```

2. **Configure Capacitor** (`capacitor.config.ts`):
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bandmate.app',
  appName: 'BandMate',
  webDir: 'dist',
  server: {
    // For development, point to your dev server
    // url: 'http://localhost:5173',
    // cleartext: true
  }
};

export default config;
```

3. **Build and Add Platforms**:
```bash
npm run build
npx cap add android
npx cap add ios
```

4. **Install Native Plugins** (as needed):
```bash
# For native features
npm install @capacitor/filesystem @capacitor/share @capacitor/push-notifications
```

5. **Update API URLs** - Ensure your API calls work from mobile:
   - Change `http://localhost:3000` to your production API URL
   - Or use environment variables

6. **Handle Mobile-Specific Concerns**:
   - Audio playback on mobile
   - File upload/download
   - WebSocket connections with proper timeouts
   - Adjust UI for smaller screens

7. **Open in Native IDEs**:
```bash
npx cap open android  # Opens Android Studio
npx cap open ios      # Opens Xcode (macOS only)
```

8. **Test and Build**:
   - Android: Build APK/AAB in Android Studio
   - iOS: Build in Xcode (requires Mac and Apple Developer account)

### Code Changes Needed:

**API Configuration** (`frontend/src/lib/api.ts` or similar):
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://your-api-domain.com');
```

**Socket.io Configuration**:
```typescript
import { Capacitor } from '@capacitor/core';

const socket = io(API_BASE_URL, {
  transports: ['websocket'],
  // Add reconnection logic for mobile networks
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
```

**Audio Handling** - Consider mobile audio limitations:
```typescript
import { Capacitor } from '@capacitor/core';

// On mobile, user gesture is required to play audio
if (Capacitor.isNativePlatform()) {
  // Handle mobile-specific audio setup
}
```

### Pros:
- ✅ Reuse existing React codebase
- ✅ Access to native device features
- ✅ Can publish to app stores
- ✅ Works with existing build pipeline
- ✅ Good documentation and community

### Cons:
- ❌ Requires native IDE setup (Android Studio, Xcode)
- ❌ App store submission process
- ❌ Some features may need native code

---

## Option 3: React Native - Full Rewrite

**Effort**: High | **Native Feel**: Highest | **Recommended for**: Long-term native performance

### What is it?
Build truly native apps using React and JavaScript, but with a different component library.

### Steps Required:

1. **Initialize React Native Project**:
```bash
npx react-native init BandMate
```

2. **Port Components** - Rewrite UI components:
   - Replace HTML elements with React Native components:
     - `<div>` → `<View>`
     - `<span>` → `<Text>`
     - `<button>` → `<TouchableOpacity>` or `<Button>`
   - Replace CSS/Tailwind with StyleSheet API
   - Find React Native alternatives for libraries:
     - Radix UI → React Native Paper or Native Base
     - Wavesurfer.js → react-native-track-player

3. **Reuse Business Logic**:
   - API client code can be largely reused
   - State management can be reused
   - Type definitions can be reused

4. **Native Features**:
```bash
npm install @react-native-async-storage/async-storage
npm install @react-native-community/netinfo
npm install react-native-fs
```

5. **Audio Handling**:
```bash
npm install react-native-track-player
npm install react-native-sound
```

### Code Structure:
```
BandMate-Mobile/
├── android/          # Android native code
├── ios/              # iOS native code
├── src/
│   ├── components/   # React Native components
│   ├── screens/      # App screens
│   ├── services/     # API client (reused from web)
│   ├── types/        # TypeScript types (reused from web)
│   └── utils/        # Utilities (mostly reused)
└── package.json
```

### Pros:
- ✅ Best performance
- ✅ Most native feel
- ✅ Full access to native APIs
- ✅ Large ecosystem

### Cons:
- ❌ Complete rewrite of UI layer
- ❌ Separate codebase to maintain
- ❌ Steep learning curve
- ❌ More complex development setup

---

## Option 4: Native Development - Complete Rewrite

**Effort**: Very High | **Native Feel**: Native | **Recommended for**: Enterprise-level requirements

### What is it?
Build separate native apps using Swift (iOS) and Kotlin/Java (Android).

### Requirements:
- Separate iOS app in Swift/SwiftUI
- Separate Android app in Kotlin/Java
- Both consume the same REST API and WebSocket backend
- Complete UI rebuild in native frameworks

### Pros:
- ✅ Best possible performance
- ✅ Full platform integration
- ✅ Native UX patterns

### Cons:
- ❌ Requires 2-3x development effort
- ❌ Need specialized iOS and Android developers
- ❌ Maintain 3 codebases (web, iOS, Android)

---

## Recommended Approach

For BandMate, we recommend **Option 2: Capacitor** because:

1. **Code Reuse**: Keep your existing React/TypeScript codebase
2. **Quick to Market**: Can have working mobile apps in weeks
3. **Native Features**: Access device features when needed
4. **Maintainability**: Single codebase for web and mobile
5. **Progressive Enhancement**: Can optimize native parts incrementally

---

## Backend Considerations

Your existing Node.js backend will work with all mobile options, but consider:

### 1. API Adjustments:
```typescript
// Add mobile-specific API endpoints if needed
app.get('/api/mobile/version', (req, res) => {
  res.json({ version: '1.0.0', minVersion: '1.0.0' });
});
```

### 2. Authentication:
- Current JWT auth will work
- Consider adding refresh token rotation for mobile
- Add device registration for push notifications

### 3. File Handling:
```typescript
// Adjust file upload limits for mobile
const upload = multer({
  limits: {
    fileSize: isMobileClient(req) ? 50 * 1024 * 1024 : 100 * 1024 * 1024
  }
});
```

### 4. WebSocket Optimizations:
```typescript
// Add connection timeouts for mobile networks
io.on('connection', (socket) => {
  socket.setTimeout(60000); // 60s timeout
  
  // Handle mobile reconnection
  socket.on('mobile-reconnect', () => {
    // Sync state
  });
});
```

### 5. Push Notifications:
```bash
npm install firebase-admin  # For FCM
npm install @parse/node-apn  # For APNs
```

---

## Checklist for Mobile Development

### Phase 1: Planning
- [ ] Choose mobile approach (Capacitor recommended)
- [ ] Set up development environment
- [ ] Create mobile project structure

### Phase 2: Frontend Adaptation
- [ ] Configure build for mobile
- [ ] Update API configuration for mobile
- [ ] Test on mobile browsers first
- [ ] Adjust layouts for mobile screens
- [ ] Handle mobile-specific touch interactions
- [ ] Test audio playback on mobile devices
- [ ] Optimize file uploads for mobile networks

### Phase 3: Native Features (if using Capacitor/React Native)
- [ ] Add file system access
- [ ] Add share functionality
- [ ] Add push notifications
- [ ] Add biometric authentication (optional)
- [ ] Add background audio playback

### Phase 4: Backend Updates
- [ ] Add mobile API version endpoint
- [ ] Configure CORS for mobile app
- [ ] Set up push notification service
- [ ] Add device registration endpoints
- [ ] Test WebSocket stability on mobile networks

### Phase 5: Testing
- [ ] Test on Android devices/emulator
- [ ] Test on iOS devices/simulator
- [ ] Test different screen sizes
- [ ] Test offline functionality
- [ ] Test audio features
- [ ] Performance testing
- [ ] Battery usage testing

### Phase 6: Distribution
- [ ] Create app store assets (icons, screenshots)
- [ ] Write app store descriptions
- [ ] Set up Google Play Developer account ($25 one-time)
- [ ] Set up Apple Developer account ($99/year)
- [ ] Submit for review
- [ ] Handle app store feedback

---

## Quick Start with Capacitor (Step-by-Step)

Here's a practical guide to get started immediately:

### 1. Install Dependencies:
```bash
cd frontend
npm install @capacitor/core @capacitor/cli
```

### 2. Initialize:
```bash
npx cap init "BandMate" "com.bandmate.app"
```

### 3. Build Your Web App:
```bash
npm run build
```

### 4. Add Platforms:
```bash
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios
```

### 5. Update Configuration:
Create `frontend/capacitor.config.ts`:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bandmate.app',
  appName: 'BandMate',
  webDir: 'dist',
  bundledWebRuntime: false
};

export default config;
```

### 6. Environment Variables:
Create `frontend/.env.production`:
```bash
VITE_API_URL=https://your-backend-url.com
VITE_WS_URL=wss://your-backend-url.com
```

### 7. Sync and Open:
```bash
npx cap sync
npx cap open android  # or 'ios' for iOS
```

### 8. Test:
- Android: Click "Run" in Android Studio
- iOS: Click "Run" in Xcode

---

## Resources

### Documentation:
- [Capacitor Docs](https://capacitorjs.com/docs)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [PWA Guide](https://web.dev/progressive-web-apps/)

### Tools:
- [Android Studio](https://developer.android.com/studio)
- [Xcode](https://developer.apple.com/xcode/) (macOS only)
- [Expo](https://expo.dev/) (for React Native)

### Testing:
- [BrowserStack](https://www.browserstack.com/) - Test on real devices
- [Firebase Test Lab](https://firebase.google.com/docs/test-lab)
- [TestFlight](https://developer.apple.com/testflight/) - iOS beta testing

---

## Estimated Timeline

### Capacitor Approach:
- **Setup & Configuration**: 1-2 days
- **Mobile Optimizations**: 1 week
- **Testing**: 1 week
- **App Store Submission**: 1-2 weeks (review time)
- **Total**: 3-4 weeks

### React Native Approach:
- **Project Setup**: 1 week
- **UI Component Port**: 4-6 weeks
- **Feature Implementation**: 4-6 weeks
- **Testing**: 2 weeks
- **App Store Submission**: 1-2 weeks
- **Total**: 3-4 months

---

## Cost Considerations

### One-Time Costs:
- Google Play Developer Account: $25
- Apple Developer Program: $99/year
- (Optional) Android device for testing: $200-500
- (Optional) iOS device for testing: $400-1000

### Ongoing Costs:
- Apple Developer Program renewal: $99/year
- (Optional) Code signing services
- (Optional) Mobile analytics/crash reporting

---

## Next Steps

1. **Start with PWA** to quickly validate mobile usage
2. **Implement Capacitor** for full mobile experience
3. **Iterate based on user feedback**
4. **Consider React Native** if performance is critical

---

## Questions?

If you need help with any specific aspect of mobile development:
1. Open an issue on GitHub
2. Check the [Capacitor Community](https://capacitorjs.com/community)
3. Join relevant Discord/Slack channels

---

## Contributing

Contributions to mobile platform support are welcome! Please:
1. Follow the existing code style
2. Test on both platforms
3. Update documentation
4. Submit a pull request

---

**Last Updated**: February 2026
