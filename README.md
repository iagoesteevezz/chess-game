# ♟️ Interactive Chess Game

A modern, fully functional, and responsive chess web application built with TypeScript. It features a complete set of tools for chess enthusiasts, including local play, AI opponents, online multiplayer capabilities, and game analysis tools.

**👉 Play the Live Demo Here:** https://iagoesteevezz.github.io/chess-game/

---

## ✨ Features

### 🎮 Versatile Game Modes

* 🤖 **Play against AI:** Test your skills against a computer opponent with adjustable difficulty levels.
* 🌐 **Online Multiplayer:** Create a room or join a friend's room to play matches over the internet.
* 🧑‍🤝‍🧑 **Pass & Play:** Play locally on the same device.

### ♟️ Advanced Board Mechanics

* Strict move validation, including:

  * En passant
  * Castling
  * Pawn promotion
* Visual indicators for:

  * Check
  * Checkmate
  * Drawn positions
* Best move hints and game analysis tools.

### 📜 State & History Management

* Real-time Algebraic Move History.
* Save and load games.
* Copy, import, and export games using standard:

  * **FEN** notation
  * **PGN** notation

### 🎨 Customization

* Toggleable move arrows.
* Multiple board themes (Green, Dark, and more).

---

## 🛠️ Tech Stack

* **Frontend Environment:** Vite
* **Language:** TypeScript (Vanilla)
* **Game Logic:** `chess.js`

  * Move validation
  * Check/checkmate detection
  * FEN parsing
  * PGN parsing
* **Deployment:** GitHub Pages

---

## 💻 For Developers

If you want to clone this repository, run it locally, or contribute, follow these steps.

### Prerequisites

Make sure you have **Node.js** installed on your machine.

---

## 🚀 Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/iagoesteevezz/chess-game.git
cd chess-game
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

### 4. Open the application

Visit:

```text
http://localhost:5173
```

The application will automatically reload whenever you make changes.

---

## 🚀 Deployment Strategy (GitHub Pages)

This project is configured for deployment to GitHub Pages using the `/docs` folder strategy, without requiring GitHub Actions.

### Build for Production

```bash
npm run build
```

### Important Note

The `vite.config.ts` file is configured to output production-ready files into the `docs/` directory instead of the default `dist/` directory.

### Push Changes

After building:

1. Commit the updated `docs/` folder.
2. Push the changes to the `main` branch.

### Configure GitHub Pages

In your GitHub repository:

1. Go to **Settings** → **Pages**.
2. Under **Build and deployment**, select:

   * **Source:** Deploy from a branch
   * **Branch:** `main`
   * **Folder:** `/docs`
3. Save the configuration.

Your website will be published automatically after GitHub processes the deployment.

---

## 📁 Project Structure

```text
chess-game/
│
├── docs/                # Production build output
├── src/                 # TypeScript source files
├── public/              # Static assets
├── index.html
├── vite.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Push your branch.
5. Open a Pull Request.

---

## 📄 License

This project is released under the MIT License.

---

Created by **Iago Estévez** 🚀
