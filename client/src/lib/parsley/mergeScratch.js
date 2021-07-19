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
export default function mergeScratch(sheet, _parsley) {
  // These constants are currently used in typeRegistry.task.convert
  // for splitting overlong lines. We're collecting them here
  // for visibility.
  let startMerge = Date.now();
  console.error('######## MERGING SCRATCH')
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
            '(' + Object.keys(_parsley.stats.category)
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

  console.error('@@@@ DONE!', Date.now()-startMerge);
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
    return {
      convertedScratchLines: convertedLines,
      updatedScratch: scratchLines.join(''),
    };
  }
}