# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron + Vue 3 desktop application called "Electron Vue3 Admin" - a development tools management system. The application provides image processing and packaging tools with a custom frameless window UI.

## Development Commands

### Development
- `npm run dev` - Start Vite development server (port 5173)
- `npm run electron:dev` - Run Electron app in development mode with hot reload

### Build & Packaging
- `npm run build` - Build Vue app for production
- `npm run electron:build` - Build and package Electron app for distribution
- `npm run electron` - Run Electron app (production mode)

### Preview
- `npm run preview` - Preview production build

## Architecture

### Tech Stack
- **Frontend**: Vue 3 + Vite + Element Plus UI
- **Desktop**: Electron with Node.js integration
- **Build Tool**: Vite for frontend, electron-builder for packaging
- **Image Processing**: Sharp library for image manipulation
- **File Operations**: Node.js fs module with archiver for packaging

### Project Structure

```
src/
├── main.js              # Vue app entry point
├── App.vue              # Root Vue component
├── index.html           # HTML template
├── router/
│   └── index.js         # Vue Router configuration
├── components/
│   └── Layout.vue       # Main layout with sidebar and header
└── views/
    ├── ImageProcessing.vue  # Image processing tool
    ├── PackageTool.vue      # File packaging tool
    └── Settings.vue         # System settings

electron/
└── main.js              # Electron main process
```

### Key Features

#### Image Processing (electron/main.js:92-226)
- **Compress to WebP**: Convert images to WebP format with quality control
- **Batch Rename & Convert**: Renumber files sequentially with optional WebP conversion
- **Batch Name Replacement**: Replace text in filenames across multiple files

#### Packaging Tools
- File archiving functionality using archiver library
- Directory selection and processing

#### Window Management (electron/main.js:228-300)
- Custom frameless window with drag-to-move functionality
- Window controls (minimize, maximize, close)
- IPC communication between renderer and main processes

### IPC Communication

The application uses Electron's IPC for cross-process communication:

- **Window Controls**: `window-minimize`, `window-maximize`, `window-close`
- **Image Processing**: `compress-to-webp`, `batch-rename-convert`, `batch-replace-convert`
- **File Dialogs**: `select-folder`, `dialog:openDirectory`

### Development Notes

- Uses Vue 3 Composition API with `<script setup>` syntax
- Element Plus is used for UI components with custom styling
- The app has a custom frameless window design with custom title bar
- Image processing operations use the Sharp library for performance
- File operations are handled in the Electron main process for security
- Development mode connects to Vite dev server with fallback port support

### Build Configuration

- Vite config uses `@` alias for `src/` directory
- Electron builder outputs to `dist_electron/` directory
- Production builds serve from `dist/` directory
- Uses hash-based routing for Electron compatibility