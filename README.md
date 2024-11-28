# Web Launcher

A modern, minimalistic website launcher inspired by PowerToys Run with intelligent website ranking based on visit frequency and recency.

## Features
- PowerToys Run-like interface for quick website access
- Intelligent ranking system based on visit frequency and recency
- Modern, developer-focused design
- Preconfigured website list support
- Browser history integration
- Keyboard-first navigation

## Tech Stack
- Frontend: React + TypeScript
- Styling: Tailwind CSS
- State Management: Zustand
- Build Tool: Vite

## Getting Started
1. Install dependencies:
```bash
npm install
```

2. Install the browser extension:
   - For Chrome:
     1. Go to `chrome://extensions/`
     2. Enable "Developer mode"
     3. Click "Load unpacked"
     4. Select the `extension` folder from this project
   - For Firefox:
     1. Go to `about:debugging#/runtime/this-firefox`
     2. Click "Load Temporary Add-on"
     3. Select any file from the `extension-firefox` folder

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Usage
- Press `>` to open the command palette
- Type `import` to import your frequently visited sites from the browser
- Use the search bar to quickly find and launch websites
- Visit counts and last visited dates are synced with your browser's history
