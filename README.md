<div align="center">
  
# Web Launcher 🚀

<img src="https://github.com/user-attachments/assets/85cddc06-e40e-45dc-bce9-fab67faf9553" width="200" alt="Web Launcher Logo">

[![Deploy to GitHub Pages](https://github.com/AlexandrosLiaskos/Web_Launcher/actions/workflows/deploy.yml/badge.svg)](https://github.com/AlexandrosLiaskos/Web_Launcher/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2.0-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.2-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-4.4.5-646cff.svg)](https://vitejs.dev/)

**An advanced web application designed to help you organize and quickly access websites from a central dashboard.**

# [View on Web Launcher ↗](https://alexandrosliaskos.github.io/Web_MS/) 

<img src="https://github.com/user-attachments/assets/eb7f704d-f115-4590-a0a5-a016e316da51" width="600" alt="Dashboard Preview">

</div>

## 🌟 Key Features

### 🔍 Intelligent Search
- Fuzzy search across all fields
- Tag-based filtering with `@` prefix
- Real-time results as you type
- Keyboard shortcuts for rapid navigation

### 📱 Smart UI
- Multiple view options (Grid/List/Group)
- Responsive design for all devices
- Dynamic aurora background effects
- Dark/light theme support
- Automatic favicon fetching
- Site previews

### ☁️ Seamless Sync
- Google authentication
- Real-time Firebase synchronization
- Offline support
- Automatic backups
- Cross-device accessibility

## ⚡ Local Development

1. **Prerequisites**
   ```bash
   Node.js 16+
   ```

2. **Installation**
   ```bash
   git clone https://github.com/yourusername/Web_Launcher.git
   cd Web_Launcher
   npm install
   ```

3. **Configuration**
   Create `.env`:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Launch**
   ```bash
   npm run dev
   ```

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Shift + :` | Command mode |
| `>` | Command mode |
| `Alt` | Cycle sites |
| `Enter` | Open site |
| `/` | Focus search |
| `Esc` | Clear/close |
| `←↑↓→` | Navigate |

## 🛠️ Tech Stack

- **Frontend**: React 18.2.0, TypeScript 5.0.2
- **Build**: Vite 4.4.5
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Data**: Firebase, React Query
- **Routing**: React Router

## 📊 Performance

| Metric | Score |
|--------|--------|
| Initial Load | < 1.5s |
| Time to Interactive | < 2s |
| Lighthouse Score | 90+ |
| Offline Support | ✅ |

## 🔧 Browser Support

- Chrome extension
- Firefox add-on
- Browser history import
- Bookmark integration

## 📖 License

Web Launcher is [MIT licensed](LICENSE).

---

<div align="center">

### Show your support! ⭐

[Star this repo](https://github.com/yourusername/Web_Launcher) if you found it helpful!

</div>
