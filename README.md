# Neon Dash ⚡ — Cyber Prism Endless Runner

A fast-paced, high-octane 2D geometric platformer inspired by **Geometry Dash**. Featuring the iconic **3D Emerald Prism** character, players navigate a **single continuous, endless procedural gauntlet** in an electrifying **Cyber Matrix Green** world, competing for the maximum distance survived.

---

## 💎 The 3D Emerald Prism Character

- **Geometric 3D Prism Design**:
  - Rendered with multi-faceted 3D geometry matching the logo:
    - **Left Facet**: Deep emerald shaded polygon (`#008A2E` to `#004D1A`).
    - **Right Facet**: Radiant neon lime specular highlight (`#39FF14` to `#00B83A`).
    - **Bottom Facet**: Dark cyber forest green base (`#004717` to `#00210A`).
    - **Ridge Lines & Bevels**: Glowing electric green edge highlights with apex sparks.
  - **Dynamic In-Air Rotation**: Rotates 430°/s in mid-air and locks cleanly to its flat base upon touching down on the floor or any platform.
  - **Prism Trail & Shard Explosion**: Leaves glowing green ghost trails and shatters into 50+ geometric prism shards upon collision.

---

## 🏃 Single Continuous Level & Distance Scoring

- **Infinite Procedural Obstacle Gauntlet**:
  - Single continuous running gauntlet that streams infinite rhythmic obstacle chunks ahead of the player while culling cleared hazards behind the camera for 60+ FPS performance.
  - Generates balanced layouts including:
    - Single & double spike leaps
    - Elevated platform runways
    - Jump pad launchers with safe landing zones
    - Floor pit gaps with island step blocks
    - Aerial jump rings
    - Oscillating laser blade hazards
- **Distance Score Calculation**:
  - Score is calculated directly from **distance covered** in meters (`1 meter = 10 pixels`).
  - Displays a live meter gauge on the HUD alongside your **Personal Best Distance**.
  - Flashes a **NEW BEST!** badge in real time whenever you beat your previous record.
  - Saves your best distance and total attempts in `localStorage`.
- **Progressive Difficulty**:
  - Speed starts at a comfortable `360 px/s` and gradually scales as you reach greater distances, capping at `540 px/s`.

---

## 🎮 Game Controls

| Action | Keyboard | Mouse / Touch |
| :--- | :--- | :--- |
| **Jump** | `Space`, `ArrowUp`, `W` | Left Click / Screen Tap |
| **Pause / Resume** | `Escape` | Pause Button (`||`) |
| **Place Checkpoint** *(Practice Run)* | `Z` | `+ Place Point` Button |
| **Undo Checkpoint** *(Practice Run)* | `X` | `- Undo` Button |

---

## 🚀 How to Run in VS Code

### Option 1: Live Server (Recommended)
1. Open the project folder in VS Code:
   ```bash
   code "d:\prism\game"
   ```
2. Install the **Live Server** extension by *Ritwick Dey* from the Extensions view (`Ctrl + Shift + X`).
3. Right-click [`index.html`](file:///d:/prism/game/index.html) and select **"Open with Live Server"**.

---

### Option 2: Python HTTP Server
```bash
python -m http.server 8080
```
Open `http://localhost:8080` in your web browser.

---

### Option 3: Direct Browser Launch
Drag-and-drop [`index.html`](file:///d:/prism/game/index.html) directly into Google Chrome, Edge, Firefox, or Safari.

---

## 📂 File Structure

```text
d:/prism/game/
├── index.html       # Continuous distance runner HUD, modals, and canvas viewport
├── style.css        # Cyber Matrix Green design system, distance gauge & 3D prism UI
├── game.js          # 3D Prism renderer, procedural obstacle generator & synth music
└── README.md        # Documentation and setup instructions
```
