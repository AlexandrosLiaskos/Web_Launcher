# Web Launcher

A modern, minimalistic website launcher inspired by PowerToys Run with intelligent website ranking based on visit frequency and recency. Features Google authentication and cross-browser synchronization.

## Features
- 🚀 PowerToys Run-like interface for quick website access
- 🔄 Cross-browser synchronization via Firebase
- 🔑 Google account integration
- 📊 Intelligent ranking system based on visit frequency and recency
- 🎯 Tag-based website organization
- 🎨 Modern, clean design with Aurora background
- ⌨️ Keyboard-first navigation
- 📱 Responsive design for all screen sizes
- 🔍 Powerful search capabilities
- 📂 Group-based organization

## Tech Stack
- Frontend: React + TypeScript
- Styling: Tailwind CSS
- State Management: Zustand
- Authentication: Firebase Auth
- Database: Firebase Firestore
- Build Tool: Vite

## Keyboard Shortcuts
- `Alt` - Cycle through websites
- `Enter` - Open selected website
- `/` - Focus search
- `Esc` - Clear search/Close modals

## Getting Started

### Prerequisites
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Google Authentication
3. Enable Firestore Database

### Environment Setup
Create a `.env` file in the root directory with your Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Installation
1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Usage
1. Sign in with your Google account
2. Add websites using the "Add Website" button
3. Organize websites with tags
4. Use the search bar to quickly find websites
5. Press Alt to cycle through results and Enter to open
6. Create groups to organize related websites
7. Right-click for additional options

## Features in Detail

### Website Management
- Add, edit, and delete websites
- Import from browser history
- Automatic favicon fetching
- Visit tracking

### Organization
- Tag-based filtering
- Group creation and management
- Drag and drop organization
- Context menus for quick actions

### Search and Navigation
- Full-text search across titles and URLs
- Tag-based filtering with @ symbol
- Keyboard shortcuts for power users
- Quick actions via command palette

### Synchronization
- Real-time sync across browsers
- Automatic backup to Firestore
- User-specific data isolation
- Offline support with local storage

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)
