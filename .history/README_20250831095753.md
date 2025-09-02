# Butterfly Dodge Game 🦋

A fun and engaging web-based game where players control a butterfly to dodge moving nets while collecting nectar from flowers. Built with pure HTML5, CSS3, and JavaScript for smooth gameplay.

**⌨️ Desktop/Keyboard Required** - This game requires keyboard controls and is not currently mobile-compatible. Touch controls may be added in a future version.

**🎮 [Play Now!](https://deepfriedturkey441.github.io/butterfly_dodge/)**

## 🎮 Game Overview

Navigate your butterfly left and right across the screen to avoid the moving nets while collecting flowers for points! The butterfly moves continuously from left to right, and you control its height and speed. Test your reflexes and see how high you can level up in this addictive arcade-style game.

## 🕹️ How to Play

### Movement Controls
- **Left Arrow**: Slow down
- **Right Arrow**: Speed up  
- **Spacebar**: Flap wings to fly up (hold to keep flying)
- **Release Spacebar**: Butterfly descends with gravity

### Additional Controls
- **P**: Pause/Resume game
- **Q**: Quit to game over
- **Enter**: Start game from instructions
- **Y**: Play again after game over

### Objective
- 🌸 **Collect flowers** to earn points (1 point each)
- 🥅 **Avoid nets** or lose a life
- 🎯 **Reach 5 lives** to advance to the next level
- 📊 **Build skill score** by collecting flowers consistently

## ✨ Game Features

### Core Gameplay
- **Progressive difficulty** - Nets grow larger each level
- **Dynamic physics** - Scales with screen size for consistent challenge
- **Skill scoring** - Average flowers collected per screen pass
- **Super Butterfly mode** - Activated at skill level 8.000+
- **Multiple levels** with unique mechanics (clouds, winds)

### Level Progression
- **Level 1**: Basic net dodging
- **Level 2**: Clouds bump you to random positions  
- **Level 3**: Wind gusts push you backward + faster music
- **Level 4+**: Nets continue growing, skill score tracking

### Visual & Audio
- **Parallax cloud backgrounds** with smooth animations
- **Responsive scaling** - Works on all desktop screen sizes
- **Dynamic music** - Procedurally generated, speeds up at Level 3+
- **Sound effects** - Toggleable with volume control
- **Visual feedback** - Screen shake, flower pop animations

## 🐛 Developer Mode

**New in v2.1.0!** Press **Shift+M** to toggle developer mode on/off.

### Features
- **Real-time debug overlay** - Position, physics, game state
- **Collision boundaries** - Visual hitboxes for all objects
- **Cheat controls**:
  - Invincibility mode
  - Infinite lives  
  - Level jumping (1-99)
  - Instant super mode activation
- **Physics monitoring** - Screen scale factor, speeds, FPS

### Debug Information
- Butterfly coordinates and velocity
- Current level, lives, points, skill score
- Net and flower counts
- Screen dimensions and scaling
- Performance metrics

## ⚖️ Dynamic Difficulty Scaling

The game automatically adjusts physics based on your screen size:

- **Small screens** (laptops): Easier, slower movement
- **Large screens** (desktops): Harder, faster movement  
- **Reference size**: 1200px width
- **Scale factor**: 0.8x to 2.5x depending on screen

This ensures consistent challenge across all devices!

## 🎯 Scoring System

- **Points**: 1 per flower (2 during Super mode)
- **Lives**: Start with 3, gain 1 every 10 points
- **Level up**: When lives reach 5, advance level and reset to 3 lives
- **Skill score**: Running average of flowers collected per left→right pass
- **Super mode**: Activated when skill reaches 8.000+ (Level 4+)

## 🏆 Leaderboard

- **Global leaderboard** - Top 10 highest levels achieved
- **Name entry** - Enter your name for each playthrough
- **Persistent storage** - Scores saved across sessions
- **Best level tracking** - Your highest level is submitted

## 🚀 Quick Start

### Play Online
Visit **[https://deepfriedturkey441.github.io/butterfly_dodge/](https://deepfriedturkey441.github.io/butterfly_dodge/)** in any modern web browser and start playing!

### Local Development
1. Clone this repository
2. Start a local server: `python3 -m http.server 8000`
3. Open `http://localhost:8000` in your browser
4. Press **Shift+M** for developer mode

### Host Your Own
- Upload files to any web hosting service
- No build process required - pure HTML/CSS/JavaScript
- Customize by modifying the source files

## 🛠️ Technical Details

### Built With
- **HTML5** - Game structure and DOM elements
- **CSS3** - Responsive design, animations, effects
- **Vanilla JavaScript** - Game logic, physics, rendering
- **Web Audio API** - Procedural music and sound effects

### File Structure
```
├── index.html          # Main game page
├── script.js           # Game logic and physics  
├── style.css           # Styling and animations
├── server.js           # Leaderboard backend
├── leaderboard.json    # Score storage
└── README.md           # This file
```

### Browser Compatibility
- **Desktop browsers**: Chrome, Firefox, Safari, Edge (modern versions)
- **Mobile**: Not currently supported (keyboard required)
- **Requirements**: JavaScript enabled, physical keyboard

## 🎨 Customization

### Easy Modifications
- **Colors**: Edit CSS color variables
- **Physics**: Adjust JavaScript constants (`GRAVITY`, `SPEED_LEVELS`)
- **Difficulty**: Modify `NET_SCALE_PER_LEVEL`, net counts
- **Sounds**: Replace audio generation with files

### Advanced Features
- **New levels**: Add mechanics in `gameLoop()` level checks
- **Power-ups**: Extend flower collision system
- **Themes**: Create CSS class variants
- **Multiplayer**: Add networking for competitive play

## 📋 Version History

### v2.1.0 (Current)
- ✅ Developer mode with Shift+M toggle
- ✅ Dynamic physics scaling for screen sizes
- ✅ Enhanced debug tools and visualization
- ✅ Fixed player name prompting on restart
- ✅ Improved UI consistency (Score → Points)

### Previous Versions
- Basic gameplay with progressive difficulty
- Leaderboard system with global scores
- Responsive design for desktop browsers

## 🤝 Contributing

Contributions welcome! Please:

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Test thoroughly (use developer mode!)
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`  
6. Open a Pull Request

### Development Workflow
- Use `feature/` branches for new features
- Test with developer mode enabled
- Ensure cross-browser compatibility
- Update README for user-facing changes

## 📄 License

This project is open source and available under the MIT License. Feel free to use, modify, and distribute for personal or educational purposes.

## 🎮 Ready to Play?

**[🚀 Launch Game](https://deepfriedturkey441.github.io/butterfly_dodge/)**

Try to reach Level 10+ and get your name on the global leaderboard! 

**Pro tip**: Press **Shift+M** to explore the developer tools and see how the game works behind the scenes.

---

*Have fun playing! 🦋🎯*