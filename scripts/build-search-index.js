import fs from 'fs';
import lunr from 'lunr';

// Read the planets data (strip BOM if present)
const raw = fs.readFileSync('./public/data/planets.min.json', 'utf8');
const text = raw.replace(/^\uFEFF/, '');
const planetsData = JSON.parse(text);

// Create the search index
const searchIndex = lunr(function () {
  this.ref('pl_name');
  this.field('pl_name', { boost: 10 });
  this.field('hostname', { boost: 8 });
  this.field('discoverymethod', { boost: 5 });
  this.field('disc_facility', { boost: 3 });
  
  planetsData.forEach((planet) => {
    this.add({
      pl_name: planet.pl_name || '',
      hostname: planet.hostname || '',
      discoverymethod: planet.discoverymethod || '',
      disc_facility: planet.disc_facility || ''
    });
  });
});

// Write the search index to a file
fs.writeFileSync('./public/data/search-index.json', JSON.stringify(searchIndex));

console.log(`Built search index for ${planetsData.length} planets`);
