const { default: mergeScratch } = require('./mergeScratch.js');
import { plug } from './parsley.helper.js';

self.addEventListener('message', ({ data }) => {
  const { fn, args } = data;
  const [sheet, parsley] = args;
  if (fn !== 'mergeScratch' || !args) {
    postMessage({ error: 'WORKER: Invalid parameters.'});
    return;
  };
  postMessage(
    mergeScratch(
      sheet,
      plug.mergeScratch.worker(parsley),
      true,
    ),
  );
  self.close();
});