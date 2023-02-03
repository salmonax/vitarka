const WEATHER_URI = 'https://api.weather.gov/points/';

export async function fetchPeriods(lat, lon) {
  const weatherData =
    await fetch(`${WEATHER_URI}${lat},${lon}`).then(r => r.json());
  if (!weatherData.properties) {
    throw new Error('Invalid coordinates. Only USA is supported by weather.gov');
  }
  return (
    await fetch(weatherData.properties.forecast).then(r => r.json())
  ).properties.periods;
}


export default {
  fetchPeriods,
}