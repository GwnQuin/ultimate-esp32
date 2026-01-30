# Ultimate ESP Flasher & Remote Vault

Deze repo is een **statische site** (HTML/CSS/JS). Je kunt hem eenvoudig hosten met **GitHub Pages**.

## GitHub Pages inschakelen

1. Push deze repo naar GitHub.
2. Ga naar **Settings → Pages**.
3. Kies **Source: Deploy from a branch**.
4. Selecteer de branch (bijv. `main` of `work`) en **/ (root)** als folder.
5. Klik **Save**.

Na enkele minuten verschijnt je site op:

```
https://<github-username>.github.io/<repo-naam>/
```

## Lokale preview

Gebruik een simpele webserver (nodig voor `fetch` van `firmware.json`):

```bash
python -m http.server 8000
```

Open daarna:

```
http://127.0.0.1:8000
```
