# AR-FitTry v2

Web-based AR virtual try-on application with real-time tracking for head, hand, and foot accessories.

## Features

- **Head Tracking**: Try on hats, caps, glasses, and headwear
- **Hand Tracking**: Try on rings, watches, and bracelets 
- **Foot Tracking**: Try on shoes and sneakers 
- Real-time 3D model overlay
- 468-point facial landmark detection
- Smooth tracking with AI

## Technologies Used

### Frontend
- **React** - UI framework
- **Three.js** - 3D graphics rendering
- **Vite** - Build tool with HTTPS

### AI/ML
- **TensorFlow.js** - Face detection and tracking
- **MediaPipeFaceMesh** - 468 facial landmarks
- **Kalman Filter** - Motion smoothing

### Performance
- **Web Workers** - Parallel processing
- **OffscreenCanvas** - GPU acceleration
- **IndexedDB** - Model caching

### APIs
- **getUserMedia** - Camera access
- **WebGL** - 3D rendering
- **GLTFLoader** - 3D model loading

## Quick Start

Install dependencies
npm install

Start development server (HTTPS)
npm run dev

Build for production
npm run build
Open https://localhost:3000

## Usage

1. Select category (Head/Hand/Foot)
2. Choose a product
3. Click "Try On"
4. Allow camera access
5. See product on your face in real-time!

## Requirements

- Chrome 90+, Firefox 88+, Safari 14.1+
- Webcam required
- HTTPS required for camera access

## Project Structure

src/
├── managers/ # Core system (Camera, Workers, Render)
├── workers/ # Face tracking (TensorFlow.js)
├── components/ # React UI components
├── config/ # Product catalog
└── utils/ # Kalman filter, performance tools