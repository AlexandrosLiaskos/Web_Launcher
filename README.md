# Web Launcher

A modern web application launcher designed for efficient website management and quick access. Built with React and Firebase, it offers a PowerToys Run-inspired interface with real-time synchronization across browsers.

## Core Features

### Authentication & Sync
- Google account authentication
- Real-time data synchronization via Firebase
- Secure, user-specific data isolation

### Website Management
- Quick website addition and organization
- Automatic favicon fetching
- Visit frequency tracking
- Tag-based categorization

### Interface
- Clean, modern UI with Aurora background effect
- Responsive design supporting all screen sizes
- Context menus for advanced operations
- Group-based website organization

### Navigation
- Fast keyboard-driven interface
- Powerful search functionality
- Tag filtering system
- Website cycling with Alt key

## Technical Stack

### Frontend
- React 18.2.0
- TypeScript 5.0.2
- Tailwind CSS 3.3.3
- Heroicons 2.0.18

### Backend & Services
- Firebase Authentication
- Firebase Firestore
- Zustand 4.4.1 (State Management)

### Build & Development
- Vite 4.4.5
- Node.js >= 16.0.0

## Quick Start

### Prerequisites
1. Node.js >= 16.0.0
2. Firebase project with:
   - Authentication enabled (Google provider)
   - Firestore database initialized
   - Web app configuration

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Configuration
Create `.env` file in project root:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Usage Guide

### Keyboard Navigation
| Key Combination | Action |
|----------------|---------|
| Alt | Cycle through websites |
| Enter | Open selected website |
| / | Focus search bar |
| Esc | Clear search/Close modals |

### Website Management
1. Add websites:
   - Click "Add Website" button
   - Enter URL and details
   - Assign tags for organization

2. Organization:
   - Create groups for related websites
   - Use tags for flexible categorization
   - Right-click for context menu options

3. Search and Filter:
   - Type to search across all fields
   - Use @ to filter by tags
   - Press Alt to cycle through results

## Firebase Setup

### Authentication
1. Firebase Console → Authentication → Sign-in methods
2. Enable Google Authentication
3. Add authorized domains

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Development

### Project Structure
```
src/
├── components/       # React components
├── store/           # Zustand store
├── config/          # Firebase configuration
├── utils/           # Utility functions
└── assets/          # Static assets
```

### Key Components
- `App.tsx`: Main application component
- `WebsiteGrid.tsx`: Website display grid
- `GroupSection.tsx`: Group management
- `websiteStore.ts`: State management

## License
MIT License - see LICENSE file for details
