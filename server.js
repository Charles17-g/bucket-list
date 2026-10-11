const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'travel.json');

app.use(express.json());
app.use(express.static(__dirname));

function normalizeNotes(notes) {
  if (Array.isArray(notes)) {
    return notes
      .filter(note => note && typeof note.text === 'string')
      .map((note, index) => ({ id: Number(note.id) || index + 1, text: note.text }));
  }
  if (typeof notes === 'string' && notes.trim()) return [{ id: 1, text: notes }];
  return [];
}

function normalizePlaces(record) {
  if (Array.isArray(record.places)) {
    return record.places
      .filter(place => place && typeof place.name === 'string')
      .map((place, index) => ({
        id: Number(place.id) || index + 1,
        name: place.name,
        notes: normalizeNotes(place.notes)
      }));
  }
  if (typeof record.capital === 'string' && record.capital.trim()) {
    return [{ id: 1, name: record.capital, notes: normalizeNotes(record.notes) }];
  }
  return [];
}

async function readRecords() {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf8');
    const records = JSON.parse(content);
    return Array.isArray(records)
      ? records.map(record => {
          const { capital, notes, ...country } = record;
          return { ...country, places: normalizePlaces(record) };
        })
      : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeRecords([]);
      return [];
    }
    throw error;
  }
}

async function writeRecords(records) {
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), 'utf8');
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

app.get('/api/travel', async (req, res) => {
  try {
    res.json(await readRecords());
  } catch (error) {
    console.error('Read error:', error);
    res.status(500).json({ error: 'Could not load saved destinations.' });
  }
});

app.get('/api/travel/:id', async (req, res) => {
  try {
    const records = await readRecords();
    const country = records.find(item => String(item.id) === String(req.params.id));
    if (!country) return res.status(404).json({ error: 'Country not found.' });
    res.json(country);
  } catch (error) {
    console.error('Read country error:', error);
    res.status(500).json({ error: 'Could not load this country.' });
  }
});

app.post('/api/travel', async (req, res) => {
  try {
    const { country, place, note = '' } = req.body || {};
    if (typeof country !== 'string' || !country.trim() ||
        typeof place !== 'string' || !place.trim() ||
        typeof note !== 'string') {
      return res.status(400).json({ error: 'Country and first place are required.' });
    }

    const records = await readRecords();
    const newCountry = {
      id: nextId(records),
      country: country.trim(),
      places: [{
        id: 1,
        name: place.trim(),
        notes: note.trim() ? [{ id: 1, text: note.trim() }] : []
      }]
    };
    records.push(newCountry);
    await writeRecords(records);
    res.status(201).json(newCountry);
  } catch (error) {
    console.error('Create country error:', error);
    res.status(500).json({ error: 'Could not save this country.' });
  }
});

app.put('/api/travel/:id', async (req, res) => {
  try {
    const { country } = req.body || {};
    if (typeof country !== 'string' || !country.trim()) {
      return res.status(400).json({ error: 'Country name is required.' });
    }

    const records = await readRecords();
    const record = records.find(item => String(item.id) === String(req.params.id));
    if (!record) return res.status(404).json({ error: 'Country not found.' });
    record.country = country.trim();
    await writeRecords(records);
    res.json(record);
  } catch (error) {
    console.error('Update country error:', error);
    res.status(500).json({ error: 'Could not update this country.' });
  }
});

app.post('/api/travel/:id/places', async (req, res) => {
  try {
    const { name } = req.body || {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Enter a place name.' });
    }

    const records = await readRecords();
    const country = records.find(item => String(item.id) === String(req.params.id));
    if (!country) return res.status(404).json({ error: 'Country not found.' });
    const place = { id: nextId(country.places), name: name.trim(), notes: [] };
    country.places.push(place);
    await writeRecords(records);
    res.status(201).json(place);
  } catch (error) {
    console.error('Add place error:', error);
    res.status(500).json({ error: 'Could not add this place.' });
  }
});

app.put('/api/travel/:id/places/:placeId', async (req, res) => {
  try {
    const { name } = req.body || {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Place name is required.' });
    }

    const records = await readRecords();
    const country = records.find(item => String(item.id) === String(req.params.id));
    if (!country) return res.status(404).json({ error: 'Country not found.' });
    const place = country.places.find(item => String(item.id) === String(req.params.placeId));
    if (!place) return res.status(404).json({ error: 'Place not found.' });
    place.name = name.trim();
    await writeRecords(records);
    res.json(place);
  } catch (error) {
    console.error('Update place error:', error);
    res.status(500).json({ error: 'Could not update this place.' });
  }
});

