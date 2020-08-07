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

function buildParsleyData(linesOrFile) {
  var lines = Array.isArray(linesOrFile) ? linesOrFile : linesOrFile.split(/\n/);
  var currentDate;
  var parsley = {
    lines: lines,
    tasks: [],
    tags: {},
    stats: {},
    targets: {},
    media: {},
    startHours: { },
    DEFAULTS: PARSLEY_DEFAULTS,

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
    latestStartHour: function() {
      return this.startHours[this.getNearestDayWithStartHour(Date.now(), true)] ||
        parsley.DEFAULTS.dayStartHour;
    },
    startHour: function(adjustedUTC) {
      return parsley.startHours[(new Date(adjustedUTC).toLocaleDateString())] ||
        // Vitarka: this needs to be clamped to not be buggy, but uncomment to 
        // always get the startHour from the previous date
        // parsley.startHours[parsley.getNearestDayWithStartHour(adjustedUTC)] ||
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
    }

  };

  var statsKeys = "year month week tag category subcategory media".split(' ');
  statsKeys.forEach(function(key) { parsley.stats[key] = {} });
  //NOTE: currently assumes tag definitions are at the top of file!
  //would be better to capture all tag defs FIRST, then re-iterate

  // var eof = 150;
  var eof = lines.length;
  for (var i = 0; i < eof; i++) {
    // Added trim much later, be wary of any weirdness
    var line = lines[i].replace(/\r?\n|\r/g,'').trim();
  
    if (isCommentStartHour(line)) {
      var startHour = +line.substr(1).trim().split(':')[0];
      if (currentDate && !isNaN(startHour)) {
        parsley.startHours[currentDate] = startHour;
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
      currentDate = line;
    } else if (isTask(line)) {
      var task = parseTask(line,i);
      parsley.tasks.push(task);
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
  for (let title in parsley.media) {
    // TODO: make this properly handle media re-starts
    // This sort will make dates be out of order on such items
    parsley.media[title].tasks.sort((a, b) => a.progress - b.progress);
  }

  return parsley;

  function updateStats(task) {
    statsKeys.forEach(function (key) {
      var value = task[key];
      //parseInt() here avoids watch func... still just a kludge
      parsley.stats[key][value] = parseInt(parsley.stats[key][value]) || 0;
      parsley.stats[key][value] += parseInt(task.duration);
    });
  }

  function parseTask(line,index) {
    var date,
        time,
        tag,
        category,
        subcategory,
        description,
        duration,
        //NOTE: might cause problem with filters
        media =  null,
        progress = null;

    var split = line.split(/\s+|\t+/);
    time = split[0];
    duration = split[split.length-1].replace(/[^Xx]/g,'').length;

    tag = checkTag(split[1]);
    var middle = split.slice((tag?2:1),split.length-1).join(' ').split(':');
    tag = tag || "None";
    //TODO: uh oh... it's splitting the date for every task?!
    var splitDate = currentDate.split('/'),
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
      date: currentDate,
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
      progress: progress
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
        } else if (pages) {
          goal = +pages;
        }
        parsley.media[item] = parsley.media[item] || {}
        if (goal) { parsley.media[item]["goal"] = goal }
        media = item;
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
}

export default { PARSLEY_DEFAULTS, buildParsleyData };
