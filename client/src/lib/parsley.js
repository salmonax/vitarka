window.scratch =  `
8/14
19.5 foss, 16/217, intro, toc, community, origins X
21 dg finance, 64%, Hollande's failure of SocDec, DG SocDec critique, horizontalism XX
21.5 foss, 31, foss vs. floss, licensing issues X
23 metastasis, 40, PI, problems with informational foundationalism, LOVE this guy! X
25 p2p accounting, 16/126, wow! on post-capitalist logistics, regenerative commons X

8/11
13 yeah let's see X
8/10
26 germinal, 4%, chronology, rather great intro XX
8/9
19.5 foss, 16/217, intro, toc, community, origins X
21 dg finance, 64%, Hollande's failure of SocDec, DG SocDec critique, horizontalism XX


21.5 foss, 31, foss vs. floss, licensing issues X

23 metastasis, 40, PI, problems with informational foundationalism, LOVE this guy! X
25 p2p accounting, 16/126, wow! on post-capitalist logistics, regenerative commons X

12/6/2016
21 aom, 12/225, intron on Breton v. Bataille as entangled opposites X

21.5 rrevolution, 93, summary of diagnostic, notes, the future anterior X
22 dg money, 7, tiring explanation of Schmitt's money-as-debt, wage-as-money-revenue X

22.5 dg finance, 59%, mainstream and critical finance studies, from Lanzano to Lightfoot x
23.5 stack, 7%, Schmitt, the grossraum, Anglo-saxon matrix hegemony xx
24 sitanth, 20%, the dizzying shelters, survival v. living, positive project of vandalism x

@7/23
7/22
`;

/*
  This file is a million years old and should definitely be
  rewritten. The problem is that it "Just Works" as-is, even though
  it sucks. Guess we'll see how much it drags me down for my present
  purposes.
 */

const PARSLEY_DEFAULTS = {
  dayTarget: 16,
  dayStartHour: 9,
};

const DEFAULT_OPTS = {
  partialOnly: false, // Lets Parsley know that it's not the whole pomsheet
}

