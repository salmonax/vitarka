import { buildMergedPomsheet } from './mergeScratch.js';
import { plug } from './parsley.helper.js';

import Worker from './mergeScratch.worker.js';

export default function mergeScratchAsync(sheet, parsley) {
  console.warn('#### CALLED mergeScratchAsync.');
  const worker = new Worker();

  return new Promise((r, j) => {
    worker.onmessage = e => {
      if (e.data.error) return j(e.data.error);
      const foo = Date.now();
      // Argh, don't like having to know these keys from here:
      const updatedPomsheet = buildMergedPomsheet(e.data.convertedScratchLines, parsley);
      // console.warn('@#$@#$@#$', Date.now() - foo, built);
      r({ updatedPomsheet });
    }
    worker.postMessage({
      fn: 'mergeScratch',
      args: [
        sheet,
        plug.mergeScratch.main(parsley),
      ],
    });
  });
}