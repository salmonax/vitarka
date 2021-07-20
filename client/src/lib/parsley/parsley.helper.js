import { parseTask, parseCommentStartHour } from './parsley.shared.js';

// The following is for preparing the un-serializable parsley object for
// use in a worker thread. It's currently only used for mergeScratch.

export const plug = {
  mergeScratch: {
    main: ({ stats, media, lines, tags }) => ({
      stats: {
        category: _keysOnly(stats.category, 1),
      },
      media: _keysOnly(media, {}),
      lines,
      tags,
    }),
    worker: (serialParsley) => ({
      ...serialParsley,
      parseCommentStartHour,
      parseTask,
    }),
  }
};

function _keysOnly(obj, def) {
  return Object.keys(obj)
    .reduce((acc, n) => Object.assign(acc, { [n]: def }), {});
}

