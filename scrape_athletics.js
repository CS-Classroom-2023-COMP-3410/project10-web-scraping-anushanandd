const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const URL = 'https://denverpioneers.com';
const OUTPUT_DIR = path.join(__dirname, 'results');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'athletic_events.json');

/**
 * Fetch the webpage HTML content
 */
async function fetchPage(url) {
  try {
    console.log(`Fetching data from ${url}...`);
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching URL: ${error.message}`);
    throw error;
  }
}

/**
 * Extract event data from script content
 */
function extractEventData(scriptContent) {
  if (!scriptContent) {
    console.warn('No script content found.');
    return null;
  }

  const jsonStringMatch = scriptContent.match(/var obj = (.*?);\s*if/);
  if (!jsonStringMatch || !jsonStringMatch[1]) {
    console.warn('No valid JSON object found in script.');
    return null;
  }

  try {
    return JSON.parse(jsonStringMatch[1]);
  } catch (error) {
    console.error('JSON Parse Error:', error);
    return null;
  }
}

/**
 * Parse the HTML and extract event information
 */
function parseEvents(html) {
  const $ = cheerio.load(html);
  const scriptContent = $('section[aria-labelledby="h2_scoreboard"] script').first().html();
  const jsonObject = extractEventData(scriptContent);

  if (!jsonObject || !jsonObject.data) {
    console.warn('No event data found.');
    return [];
  }

  return jsonObject.data.map(event => ({
    duTeam: jsonObject.extra?.school_name || 'Denver Pioneers',
    opponent: event.opponent?.title || 'Unknown Opponent',
    date: event.date || 'Unknown Date',
  }));
}

/**
 * Save the extracted events to a JSON file
 */
function saveEvents(events) {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ events }, null, 2));
    console.log(`Successfully saved ${events.length} events to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error(`Error saving file: ${error.message}`);
  }
}

/**
 * Main function to run the scraper
 */
async function scrapeAthleticEvents() {
  try {
    const html = await fetchPage(URL);
    const events = parseEvents(html);

    if (events.length > 0) {
      saveEvents(events);
    } else {
      console.warn('No events were extracted.');
    }
  } catch (error) {
    console.error('Scraping process failed:', error.message);
  }
}

// Run the scraper
scrapeAthleticEvents();
