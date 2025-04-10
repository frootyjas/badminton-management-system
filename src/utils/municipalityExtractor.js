const bataanMunicipalities = [
  'Abucay',
  'Bagac',
  'Balanga',
  'Dinalupihan',
  'Hermosa',
  'Limay',
  'Mariveles',
  'Morong',
  'Orani',
  'Orion',
  'Samal',
  'Pilar'
];

// function to extract municipality from address
function extractMunicipality(address) {
  if (!address) return null;

  for (let municipality of bataanMunicipalities) {
    if (address.includes(municipality)) {
      return municipality;
    }
  }
  return null;
}

module.exports = { bataanMunicipalities, extractMunicipality };
