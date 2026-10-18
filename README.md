# Spider Solitaire

A plain, ad-free Spider Solitaire that runs in a browser and installs to a home screen as an app. It works offline and saves the game as you play, so you can close it and come back to the same board.

Levels: Easy (1 suit), Medium (2 suits), Hard (4 suits), Bold (4 suits), Expert (4 suits, no undo).

## Install on an iPad

1. Open the game's link in **Safari** (not Chrome).
2. Tap the **Share** button, then **Add to Home Screen**.
3. Open it from the new icon. It runs full screen.

## Notes

- Your game is saved on the device it was played on (browser storage). It does not sync between devices.
- Updates: push to `main` and the game picks up the new version the next time it is opened online.
- Nothing is sent anywhere. There are no accounts, ads, purchases or tracking.

## Develop

Static files only, no build step.

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

Files:

- `index.html`: layout and sheets (menu, options, help, win)
- `styles.css`: look and layout
- `game.js`: rules, touch handling, saving and options
- `sw.js`: offline cache (network first, cache when offline)
- `manifest.webmanifest`, `icons/`: home-screen install

