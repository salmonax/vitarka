const API_HOST = 'https://api.culturopathy.com/'
const LOOKUP_URI = 'https://extreme-ip-lookup.com/json/';

import suncalc from 'suncalc';

export async function fetchLocation(api = API_HOST, lookup = LOOKUP_URI) {
  const { ip } = await fetch(api + 'ip').then(r => r.json());
  return fetch(api + 'cors/' + lookup + ip).then(r => r.json());
}

export const getTimes = suncalc.getTimes;

export default {
  fetchLocation,
  getTimes,
}