app.delete('/api/travel/:id/places/:placeId', async (req, res) => {
  try {
    const records = await readRecords();
    const country = records.find(item => String(item.id) === String(req.params.id));
    if (!country) return res.status(404).json({ error: 'Country not found.' });
    const placeIndex = country.places.findIndex(item => String(item.id) === String(req.params.placeId));
    if (placeIndex === -1) return res.status(404).json({ error: 'Place not found.' });
    country.places.splice(placeIndex, 1);
    await writeRecords(records);
    res.json({ message: 'Place deleted successfully.' });
  } catch (error) {
    console.error('Delete place error:', error);
    res.status(500).json({ error: 'Could not delete this place.' });
  }
});

app.post('/api/travel/:id/places/:placeId/notes', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Enter a note before saving.' });
    }
    const records = await readRecords();
    const country = records.find(item => String(item.id) === String(req.params.id));
    if (!country) return res.status(404).json({ error: 'Country not found.' });
    const place = country.places.find(item => String(item.id) === String(req.params.placeId));
    if (!place) return res.status(404).json({ error: 'Place not found.' });
    const note = { id: nextId(place.notes), text: text.trim() };
    place.notes.push(note);
    await writeRecords(records);
    res.status(201).json(note);
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ error: 'Could not add this note.' });
  }
});

app.put('/api/travel/:id/places/:placeId/notes/:noteId', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'A note cannot be empty.' });
    }
    const records = await readRecords();
    const country = records.find(item => String(item.id) === String(req.params.id));
    if (!country) return res.status(404).json({ error: 'Country not found.' });
    const place = country.places.find(item => String(item.id) === String(req.params.placeId));
    if (!place) return res.status(404).json({ error: 'Place not found.' });
    const note = place.notes.find(item => String(item.id) === String(req.params.noteId));
    if (!note) return res.status(404).json({ error: 'Note not found.' });
    note.text = text.trim();
    await writeRecords(records);
    res.json(note);
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Could not update this note.' });
  }
});

app.delete('/api/travel/:id/places/:placeId/notes/:noteId', async (req, res) => {
  try {
    const records = await readRecords();
    const country = records.find(item => String(item.id) === String(req.params.id));
    if (!country) return res.status(404).json({ error: 'Country not found.' });
    const place = country.places.find(item => String(item.id) === String(req.params.placeId));
    if (!place) return res.status(404).json({ error: 'Place not found.' });
    const noteIndex = place.notes.findIndex(item => String(item.id) === String(req.params.noteId));
    if (noteIndex === -1) return res.status(404).json({ error: 'Note not found.' });
    place.notes.splice(noteIndex, 1);
    await writeRecords(records);
    res.json({ message: 'Note deleted successfully.' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Could not delete this note.' });
  }
});

app.delete('/api/travel/:id', async (req, res) => {
  try {
    const records = await readRecords();
    const remaining = records.filter(item => String(item.id) !== String(req.params.id));
    if (remaining.length === records.length) {
      return res.status(404).json({ error: 'Country not found.' });
    }
    await writeRecords(remaining);
    res.json({ message: 'Country deleted successfully.' });
  } catch (error) {
    console.error('Delete country error:', error);
    res.status(500).json({ error: 'Could not delete this country.' });
  }
});

app.get('/api/lookup/:country', async (req, res) => {
  try {
    const country = req.params.country.trim();
    if (!country) return res.status(400).json({ error: 'Enter a country name.' });
    const apiKey = process.env.REST_COUNTRIES_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Country lookup is not configured. Set REST_COUNTRIES_API_KEY and restart the server.' });
    }

    const url = new URL('https://api.restcountries.com/countries/v5/names.common');
    url.searchParams.set('q', country);
    url.searchParams.set('response_fields', 'names.common,capitals,region');
    const response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!response.ok) {
      if (response.status === 404) return res.status(404).json({ error: 'Country not found. Try another name.' });
      console.error('Country lookup service returned:', response.status, await response.text());
      return res.status(502).json({ error: 'The country lookup service is unavailable.' });
    }

    const result = await response.json();
    const match = result.data?.objects?.[0];
    if (!match) return res.status(404).json({ error: 'Country not found. Try another name.' });
    res.json({
      country: match.names?.common || country,
      capital: match.capitals?.[0]?.name || 'Not available',
      region: match.region || 'Not available'
    });
  } catch (error) {
    console.error('Lookup error:', error);
    res.status(502).json({ error: 'Could not connect to the online country service.' });
  }
});

app.listen(PORT, () => {
  console.log(`Travel Bucket List is running at http://localhost:${PORT}`);
});