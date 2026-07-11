# Global AI Chatbot Hub

A premium, glassmorphic multi-agent customer care router. The hub connects customers to brand-specific care agents (Nike, Spotify, Delta, Amazon, Netflix, Starbucks, DHL, and custom nodes) dynamically.

## Features
- **Multi-Agent Routing**: Auto-detects customer intent and connects them to custom brand agents with dedicated system prompts and visual themes.
- **Dual Response Engine**: Works out-of-the-box in simulated keyless offline mode, or connects to live **Gemini 2.5 Flash** when supplied with an API key.
- **Dynamic Registry**: Connect your own brand nodes dynamically using the "+ Register Local Agent" dashboard form.
- **Fully Responsive & PWA Installable**: Custom sliding navigation drawer on mobile, and standard manifest support for standalone app installations on Android/iOS.
- **Docker Ready**: Includes production-grade Dockerfile configurations.

---

## Getting Started

### 1. Installation
Install the project dependencies:
```bash
npm install
```

### 2. Run the Server
Launch the server on port 3000:
```bash
node server.js
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Project Structure
```text
├── public/
│   ├── index.html       # UI layout
│   ├── styles.css       # Premium CSS styling (mesh background, mobile layouts)
│   ├── app.js           # Client actions, PWA sw hooks, brand morphing controller
│   ├── sw.js            # Service worker cache
│   └── manifest.json    # PWA install specifications
├── server.js            # Express server (session handling & Gemini fetch)
├── simulator.js         # Offline keyword analyzer & prompt simulator
├── registry.json        # Database of seed chatbot brand nodes
├── Dockerfile           # Production container build rules
├── .dockerignore        # Docker build ignore list
├── .gitignore           # Git version control ignore list
└── package.json         # Project dependency config
```
