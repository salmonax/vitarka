/*
  This file is a million years old and should definitely be
  rewritten. The problem is that it "Just Works" as-is, even though
  it sucks. Guess we'll see how much it drags me down for my present
  purposes.
 */

/* UPDATE 2021:
  Still not rewriting it, but starting to break it apart. mergeScratch
  now lives in its own file. The output of buildParsleyData just isn't
  serializable, so I'm hoping that mergeScratch can at least be punted
  to a worker process.
*/
import mergeScratch from './mergeScratch'; // will be re-exported.
import mergeScratchAsync from './mergeScratch.spawn';
import { monthName, parseCommentStartHour, parseTask } from './parsley.shared';

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
    lastUTC: null,
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
      // The latest use case was the book burn-down chart, but it isn't event used there.
      // It may be deprecated for parsley.lastUTC.
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
      var task = parseTask(line, i, currentDate, parsley);
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
    .sort((a, b) => dateBucket[a].utc - dateBucket[b].utc) // WARNING: this wasn't working before!
    .forEach((date, i, dates) => {
      /*
        Doing two things here:
          1. First, handle startHours inference
          2. Second, populate dateBucket prev/next info.
      */
      // 1. BEGIN startHours business
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
          nearestPreviousTime = parsley.startHours[dates[--counter]]
        }
        // Only runs if NO existing time!
        if (timeFromTasks !== undefined && nearestPreviousTime !== undefined) {
          parsley.startHours[date] = Math.min(nearestPreviousTime, timeFromTasks);
        } else {
          parsley.startHours[date] = timeFromTasks || nearestPreviousTime;
        }
      }

      // 2. BEGIN dateBucket business
      //
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
      if (!dates[i+1]) {
        parsley.lastUTC = dateBucket[date].utc;
      }
      return Object.assign(dateBucket[date], {
        next: dateBucket[dates[i+1]],
        prev: dateBucket[dates[i-1]],
      });
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

export default { PARSLEY_DEFAULTS, buildParsleyData, mergeScratch, mergeScratchAsync };
