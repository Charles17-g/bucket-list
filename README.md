# Travel Bucket List Manager

## Requirements
- Node.js 18 or newer (the server uses the built-in `fetch` function)
- Internet connection for the REST Countries search

## Run it
1. Put `index.html`, `edit.html`, `server.js`, and `package.json` in the same folder.
2. Open a terminal in that folder.
3. Run `npm install`.
4. Create an API key from the [REST Countries account page](https://restcountries.com/).
5. In PowerShell, set the key in the same terminal: `$env:REST_COUNTRIES_API_KEY = 'your_api_key'`.
6. Run `npm start` in that terminal. If PowerShell blocks `npm.ps1`, use `npm.cmd start` instead.
7. Open `http://localhost:3000` in your browser. Do not open `index.html` directly from File Explorer.

The server creates `travel.json` automatically the first time it needs to save or read records. Existing places and notes are carried forward: each country keeps its old place, and its notes are assigned to that place. Do not delete this file if you want to keep your records.

## Demo checklist
1. Add a country with its first place.
2. Add more places to the country; each place has its own notes.
3. Add, edit, and delete notes on one place, then verify notes on other places are unchanged.
4. Edit or delete a place and show it update or disappear.
5. Stop the server with Ctrl+C, run `npm start` again, refresh, and show that remaining records are still there.
6. Search for Japan (or another country) in Online Country Lookup and show the returned country, place, and region.

## API endpoints
- GET `/api/travel`
- GET `/api/travel/:id`
- POST `/api/travel`
- PUT `/api/travel/:id`
- DELETE `/api/travel/:id`
- GET `/api/lookup/:country`
- POST `/api/travel/:id/places`
- PUT `/api/travel/:id/places/:placeId`
- DELETE `/api/travel/:id/places/:placeId`
- POST `/api/travel/:id/places/:placeId/notes`
- PUT `/api/travel/:id/places/:placeId/notes/:noteId`
- DELETE `/api/travel/:id/places/:placeId/notes/:noteId`
