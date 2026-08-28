export interface EcoData {
  temperature: number; // °C
  humidity: number; // %
  rainProbability: number; // %
  vegetationType: string;
  fireRiskScore: number; // 0 - 100
  fireRiskRating: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  settlementName: string;
  settlementDistanceKm: number;
  settlementType: string;
}

// Map ESA Land Cover class to Vegetation Type
export function getVegetationType(cls: number, name: string): string {
  switch (cls) {
    case 10:
      return 'Forest / Dense Woodlands';
    case 20:
      return 'Sparsely Wooded Shrubland';
    case 30:
      return 'Savanna / Dry Grassland';
    case 40:
      return 'Agricultural Crops';
    case 50:
      return 'Urban / Built-up Area (Non-vegetated)';
    case 60:
      return 'Desert / Sparse Scrub';
    case 80:
      return 'Water Body / Non-vegetated';
    case 95:
      return 'Wetland / Mangrove Swamp';
    default:
      if (name && name.toLowerCase().includes('tree')) return 'Forest / Dense Woodlands';
      if (name && name.toLowerCase().includes('shrub')) return 'Sparsely Wooded Shrubland';
      if (name && name.toLowerCase().includes('grass')) return 'Savanna / Dry Grassland';
      if (name && name.toLowerCase().includes('crop')) return 'Agricultural Crops';
      return 'Mixed / Unknown Vegetation';
  }
}

// Compute deterministic ecological data based on location, time, and land cover
export function getEcoData(
  lat: number,
  lon: number,
  daynight: string,
  cls: number,
  name: string,
  frp: number
): EcoData {
  // 1. Temperature Calculation
  // Base temperature in India: 28°C
  let temp = 28.5;
  // Night is cooler
  if (daynight === 'N') {
    temp -= 8.0;
  } else {
    temp += 2.0;
  }
  // Latitude influence (further north = cooler)
  temp -= (lat - 18.0) * 0.65;
  // Dynamic mock offset using sin of coordinates for organic variance
  temp += Math.sin(lat * 12.3 + lon * 8.7) * 4.5;
  // Keep temp within realistic limits
  temp = Math.max(10, Math.min(48, Math.round(temp * 10) / 10));

  // 2. Humidity Calculation
  // Base humidity depending on vegetation class
  let hum = 50;
  if (cls === 95 || cls === 80) {
    hum = 82; // wetlands/water
  } else if (cls === 10) {
    hum = 65; // forests
  } else if (cls === 60 || cls === 50) {
    hum = 25; // bare/builtup
  } else if (cls === 20 || cls === 30) {
    hum = 42; // shrub/grass
  }
  // Temperature dependency (hotter air = lower relative humidity)
  hum -= (temp - 25) * 1.2;
  // Add pseudo-random offset
  hum += Math.cos(lat * 9.1 - lon * 14.3) * 6.5;
  hum = Math.max(10, Math.min(95, Math.round(hum)));

  // 3. Rain Probability
  let rain = 0;
  if (hum > 70) {
    rain = (hum - 70) * 2.2;
  } else if (hum > 45) {
    rain = (hum - 45) * 0.6;
  }
  // Adjust based on temperature (very hot air can trigger convective showers, but mostly dampens rain prob if dry)
  if (temp > 38 && hum > 60) rain += 15;
  // Add variance
  rain += Math.sin(lat * 5.5 + lon * 11.2) * 5.0;
  rain = Math.max(0, Math.min(99, Math.round(rain)));

  // 4. Vegetation Type
  const vegType = getVegetationType(cls, name);

  // 5. Fire Risk Index (FRI)
  // Higher temp, lower humidity, lower rain, and higher FRP / priority increase fire risk
  const tempWeight = Math.max(0, (temp - 12) * 1.6); // up to ~55
  const humWeight = Math.max(0, (90 - hum) * 0.8); // up to ~64
  const rainWeight = Math.max(0, (50 - rain) * 0.5); // up to ~25
  const frpWeight = Math.min(35, frp * 0.65); // up to ~35

  let rawScore = tempWeight + humWeight + rainWeight + frpWeight;

  // Add vegetation risk adjustment
  if (cls === 10 || cls === 30 || cls === 20) {
    rawScore += 12; // dry forests/grasslands burn easily
  } else if (cls === 80 || cls === 95) {
    rawScore -= 20; // water/mangroves rarely burn easily
  }

  const score = Math.max(1, Math.min(100, Math.round(rawScore)));

  // Classify rating
  let rating: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' = 'LOW';
  if (score >= 82) {
    rating = 'EXTREME';
  } else if (score >= 60) {
    rating = 'HIGH';
  } else if (score >= 35) {
    rating = 'MODERATE';
  }

  // 6. Settlement Fallback Calculations
  let setDist = 3.5;
  let setName = 'Local Hamlet';
  let setType = 'hamlet';

  if (cls === 50) {
    // Built-up area (directly inside a settlement)
    setDist = 0.1;
    setName = 'Urban Settlement / Built-up Area';
    setType = 'city/town';
  } else {
    // Other landcovers, calculate a deterministic distance (e.g. 1.2 to 8.5 km)
    const seed = Math.sin(lat * 15.4 + lon * 7.2);
    setDist = 1.2 + Math.abs(seed) * 7.3;
    setDist = Math.round(setDist * 10) / 10;

    // Generate names
    const suffixes = ['Village', 'Pur', 'Ghar', 'Khet', 'Nagore', 'Colony', 'Hamlet'];
    const idx = Math.abs(Math.round(seed * 100)) % suffixes.length;
    const suffix = suffixes[idx];
    
    // Choose a prefix based on latitude/longitude
    const prefixes = ['Green', 'Stone', 'River', 'Forest', 'South', 'North', 'Ridge', 'East', 'Valley'];
    const pIdx = Math.abs(Math.round(lon * 50)) % prefixes.length;
    const prefix = prefixes[pIdx];

    setName = `${prefix}${suffix}`;
    setType = setDist > 5 ? 'hamlet' : 'village';
  }

  return {
    temperature: temp,
    humidity: hum,
    rainProbability: rain,
    vegetationType: vegType,
    fireRiskScore: score,
    fireRiskRating: rating,
    settlementName: setName,
    settlementDistanceKm: setDist,
    settlementType: setType
  };
}
