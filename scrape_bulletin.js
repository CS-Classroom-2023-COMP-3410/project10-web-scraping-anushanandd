const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');

// Ensure results directory exists
fs.ensureDirSync('./results');

async function scrapeDUBulletin() {
  try {
    console.log('Starting to scrape DU Bulletin for CS courses...');
    
    // Fetch the bulletin page
    const response = await axios.get('https://bulletin.du.edu/undergraduate/majorsminorscoursedescriptions/traditionalbachelorsprogrammajorandminors/computerscience/#coursedescriptionstext');
    
    // Load HTML into cheerio
    const $ = cheerio.load(response.data);
    
    // Initialize array to store course data
    const courses = [];
    
    // Find all course blocks
    const courseBlocks = $('.courseblock');
    
    console.log(`Found ${courseBlocks.length} course blocks. Processing...`);
    
    // Iterate through each course block
    courseBlocks.each((_, element) => {
      // Extract course code and title
      const courseCodeAndTitle = $(element).find('.courseblocktitle').text().trim();
      
      // Parse course code to check if it's upper-division (3000+)
      const codeMatch = courseCodeAndTitle.match(/COMP\s+(\d+)/i);
      
      if (codeMatch && parseInt(codeMatch[1]) >= 3000) {
        // Check course description for prerequisites
        const courseDesc = $(element).find('.courseblockdesc').text().trim();
        
        // If no prerequisites mentioned in the description
        if (!courseDesc.includes('Prerequisite') && !courseDesc.includes('prerequisite')) {
          // Extract course code and title properly
          const [courseInfo] = courseCodeAndTitle.split('.');
          const [courseCode, ...titleParts] = courseInfo.split(/\s+/).filter(part => part.trim() !== '');
          const courseNumber = courseCode + '-' + titleParts[0];
          const courseTitle = titleParts.slice(1).join(' ');
          
          // Add course to the courses array
          courses.push({
            course: courseNumber,
            title: courseTitle
          });
          
          console.log(`Added course: ${courseNumber} - ${courseTitle}`);
        }
      }
    });
    
    // Save results to JSON file
    const result = { courses };
    await fs.writeJson('./results/bulletin.json', result, { spaces: 2 });
    
    console.log(`Successfully scraped ${courses.length} upper-division CS courses without prerequisites.`);
    console.log('Results saved to results/bulletin.json');
    
    return result;
  } catch (error) {
    console.error('Error scraping DU Bulletin:', error.message);
    throw error;
  }
}

// Execute the scraping function
scrapeDUBulletin()
  .then(result => console.log(`Total courses found: ${result.courses.length}`))
  .catch(err => console.error('Script failed:', err));