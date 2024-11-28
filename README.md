# Web Launcher

<div align="center">

<img src="https://github.com/user-attachments/assets/85cddc06-e40e-45dc-bce9-fab67faf9553" width="200" alt="server">


[![Deploy to GitHub Pages](https://github.com/AlexandrosLiaskos/Web_Launcher/actions/workflows/deploy.yml/badge.svg)](https://github.com/AlexandrosLiaskos/Web_Launcher/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2.0-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.2-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-4.4.5-646cff.svg)](https://vitejs.dev/)

</div>

## An advanced web application designed to help you organize and quickly access websites from a central dashboard.

![image](https://github.com/user-attachments/assets/eb7f704d-f115-4590-a0a5-a016e316da51)

## Features

### Command Mode
- Activate with `Shift + :` or type `>`
- Commands for managing websites:
  - Add new websites
  - Edit existing entries
  - Delete websites
  - Import sites from browser
  - Switch views
  - Access settings

### Search and Navigation
- Fuzzy search through titles, URLs, descriptions, and categories
- Tag-based search using `@` prefix
- Real-time filtering as you type
- Keyboard-first navigation:
  - `Alt` to cycle through sites
  - `Enter` to open selected site
  - Arrow keys for movement
  - `Esc` to clear/close search
  - `/` to focus search
  - Custom keyboard shortcuts

### Website Management
- Organize websites with tags and categories
- Add detailed descriptions
- Automatic favicon fetching
- Right-click context menu for quick actions
- Bulk import from browser history/bookmarks
- Preview generation

### User Interface
- Multiple view options:
  - Grid view
  - List view
  - Group/folder view
- Responsive design for all screen sizes
- Aurora background effects
- Dark/light theme support

### Data Management
- Google authentication for secure sign-in
- Real-time data synchronization via Firebase
- Offline support
- Multi-device synchronization
- Automatic data backup
- Data export/import capabilities

### Browser Integration
- Chrome extension support
- Firefox extension support
- Import from browser history
- Import from bookmarks

## Setup

1. Install Node.js 16+
2. Clone and install:
```bash
git clone https://github.com/yourusername/Web_Launcher.git
cd Web_Launcher
npm install
npm run dev
```

3. Create `.env` with your Firebase keys:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Shift + :` | Enter command mode |
| `>` | Enter command mode |
| `Alt` | Switch between sites |
| `Enter` | Open selected site |
| `/` | Focus search |
| `Esc` | Close/clear current action |
| `←↑↓→` | Navigate through sites |

## Tech Stack

- React 18.2.0 + TypeScript 5.0.2
- Firebase for authentication and storage
- Zustand for state management
- Vite 4.4.5 for building
- Tailwind CSS for styling
- React Router for navigation
- React Query for data fetching

## 📈 Performance Metrics

- **Load Time**: < 1.5s initial load
- **Time to Interactive**: < 2s
- **Lighthouse Score**: 90+ across all metrics
- **Offline Capability**: Full functionality maintained

## 📄 License

Web Launcher is available under the MIT License. See the [LICENSE](LICENSE) file for more information.

---

<div align="center">

**Web Launcher** - Elevating Professional Web Navigation

[Documentation](docs/) • [Report Bug](issues) • [Request Feature](issues)

</div>