function buildParsleyData(linesOrFile, opts = DEFAULT_OPTS) {
  // Intentionally preserve linebreaks with match group, for later
  // reconstitution
  var lines = Array.isArray(linesOrFile) ? linesOrFile : linesOrFile.split(/(\r?\n)/);
  var currentDate;
  var mediaAliases = {};
  var dateBucket = {};
  var parsley = {
    dateBucket,
    linebreak: RegExp.$1,
    lines: lines,
    tasks: [],
    tags: {},
    stats: {},
    targets: {},
    media: {},
    aliasMap: {},
    startHours: { },
    DEFAULTS: PARSLEY_DEFAULTS,

    parseTask, // VITARKA: attached to keep mergeScratch pure-ish
    parseCommentStartHour, // VITARKA: attached for same reason as above
    hasDate(string) {
      return !!dateBucket[string];
    },
    dayTarget: function(dateWithOffset) {
      var index = monthName(dateWithOffset.getMonth());
      return parsley.targets[index] || PARSLEY_DEFAULTS.dayTarget;
    },
    getNearestDayWithStartHour: function(adjustedUTC, extendToFuture = false) {
      // Not super efficient, but should be fine for the purpose.
      var comps = Object.keys(parsley.startHours).map(n => Date.parse(n)).sort();
      var nearestSmallerIndex = comps.findIndex(compUTC => compUTC > adjustedUTC) - 1;
      if (extendToFuture && !comps[nearestSmallerIndex]) {
        nearestSmallerIndex = comps.length - 1;
      }
      // If no index is found, will return false
      return !!comps[nearestSmallerIndex] && (new Date(comps[nearestSmallerIndex]).toLocaleDateString());
    },
    adjustedUTC() {
      // VITARKA: CANONICAL adjustedUTC, adapted from Vitarka, but dynamic
      // Simply add 20 to the latestStartHour, but no greater than 36 (ie. 12 noon)
      // This won't *always* be right, but the optimal heuristic will go here.
      // For instance, here are two good cases to inform said heuristic:
      // 1. Compare the highest hour recorded on "yesterday"; if it's higher than
      // startHour + 20, fall back to 36.
      // 2. If the new day exists and has poms logged already, zero out the offset.
      //
      // UPDATE: this wasn't being used and I don't quite trust it. Why +20? Why max 36?
      // The latest use case is the book burn down chart; it's currently ONLY used there
      return Date.now()-(Math.min(36,this.latestStartHour() + 20) - 24) * 36e5;
    },
    adjustedDateString() {
      // TODO: the locale should be set explicitly somewhere and
      // verified to work correctly. Hardcoding to what my own pomsheet
      // uses for now.
      return (new Date(this.adjustedUTC())).toLocaleDateString('en-EN');
    },
    latestStartHour: function() {
      return this.startHours[this.getNearestDayWithStartHour(Date.now(), true)] ||
        parsley.DEFAULTS.dayStartHour;
    },
    startHour: function(adjustedUTC) {
      return parsley.startHours[(new Date(adjustedUTC).toLocaleDateString())] ||
        // VITARKA: this probably needs to be clamped to not be buggy;
        // also, should probably be a configurable option
        parsley.startHours[parsley.getNearestDayWithStartHour(adjustedUTC, true)] ||
        parsley.DEFAULTS.dayStartHour;
    },
    dayTotal: function(dateWithOffset,separateOffset) {
      var startDate;
      if (typeof separateOffset == 'number') {
        startDate = new Date(dateWithOffset.getTime());
        startDate.setHours(separateOffset,0,0,0);
      } else {
        startDate = dateWithOffset;
      }
      var startTime = startDate.getTime();
      var endDate = new Date(startTime);
      endDate.setDate(endDate.getDate()+1);
      var endTime = endDate.getTime();
      //includes tasks with endDate within bounds
      //(Note: something analogous is still needed in renderWeek())
      var filtered = this.tasks.filter(function (task) {
        return (task.startDate.getTime() > startTime || task.endDate.getTime() > startTime) &&
                task.startDate.getTime() < endTime;
      });
      return filtered.reduce(function (sum, task) {
        var bleedDuration = 0;
        //adjusts for tasks that are out of bounds
        //TODO: put a similar check in filterToWeek()
        if(task.startDate.getTime() < startTime) {
          bleedDuration = (startTime-task.startDate.getTime())/(3600000)*2;
        }
        if(task.endDate.getTime() > endTime) {
          bleedDuration = (task.endDate.getTime()-endTime)/(3600000)*2;
        }
        return sum + parseInt(task.duration)-bleedDuration;
      },0);
    },
    getStatsKeys: function() { return statsKeys; },
    //TODO: this is just to support old code; make a more a general-use filterer
    createFilteredStats: function(tasks) {
      var stats = {};
      statsKeys.forEach(function (key) { stats[key] = {} });

      tasks.forEach(function (task) {
        statsKeys.forEach(function (key) {
          var value = task[key];
          //adding parseInt fixes watch func error...
          //but it's still gets the key from Object.prototype, so...
          stats[key][value] = parseInt(stats[key][value]) || 0;
          stats[key][value] += parseInt(task.duration);
        });
      });
      return stats;
    },
    getUnique: function(key,tasks) {
      tasks = tasks || parsley.tasks;
      var baseArray = tasks.map(function(task) { return task[key]; });
      return baseArray.filter(function(v,i) { return baseArray.indexOf(v) == i && v});
    },
    /**
     * VITARKA: different ES6 style; don't care
     * Dumping this here for the time being; it MIGHT be more
     * appropriate elsewhere, but putting it here both separates it
     * from the main app and gives me easy access to the parsley object,
     * which will help with changing the case for lazily-entered book aliases.
     *
     * It converts from a shorter format that I use on my phone. It should:
     *  1. Take the scratch sheet and an optional parsley object.
     *  2. Convert it to standard format, with appropriate width and tabbing.
     *  3. For descriptions that were truncated, add an indented comment
     *     with the rest of the description right below it.
     *  3. Merge the converted scratch sheet into a pomsheet string, but
     *     without of course changing our closured parsley instance.
     *  4. Return the following:
     *      a. The merged version of the pomsheet we just made
     *      b. An updated scratch sheet, with the processed dates prefixed with "@",
     *        the termination marker
     *
     * NOTE: In Vitarka, the intention is that the caller will use the output
     * to write both to the scratch sheet AND to the pomsheet.
    **/
    mergeScratch(sheet, _parsley = parsley) {
      // These constants are currently used in typeRegistry.task.convert
      // for splitting overlong lines. We're collecting them here
      // for visibility.
      sheet = sheet.replace(/\r/g,''); // KLUDGE ALERT: fix a rotten assumption, badly.
      const CONSTANTS = {
        maxLineLength: 80,
        maxBodyLength: 79,
        tabLength: 8,
      };
      const typeRegistry = {
        // Oh boy, this commentStartHour thing cropped up everywhere, didn't it?
        commentStartHour: {
          regex: /^#\s?([0-9][0-9]?)(?:$|\:\s*[0-9][0-9]?\s+[0-9][0-9]?\s+[0-9][0-9]?\s*$)/,
          convert(line, linebreak = '\n') {
            return line.replace(
              this.regex,
              (_, start) => `# ${start}: ${+start + 5} ${+start + 10} ${+start + 15}`,
            );
          },
          parse(converted, lastOfType) {
            // Note: calculating the startHour is a bit pointless, but
            // feels weird to follow this dumb pattern without doing it.
            return {
              startHour: _parsley.parseCommentStartHour(converted),
              date: lastOfType.date,
            };
          },
        },
        date: {
          regex: /^(\d\d?)\/(\d\d?)\/?(\d?\d?\d?\d?)\s*$/,
          // WARNING: this "before" is ONLY for live merging, which
          // needs to be able to merge the entire scratch file. I went
          // through various ways to mark dates "read" over the years,
          // and this will clean them out.
          before(line) {
            // There are strange things amiss in the scratch file (mine),
            // with both @ and # used in both prefix and postfix to denote
            // a date as "read". This cleans it up.
            if (!line) return line;
            const normalized = line.split(/(?:@+|#+)/).filter(n => n)[0];
            return normalized.trim();
            // return line.replace(/@/g,'');
          },
          convert(line, linebreak = '\n', acc = { yearOffset: 1 }) {
            return line.replace(
              this.regex,
              // Add current year if not included
              // NOTE: the stats object is a kludge; many dates in the scratch sheet
              // fail to specify a date, so this is an ad-hoc way to push them down.
              '$1/$2/' + (RegExp.$3 ? '$3' : (new Date()).getFullYear() - acc.yearOffset + 1),
            );
          },
          after(originalLine, convertedDateString) {
            // WARNING: for marking things read, there's an edge case where a date
            // larger than the adjustedDateString won't be be marked. It's expected
            // behavior, but the subjective experience will be that it's
            // annoyingly refusing to mark both today's AND yesterday's date
            // in certain (very rare) cases
            //
            // TODO: once adjustedUTC has taken the latest pomsheet date into account,
            // make sure to also "phone home" when/if the scratch sheet has a higher
            // date, thereby fixing this.
            if (new Date(convertedDateString) < new Date(_parsley.adjustedDateString())) {
              return '@' + originalLine;
            }
            return originalLine;
          },
          parse(converted) {
            return Date.parse(converted);
          }
        },
        task: {
          regex: () => {
            // Allow two different types of task from the scratch sheet:
            // 1. Books with the topic ellided
            // 2. A line with a topic that already exists in the main sheet
            const existingTopics =
                '(' + Object.keys(_s.parsleyData.stats.category)
                    .map(n => n.replace(/[^A-Za-z]\s?/g,'').toLowerCase())
                    .join('|') +
                 ')';
            const taskRegex =
                String.raw`^(\d\d?\.?5?)\s*(?:` +
                existingTopics +
                String.raw`,|([\w\s]+),\s*(\d+?%?\/?\d*),)\s*(.+)\s+([xX]*)$`;
            return RegExp(taskRegex);
          },
          before(line) {
            // Sigh, some lines don't end in "X", so add it if needed
            if (!/\s+[xX]+$/.test(line)) return line + ' X';
            return line;
          },
          convert(line, linebreak = '\n') {
            return line.replace(
              this.regex(),
              (_, time, topic, title, progress, description, poms) => {
                // Te following might change as more media types are supported
                const isBook = progress !== undefined;
                // Magic number, what I'm using on my pomsheet
                const maxLineLength = CONSTANTS.maxLineLength;
                // Likewise, used to split descriptions into multiple lines
                const maxBodyLength = CONSTANTS.maxBodyLength;
                const tabLength = CONSTANTS.tabLength; // for clarity, below

                let body;
                if (isBook) {
                  topic = 'Read';
                  title = _matchCaseToGiven(title, _parsley.media) || title; // fallback if none exists
                  body = `${topic}: ${title} -> ${progress}, ${description}`;
                } else {
                  // topic must have existed for match, so no fallback
                  topic = _matchCaseToGiven(topic, _parsley.stats.category);
                  body = `${topic}: ${description}`;
                }
                let bodyLineOne, bodyLineTwo;

                if (body.length >= maxBodyLength) {
                  const lastSpace = body.slice(0, maxBodyLength).lastIndexOf(' ');
                  bodyLineOne = body.slice(0, lastSpace);
                  bodyLineTwo = body.slice(lastSpace + 1);
                }

                const trailingTabCount = Math.max(1, Math.ceil((maxLineLength - (bodyLineOne || body).length) / tabLength));
                const tabsAndPoms = `${'\t'.repeat(trailingTabCount)}${(poms || 'X').toUpperCase()}`;
                return `${time}\t${bodyLineOne || body}${tabsAndPoms}`
                  + (bodyLineTwo ? `${linebreak}==\t      ${bodyLineTwo}` : '');
              }
            );

            function _matchCaseToGiven(sloppyText, media) {
              return Object.keys(media).find(title => {
                return sloppyText.toLowerCase() === title.toLowerCase();
              });
            }
          },
          parse(converted, lastOfType) {
            return _parsley.parseTask(converted, -1, lastOfType.date);
          },
        },
      };

      const { convertedScratchLines, updatedScratch } = convertScratch(sheet, typeRegistry);

      return {
        updatedPomsheet: buildMergedPomsheet(convertedScratchLines),
        updatedScratch,
      };

      function buildMergedPomsheet(scratchData) {
        const clonedLines = _parsley.lines.slice()//(0, 540); // expand to test case until this is done

        const { dateBucket, linebreak: br } = _parsley;
        const dates = Object.keys(dateBucket).sort((a, b) => b.utc - a.utc);
        const mergedScratchDateBucket = {};
        /**
         * Hmm, on second thought, why don't we just:
         * 1. have scratchDateBucket merge tasks with the pomsheet, then reverse sort them
         * 2. in the next forEach, in the date-is-in-pomsheet case, instead of iterating across
         *  dateBucket items, iterate across the merged ones. Whenever the index is -1,
         *  grab the last item it found and insert it above.
         * 3. If it's the last item, use the current date's endIndex
         */
        // Annoyingly, legacy parsley doesn't provide metadata, so do it here
        const toWrapped = task => ({ text: _parsley.lines[task.index], type: 'task', parsed: task });
        scratchData.forEach(line => {
          if (line.type === 'task') {
            const taskDate = line.parsed.date;
            if (!mergedScratchDateBucket[taskDate]) {
              // Keep consistent with other dateBucket, just because
              mergedScratchDateBucket[taskDate] = {
                tasks: _parsley.dateBucket[taskDate] ? _parsley.dateBucket[taskDate].tasks.map(toWrapped) : [],
              };
            }
            mergedScratchDateBucket[taskDate].tasks.push(line);
          }
        });
        // Now reverse sort all of these for merge
        Object.keys(mergedScratchDateBucket).forEach(date => {
          mergedScratchDateBucket[date].tasks =
            mergedScratchDateBucket[date].tasks
              .sort((a, b) => +b.parsed.time - +a.parsed.time)
              // Prevent duplicates here. If everything else is working correctly,
              // it's only strictly required for the current day (which is never marked
              // "read" until the following day) but running it indiscriminately
              // will also avoid a bad writes in conditions where the pomodoro sheet has been
              // correctly written but the scratch sheet was either overwritten by the user
              // with unmarked dates or otherwise failed to write.
              .filter(({ text, parsed }, i, a) => {
                if (parsed.index !== -1) return true; // let all non-scratch entries through
                const prev = a[i - 1];
                const next = a[i + 1];
                // Do two types of dup check:
                // 1. Check for same media title, time, and progress, regardless of description;
                // As a pomsheet user, it's pretty common to completely rephrase descriptions,
                // so this is more permissive and robust than a text check.
                if (parsed.media) {
                  const isSameMediaEntry = other =>
                    other && other.parsed.media &&
                    other.parsed.media === parsed.media &&
                    // for live-merge, ignore the time; sometimes it will
                    // be jiggered by hand to prevent overlaps after a manual merge
                    //other.parsed.time === parsed.time &&
                    other.parsed.progress === parsed.progress;
                  if (isSameMediaEntry(prev)) return false;
                  if (isSameMediaEntry(next)) return false;
                  return true;
                }
                // 2. Do a fallback check, which relies on the line text:
                const truncText = text.split(br)[0]; // only take first half of multiline entries
                // WARNING: the behavior below depends on toWrapped.
                // If we later add a line wrapper to Parsley that concatenates
                // a full description, make sure to only grab the first line.
                if (prev && truncText === prev.text) return false;
                if (next && truncText === next.text) return false;
                return true;

                // 3. Some looser heuristics could be added (eg. time + topic + number of poms)
                // (The reason for all this is to prevent overwriting an item just because it
                // has the same timestamp; they're arbitrarily rounded up or down by the user, so
                // timestamps will sometimes overlap.
              });
        });

        // WARNING: this is an awful way to do this; we shouldn't need to re-parse the dates.
        // Leaving it for now.
        const allDates =
          Object.keys(dateBucket)
            .concat(Object.keys(mergedScratchDateBucket))
            .filter((n, i, a) => a.indexOf(n) === i)
            .map(text => ({ type: 'date', parsed: Date.parse(text), text }))
            .sort((a, b) => a.parsed - b.parsed);

        let dateInsertion = {
          cursor: null,
          mergedLine: '',
          prepend: '',
        };

        allDates.forEach(({ type, text: dateText, parsed }, i, _allDates) => {
          if (!mergedScratchDateBucket[dateText]) return; // only interested in scratch-only dates

          const dateAbove = _allDates[i + 1] && _allDates[i + 1].text;
          const dateBelow = _allDates[i - 1] && _allDates[i - 1].text;
          if (_parsley.hasDate(dateText)) {
            const date = dateBucket[dateText];
            const mergedTasks = mergedScratchDateBucket[dateText].tasks;

            // dateBucket[dateText].tasks.forEach(n => console.log(n.index, _parsley.lines[n.index]));

            const needsMerge = task => task.parsed.index === -1;
            let insertion = {
              cursor: null,
              mergedLine: '',
              prepend: '',
            };
            mergedTasks.forEach((task, i, tasks) => {
              let taskBelow = tasks[i - 1];
              let taskAbove = tasks[i + 1];
              if (needsMerge(task)) {
                if (taskBelow) {
                  // If the task underneath it doesn't need to be merged,
                  // it means that this is the first task in an insertion set,
                  // so set the cursor and initiate the line
                  if (!needsMerge(taskBelow)) {
                    insertion.cursor = taskBelow.parsed.index;
                    // Add an extra linebreak between the task being anchored and the text
                    insertion.mergedLine = task.text + br + taskBelow.text;
                  } else {
                    insertion.mergedLine = task.text + br + insertion.mergedLine;
                  }
                } else {
                  // If there's no task below, use the date's endIndex, which is always
                  // either the line before the next date or the end of the file

                  // We need to pay attention to the following conditions:
                  //
                  // 1. Whether the line at the cursor is blank, which can
                  // be false at the end of the file if it lacks a trailing linebreak. In
                  // this case, prepend the line instead of using it to start the insertion
                  // 2. Whether the line *above* the cursor has content, which happens
                  // when no trailing linebreak is added between dates; in this case, start
                  // the insertion with an additional linebreak.
                  const lineAtCursor = clonedLines[date.endIndex];
                  const lineAboveCursor = clonedLines[date.endIndex - 1];
                  let startingInsertion;
                  if (/^\s*\r?\n?\s*$/.test(lineAtCursor)) { // case 1
                    startingInsertion = lineAtCursor;
                    insertion.prepend = /^\s*\r?\n?\s*$/.test(lineAboveCursor) ? '' : br; // case 2
                  } else {
                    startingInsertion = br;
                    insertion.prepend = lineAtCursor + br;
                  }

                  insertion.cursor = date.endIndex;
                  insertion.mergedLine = task.text + br + startingInsertion;

                }
              }
              if (!needsMerge(task) || !taskAbove) {
                if (insertion.cursor) {
                  clonedLines[insertion.cursor] = insertion.prepend + insertion.mergedLine;

                  insertion.cursor = null;
                  insertion.mergedLine = '';
                  insertion.prepend = '';
                }
              }
            });
          } else {
            // If we're here, no date was found in the pomsheet, so we need to start
            // concatenating any such dates for which that's consecutively the case.
            const joinedDateAndTasks =
              dateText + br + br +
              mergedScratchDateBucket[dateText].tasks.map(n => n.text).join(br); //+

            // This is just to keep semantics identical to task logic:
            const dateNeedsMerge = date => !dateBucket[date];

            if (dateBelow) {
              // If dateBelow was already in the original, it means
              // this is the first date in an insertion set, so concatenate
              // it with joinedDateAndTasks and set the cursor
              if (!dateNeedsMerge(dateBelow)) {
                dateInsertion.cursor = dateBucket[dateBelow].index;
                // Since we're anchoring to a date, line above will be a linebreak, and
                // two above will be either another linebreak (which we want), or a string, or
                // undefined due to being the beginning of the file.
                // If it's neither empty NOR undefined, we want to prepend a linebreak, so
                // that it doesn't run flush with the last task of the date above it
                const lineTwoAboveCursor = clonedLines[dateInsertion.cursor - 2];
                if (!/^\s*\r?\n?\s*$/.test(lineTwoAboveCursor) && lineTwoAboveCursor !== undefined) {
                  dateInsertion.prepend = br;
                }
                dateInsertion.mergedLine = joinedDateAndTasks + br + br + dateBelow;
              } else {
                dateInsertion.mergedLine = joinedDateAndTasks + br + br + dateInsertion.mergedLine;
              }
            } else {
              // No dateBelow means we're anchoring to the end of the last date
              dateInsertion.cursor = dateBucket[dates[dates.length - 1]].endIndex;

              // NOTE: in this condition, we're using the endIndex, which *should* be a blank line,
              // but might not be. If it isn't, it belongs *before* our insertion. Check for it here,
              // and set dateInsertion.prepend accordingly.
              const lineAtCursor = clonedLines[dateInsertion.cursor];
              const lineAboveCursor = clonedLines[dateInsertion.cursor - 1];
              let startingInsertion;
              if (/^\s*\r?\n?\s*$/.test(lineAtCursor)) {
                startingInsertion = lineAtCursor + br;
                dateInsertion.prepend = br;
              } else {
                startingInsertion = br;
                dateInsertion.prepend = lineAtCursor + br + br;
              }
              dateInsertion.mergedLine = joinedDateAndTasks + br + startingInsertion;
            }
          }
          if (_parsley.hasDate(dateAbove) || !dateAbove) {
            // If dateInsertion has a cursor, it means we've been
            // collecting dates, and here's where we dump the last set.
            if (dateInsertion.cursor !== null) {
              clonedLines[dateInsertion.cursor] = dateInsertion.prepend + dateInsertion.mergedLine;

              dateInsertion.cursor = null;
              dateInsertion.mergedLine = '';
              dateInsertion.prepend = '';
            }
          }
        });
        // FATAL: this is a kludge to add commentStartHours, which takes advantage of the way
        // parsley concatenates multiple dates with the same info. The correct way to do
        // it will have to wait; just be aware that this crap should only be added on a live-merge
        // and never written out to the pomsheet.
        const startHourPostfix = scratchData
          .filter(datum => datum.type === 'commentStartHour')
          .map(datum => br + datum.parsed.date + br + datum.text)
          .join('');

        return clonedLines.join('') + startHourPostfix;

      }
      function convertScratch(sheet, registry) {
        // Intentionally preserve linebreaks with matchgroup
        const scratchLines = sheet.trim().split(/(\r?\n)/);
        const convertedLines = [];
        const lastOfType = {};

        // WARNING: these are here as a typeRegistry.date kludge and should be refactored out
        const accumulatorBucket = {};
        // Some dates in the scratch file DO have a year on them; strip it so that the basis
        // for comparing dates is always the same
        const noYear = string => string.split(/\/\d{4}$/)[0];

        for (let i = 0; i < scratchLines.length; i++) {
          const line = scratchLines[i];

          // Convention is to preface an item with "@" when accounted for
          // so break when the first one is found.
          // When not live-merging, uncomment the following:
          // if (line[0] === '@') break;


          // My scratch file morphs into various previous formats, the oldest
          // transition of which is marked as the following, after which
          // the dates change order; break here
          if (line.includes('-- old --')) break;

          Object.keys(registry).some(type => {
            const { regex: regexOrFunc, before, after, parse } = registry[type];
            const regex = typeof regexOrFunc === 'function' ? regexOrFunc() : regexOrFunc;
            const normalizedTarget = before ? before(line) : line;
            if (!regex.test(normalizedTarget)) return false;

            // FATAL: Degenerate anti-pattern, but lets the convert function take
            // an accumulator as a parameter
            // TODO: incorporate this into typeRegistry, cleanly!
            let accumulator;
            if (type === 'date') {
              const convertAhead = registry[type].convert(normalizedTarget);
              if (!accumulatorBucket[type]) {
                accumulatorBucket[type] = 1;
              }
              // Assume descending order; if a date doesn't descend, it probably means it's in the previous year
              if (lastOfType[type] && Date.parse(noYear(lastOfType[type])) < Date.parse(noYear(convertAhead))) {
                accumulatorBucket[type] += 1;
                //console.error('OH SHIT WE FOUND A BLIP', noYear(lastOfType[type]), 'less than', noYear(convertAhead))
              }
              accumulator = { yearOffset: accumulatorBucket[type] };
            }
            const convertedLine = registry[type].convert(normalizedTarget, undefined, accumulator);

            lastOfType[type] = convertedLine;
            convertedLines.push({
              text: convertedLine,
              type,
              ...(parse && {
                parsed: parse(convertedLine, lastOfType),
              }),
            });
            // Yes, mutating in place. Get off my lawn!
            scratchLines[i] = (after) ? after(line, convertedLine) : line;
            return true;
          });
        }
        return { convertedScratchLines: convertedLines, updatedScratch: scratchLines.join('') };
      }
    },
  };

  var statsKeys = "year month week tag category subcategory media".split(' ');
  statsKeys.forEach(function(key) { parsley.stats[key] = {} });
  //NOTE: currently assumes tag definitions are at the top of file!
  //would be better to capture all tag defs FIRST, then re-iterate

  // var eof = 150;
  var eof = lines.length;
  for (var i = 0; i < eof; i++) {
    // Added trim much later, be wary of any weirdness
    // VITARKA: next line won't do anything; should probably nix replace and trim
    var line = lines[i].replace(/\r?\n|\r/g,'').trim();
    if (isMediaAlias(line)) {
      const [ short, title, author ] = line.split(/\s*(?:->|\[|\])\s*/);
      if (!mediaAliases[short]) {
        mediaAliases[short] = Object.assign({ title }, author && { author });
      }
    }
    if (isCommentStartHour(line)) {
      var startHour = parseCommentStartHour(line);
      if (currentDate && !isNaN(startHour)) {
        // VITARKA EXPERIMENTAL: Take into account that mergeScratch will append
        // commentStartHour lines to the end of the file; always use the MINIMUM
        // one!
        parsley.startHours[currentDate] = parsley.startHours[currentDate] !== undefined ?
          Math.min(parsley.startHours[currentDate], startHour) :
          startHour;
      }
      continue;
    }
    if (isComment(line)) { continue; }

    if (isStartHour(line)) {
      var startHour = +line.split(':')[1];
      if (currentDate && !isNaN(startHour)) {
        parsley.startHours[currentDate] = startHour;
      }
      continue;
    }
    if (isDate(line)) {
      // Before re-assigning the currentDate (which is a really terrible pattern btw, old self),
      // set the endBucket for the lastDate for the current index minus one
      if (currentDate && dateBucket[currentDate]) {
        dateBucket[currentDate].endIndex = i - 1;
      }
      currentDate = line;
      // WARNING: there's an assumption built in here that dates will only appear once.
      // Up until now, it hasn't mattered, and the file has never actually been order-dependent, either
      // I definitely need to decide how to deal with that case; I can still only store one index,
      // say, and decide that it'll always be the one at the top, or at the bottom. Or I can
      // store a list of indices and deal with it wherever it's used, just needs to be deliberate.
      dateBucket[currentDate] = {
        text: currentDate,
        index: i,
        tasks: [],
        next: null,
        prev: null,
        utc: Date.parse(line),
        endIndex: null,
      };
    } else if (isTask(line)) {
      var task = parseTask(line,i);
      parsley.tasks.push(task);
      parsley.dateBucket[currentDate].tasks.push(task);
      updateStats(task);
    } else if (isTarget(line)) {
      //syntax doesn't specify or even care about a YEAR yet, but should.
      line = line.split(' ');
      var interval = line[0];
      var target = line[1];
      //bleh, need to figure out how to both:
      //1. Always prioritize a month target over an arc definition
      //2. Prioritize the top most value in the file, at least until I sort everything.
      var arcNameIndex = "Beginning Middle End".split(' ').indexOf(interval)
      if (arcNameIndex != -1 ) {
        for (var j = 0; j < 4; j++) {
          interval = monthName(j+arcNameIndex*4);
          parsley.targets[interval] = parsley.targets[interval] || target;
        }
      } else {
        // parsley.targets[interval] = parsley.targets[interval] || target;
        parsley.targets[interval] = target;
      }
    } else if (isTagDefinition(line)) {
      var tag = line[0];
      //first tag in file gets priority
      //later, there will be multiple passes
      parsley.tags[tag] = parsley.tags[tag] || line.slice(2,line.length);
      //unaccounted-for line
    }
  }

  // p(Object.keys(parsley.stats));
  // console.log(parsley.stats['year']);
  //


  parsley.tasks.forEach(task => {
    if (!task.media) return;
    if (parsley.media[task.media].tasks === undefined) {
      parsley.media[task.media].tasks = [];
    }
    parsley.media[task.media].tasks.push(task);
  });
  for (let item in parsley.media) {
    // TODO: don't sort by progress but by data!
    // This should properly handle media re-starts
    const mediaItem = parsley.media[item];
    mediaItem.tasks.sort((a, b) => a.progress - b.progress);

    // VITARKA: canonize book progress info from BookCovers;
    // much better here
    // TODO: consider putting it into a subobject; BookCovers puts it in "vitarka"
    if (mediaItem.goal) {
      const progToDate = mediaItem.tasks[mediaItem.tasks.length-1].progress;
      const pomsToDate = mediaItem.tasks.reduce((acc, n) => acc+(+n.duration), 0);
      const progPerPom = progToDate/pomsToDate;
      const pomsLeft = Math.max(0, Math.round((mediaItem.goal-progToDate)/progPerPom));
      // not on a map, so w=on't render the component
      Object.assign(mediaItem, {
        progPerPom,
        pomsToDate,
        progToDate,
        pomsLeft,
      });
      Object.assign(mediaItem, getExperimentalInfo(mediaItem));
    }

    // Add full title and author properties, if available
    if (!mediaAliases[item]) continue;
    let { title, author } = mediaAliases[item];
    Object.assign(
       mediaItem,
       { title },
       author && { author },
    );
    // Add aliased name to map; consider changing
    parsley.aliasMap[title] = item;
  }

  // VITARKA: link up the dateBucket, currently used for sheet merges
  Object.keys(dateBucket)
    .sort((a, b) => dateBucket[b].utc - dateBucket[a].utc) // WARNING: this wasn't working before!
    .forEach((date, i, dates) => {
      // VITARKA: as of now, this is the only place opts.partialOnly is used.
      // Later, mergeScratch should *definitely* be disabled, just
      // in case I get boneheaded and try to call it from there.
      if (!dateBucket[date].endIndex && !opts.partialOnly) {
        // For the last item, just stick it at the end of the file.
        // WARNING: Ignores the edge case that there might be a bunch of non-date specific
        // junk there. The only way to do this fully correctly would involve associating
        // subsets of line types with their nearest date and checking for those types,
        // but YAGNI for now. This whole thing is junk.
        dateBucket[date].endIndex = parsley.lines.length-1;
      }
      return Object.assign(dateBucket[date], {
        next: dateBucket[dates[i-1]],
        prev: dateBucket[dates[i+1]],
      });
    });
  Object.keys(dateBucket)
    .sort((a, b) => dateBucket[a].utc - dateBucket[b].utc)
    .forEach((date, i, a) => {
      let timeFromTasks;
      if (dateBucket[date].tasks.length) { // get the tasks
        timeFromTasks =
          Math.floor(Math.min.apply(null, dateBucket[date].tasks.map(n => +n.time - n.duration/2)));
      }
      // IMPORTANT ASSUMPTION: both sheets have already been processed, so if this is empty,
      // no user-specified startHour exists for that date.
      const userSpecifiedTime = parsley.startHours[date];
      if (userSpecifiedTime !== undefined) {
        if (timeFromTasks !== undefined) {
          // Override even a user-specified date if an earlier task exists.
          // This fixes a long-standing potential bug.
          parsley.startHours[date] = Math.min(userSpecifiedTime, timeFromTasks);
        }
      } else {
        // No startHour exists, so make inferences:
        // 1. Get the nearestPreviousTime
        // 2. If both that and timeFromTasks exists, take the smallest. This is because
        //  there's no guarantee that the day started right before the first pomodoro;
        //  it's very often NOT the case. This assumption is canonized from Bindu.
        // 3. If they don't both exist, assign to timeFromTasks || nearestPrevious time;
        //   if they are both empty, it's fine, and DEFAULTS.startHour will end up used.
        let nearestPreviousTime;
        let counter = i;
        while (!nearestPreviousTime && counter >= 0) {
          nearestPreviousTime = parsley.startHours[a[--counter]]
        }
        // Only runs if NO existing time!
        if (timeFromTasks !== undefined && nearestPreviousTime !== undefined) {
          parsley.startHours[date] = Math.min(nearestPreviousTime, timeFromTasks);
        } else {
          parsley.startHours[date] = timeFromTasks || nearestPreviousTime;
        }
      }
    });

  return parsley;

  function updateStats(task) {
    statsKeys.forEach(function (key) {
      var value = task[key];
      //parseInt() here avoids watch func... still just a kludge
      parsley.stats[key][value] = parseInt(parsley.stats[key][value]) || 0;
      parsley.stats[key][value] += parseInt(task.duration);
    });
  }
  function parseCommentStartHour(line) {
    return +line.replace('#', '').split(':')[0].trim();
  }

  function parseTask(line, index, _currentDate = currentDate) {
    var date,
        time,
        tag,
        category,
        subcategory,
        description,
        duration,
        //NOTE: might cause problem with filters
        media =  null,
        progress = null,
        progUnit = false;

    var split = line.split(/\s+|\t+/);
    time = split[0];
    duration = split[split.length-1].replace(/[^Xx]/g,'').length; // Dear preivous self: WAT?

    tag = checkTag(split[1]);
    var middle = split.slice((tag?2:1),split.length-1).join(' ').split(':');
    tag = tag || "None";
    //TODO: uh oh... it's splitting the date for every task?!
    var splitDate = _currentDate.split('/'),
        year = splitDate[2],
        month = splitDate[0],
        day = splitDate[1];

    var splitEndHour = time.split('.'),
        endHours = splitEndHour[0],
        endMinutes = splitEndHour[1] ? "30":"00";

    var startHour = (parseFloat(time)-(0.5)*parseInt(duration)).toString(),
        splitStartHour = startHour.split('.'),
        startHours = splitStartHour[0],
        startMinutes = splitStartHour[1] ? "30":"00";

    var endDate = new Date(year, parseInt(month)-1, day, endHours, endMinutes);

    var startDate = new Date(year, parseInt(month)-1, day, startHours,startMinutes);
    /* baseDate is the date marked in the pomsheet, without time info */
    var baseDate = new Date(year,parseInt(month)-1,day);
    baseDate.setHours(0,0,0,0);

    if (middle.length >= 2) {
      var categories = middle[0].split(/,\s?/);
      category = parseRocket(categories[0].trim());
      subcategory = categories[1] ? parseRocket(categories[1].trim()) : "None";
      description = middle.slice(1,middle.length).join(' ').trim();
    } else {
      category = subcategory = "None";
      description = middle.join(' ').trim();
    }
    description = parseRocket(description);
    //make sure to lose the toString() business on refactor
    //... that is, if you can even figure out why they're there to begin with.
    return {
      //lineIndex; rename.
      index: index,
      time: time,
      date: _currentDate,
      startDate: startDate,
      endDate: endDate,
      baseDate: baseDate,
      category: category,
      subcategory: subcategory,
      tag: tag,
      description: description,
      duration: duration.toString(),
      year: endDate.getFullYear().toString(),
      month: monthName(endDate.getMonth()),
      week: weekNum(endDate.getDate()),
      media: media,
      // TODO: maybe progress should go in media? Would be a breaking change, though
      progress: progress,
    }

    function checkTag(maybeTag) {
      var definedTags = Object.keys(parsley.tags).join('');
      //this regex is pretty good, but doesn't limit non-consecutive occurrences
      //eg. "EErrEE" would be a false positive.
      var isTag = RegExp("^((["+definedTags+"])\\2?(?!\\2))+$").test(maybeTag);
      return isTag ? maybeTag : null;
    }

    //Something fishy is going on here...
    function parseRocket(text) {
      if (text && text.indexOf("=>") == -1 && text.indexOf("->") == -1) {
        return text;
      }
      if (text) {
        var type = text.indexOf("=>") > -1 ? "output" : "input";
        var set = text.split(/\s?[-=]>/);
        var item = set[0];
        var value = set[1];
        var pages = value.split(',')[0].split('/')[1];
        var goal;
        if (value.indexOf("%") != -1) {
          goal = 100
          progUnit = 'percentage';
        } else if (pages) {
          goal = +pages;
          progUnit = 'pages';
        }
        parsley.media[item] = parsley.media[item] || {}
        if (goal) { parsley.media[item]["goal"] = goal }
        media = item;
        // VITARKA: Add progUnit here, I guess; yeesh!
        parsley.media[item].progUnit = progUnit;
        parsley.media[item].title = item; // Hmm... the abbrevs aren't *actually* titles, but leaving for now
        progress = parseInt(value);
        //TODO: remove rocket and value, but preserve description
        return text;
      }
      return text;
    }
  }


  //TODO: This might be more useful as an actual number.
  //(The only reason it's like this was for the filter browser.)
  //TODO: start using utils.weekNum?
  function weekNum(day) {
    var bracket = Math.floor((day-1)/7);
    // p(day + " is Week " + (bracket+1));
    return bracket < 4 ? "Week " + (bracket+1) :"Week Burst";
  }

  function monthName(index) {
    return "January February March April May June July August September October November December".split(' ')[index];

  }
  function isTagDefinition(line) {
    return /^[^\d]{1}\s.*/.test(line);
  }

  // Vitarka: reading a comment line annoys me a bit, but in 2020 I've
  // adopted a style across many days that involves a comment
  // of the format "# <startHour>: <Block 1 end> <Block 2 end> <Block 3 end>"
  // for my own visual reference. This will detect and use it.
  function isCommentStartHour(line) {
    return /^#\s?[0-9][0-9]?:\s*[0-9][0-9]?\s+[0-9][0-9]?\s+[0-9][0-9]?\s*$/.test(line);
  }
  function isComment(line) {
    return /^#.*/.test(line);
  }

  function isTarget(line) {
    return /^(January|February|March|April|May|June|July|August|September|October|November|December|Beginning|Middle|End)\s\d+$/.test(line);
  }

  function isDate(line) {
    return /[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{1,4}\w*$/.test(line);
  }

  function isTask(line) {
    // return /^([0-9]|[01][0-9]|2[0-4])(\.[0,5]|[\s,\t]).*[\s,\t]((?:\[|\()?X(\]|\))?)+$/.test(line);
    // only change is to match to 39 instead of just to 24.
    return /^([0-9]|[0-3][0-9])(\.[0,5]|[\s,\t]).*[\s,\t]((?:\[|\()?X(\]|\))?)+$/.test(line);
  }

  function countPoms(line) {
    //This can probably be much shorter.
    return line.match(/((\[|\()?X(\]|\))?)+$/)[0].replace(/(\[|\]|\(|\))/g,"").length
  }

  function isStartHour(line) {
    return /^[sS]tart: [0-9][0-9]?\s*$/.test(line);
  }

  function isMediaAlias(line) {
    return /^[a-zA-Z0-9+'\s]+\s?->\s?[a-zA-Z0-9+'\s_,\-.:\[\]]+$/.test(line);
  }

  // TODO: dumping this in here from now; pull in from another module
  // It gets pomsLeft/progPerPom using weighted averages.
  function getExperimentalInfo(media) {
    return getWeightsFromBook(media);

    function getWeightsFromBook(bookData) {
       const splitTasks = getSplitTasks(bookData);//, count);
       const slopes = getSlopes(splitTasks);
       const deltas = deltify(slopes); // length - 1, projected forward
       const maxDelta = Math.max.apply(null, deltas);
       const minDelta = Math.min.apply(null,deltas);
       const weights = deltas.map((n, i) => {
         return n == 0 ? (1/(+splitTasks[i].task.duration))**(1/2) :
            n < 0 ? (1-n/(minDelta*1.01)) :
            (1-n/(maxDelta*2))**(1/2);
       });
       weights.push(1);

       const weightSum = weights.reduce((acc, n) => acc+n, 0);
       const weightedAverage = slopes.reduce((acc, n, i) => acc+n*weights[i], 0)/weightSum;

       const { progPerPom: naiveProgPerPom, progToDate, pomsToDate, goal } = bookData;
       const percentToDate = progToDate/goal;
       const adjustedPercent = Math.min(1, percentToDate/0.5);
       const metaWeighted = weightedAverage*(1-adjustedPercent) + naiveProgPerPom*adjustedPercent;

       const weightedPomsLeft = Math.max(0, Math.round((goal-progToDate)/metaWeighted));
       return {
         weightedProgPerPom: metaWeighted,
         weightedPomsLeft,
       };
    }

    function getSplitTasks(data) {
      const splitTasks = [];
      data.tasks && data.tasks.forEach((task, i, a) => {
        const duration = +task.duration;
        if (duration === 1) return splitTasks.push({ task, progress: task.progress });
        const lastProg = !i ? 0 :  a[i-1].progress;
        const progDelta = task.progress-lastProg;
        Array(duration).fill().forEach((_, j) => {
          const pomProg = lastProg+Math.round(progDelta/duration*(j+1));
          splitTasks.push({ task, progress: pomProg });
        });
      });
      const naiveProgPerPom = splitTasks[splitTasks.length-1].progress/splitTasks.length;
      return splitTasks;
    }


    function getSlopes(splitTasks) {
        return splitTasks.map((n, i, a) => {
            return !i ? n.progress : n.progress - a[i-1].progress;
        });
    }

    function deltify(progs) {
        const deltas = progs.map((n, i, a) => {
            const next = a[i+1];
            if (next === undefined) return null;
            return next - n;
        });
        deltas.pop();
        return deltas;
    }
  }


}

export default { PARSLEY_DEFAULTS, buildParsleyData };
