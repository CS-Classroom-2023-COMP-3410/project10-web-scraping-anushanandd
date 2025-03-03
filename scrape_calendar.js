const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const baseUrl = 'https://www.du.edu';
const calendarUrl = `${baseUrl}/calendar?search=&start_date=2025-01-01&end_date=2025-12-31#events-listing-date-filter-anchor`;
const OUTPUT_FILE = path.join(__dirname, 'results', 'calendar_events.json');

/**
 * Fetch HTML content from a URL with basic error handling and retry logic.
 */
async function fetchHTML(url, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const { data } = await axios.get(url, { timeout: 5000 });
            return data;
        } catch (error) {
            console.error(`Attempt ${attempt}: Failed to fetch URL: ${url} - ${error.message}`);
            if (attempt === retries) return null; // Return null after max retries
        }
    }
}

/**
 * Extract event description from an event page.
 */
async function getEventDescription(eventUrl) {
    const html = await fetchHTML(eventUrl);
    if (!html) return undefined;

    console.log(`Scraping details from ${eventUrl}`);
    const $ = cheerio.load(html);
    
    return $('.description').text().trim() || undefined;
}

/**
 * Scrape events with times and dates from the main calendar page.
 */
async function scrapeEvents() {
    const html = await fetchHTML(calendarUrl);
    if (!html) return [];

    const $ = cheerio.load(html);
    const events = [];

    const eventElements = $('.events-listing__item');
    console.log(`Found ${eventElements.length} events.`);

    const eventData = eventElements.map((_, element) => {
        const eventElement = $(element);
        const title = eventElement.find('h3').text().trim();
        const date = eventElement.find('p').first().text().trim();
        const timeElement = eventElement.find('.icon-du-clock').parent();
        const time = timeElement.length ? timeElement.text().trim() : undefined;

        const eventUrl = eventElement.find('a.event-card').attr('href');
        const fullEventUrl = eventUrl ? (eventUrl.startsWith('http') ? eventUrl : `${baseUrl}${eventUrl}`) : null;

        return { title, date, time, fullEventUrl };
    }).get();

    console.log(`Fetching event descriptions in parallel...`);

    // Fetch descriptions in parallel using Promise.all
    const descriptions = await Promise.all(
        eventData.map(event => event.fullEventUrl ? getEventDescription(event.fullEventUrl) : Promise.resolve(undefined))
    );

    // Merge descriptions into event data
    eventData.forEach((event, index) => {
        events.push({ ...event, description: descriptions[index] });
    });

    return events;
}

/**
 * Main function to scrape all events and save them in the specified format.
 */
async function scrapeAllEvents() {
    const allEvents = await scrapeEvents();

    if (!fs.existsSync('results')) {
        fs.mkdirSync('results', { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ events: allEvents }, null, 4));
    console.log(`Scraping completed. Data saved to ${OUTPUT_FILE}`);
}

// Run the scraper
scrapeAllEvents().catch((error) => {
    console.error('Scraping process failed:', error);
});
