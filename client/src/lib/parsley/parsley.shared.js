/*
  NOTE 2021: the following have been extracted to the module level in order to
  export parseTask and parseCommentStartHour, for the mergeScratch worker.

  More of the functions inside of buildParsleyData() could be moved as well,
  but only using these for now.
*/

//TODO: This might be more useful as an actual number.
//(The only reason it's like this was for the filter browser.)
//TODO: start using utils.weekNum?
export function weekNum(day) {
  var bracket = Math.floor((day-1)/7);
  // p(day + " is Week " + (bracket+1));
  return bracket < 4 ? "Week " + (bracket+1) :"Week Burst";
}

export function monthName(index) {
  return "January February March April May June July August September October November December".split(' ')[index];
}

export function parseCommentStartHour(line) {
  return +line.replace('#', '').split(':')[0].trim();
}

export function parseTask(line, index, _currentDate, _parsley) {
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
    var definedTags = Object.keys(_parsley.tags).join('');
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
      _parsley.media[item] = _parsley.media[item] || {}
      if (goal) { _parsley.media[item]["goal"] = goal }
      media = item;
      // VITARKA: Add progUnit here, I guess; yeesh!
      _parsley.media[item].progUnit = progUnit;
      _parsley.media[item].title = item; // Hmm... the abbrevs aren't *actually* titles, but leaving for now
      progress = parseInt(value);
      //TODO: remove rocket and value, but preserve description
      return text;
    }
    return text;
  }
}