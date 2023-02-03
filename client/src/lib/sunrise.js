const API_HOST = 'https://api.culturopathy.com/'
// Requires API key:
// const LOOKUP_URI = 'https://extreme-ip-lookup.com/json/';

// Claims they never will:
const LOOKUP_URI = 'http://ip-api.com/json/';

import suncalc from 'suncalc';

let _location; // cache

// Note: this is an implicitly cached function, intended to only be called once.
export async function fetchLocation(api = API_HOST, lookup = LOOKUP_URI) {
  const { ip } = await fetch(api + 'ip').then(r => r.json());

  if (_location !== undefined) return _location;

  _location = await fetch(api + 'cors/' + lookup + ip).then(r => r.json());
  return _location;
}

export const getTimes = suncalc.getTimes;

export default {
  fetchLocation,
  getTimes,
}