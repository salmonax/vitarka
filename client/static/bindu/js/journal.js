const JOURNAL_DEFAULTS = {
  dayStartHour: 9,
};

//ToDo: put weekday-related crap into helper functions
function buildJournal(lines) { 
  var journal = { 
    entries: [], 
    dosages: [],
    dayStartHour: function(date) {
      var today = getDosage(date);
      return today.length > 0 ? today[0].startHour : JOURNAL_DEFAULTS.dayStartHour;
    },
    dayDosageItems: function(date) { 
      //TODO: replace calling this 7 times from renderWeek() with parsley-style filter
      var today = getDosage(date);
      return today.length > 0 ? today[0].items : [];
    }
  };
  function getDosage(date) {
    var dateOnly = new Date(date.getTime())
    dateOnly.setHours(0,0,0,0)
    return journal.dosages.filter( function(dosage) {
      return dosage.date.getTime() == dateOnly.getTime();
    });
  }
  var currentDate,
      currentYear,
      inDosage = false,
      currentDosages;
  lines.forEach(function(line,i) {
    line = line.trim();
    // if (i > 300) { return }
    if (isDateLine(line)) {
      currentDate = line;
      // journal.entries.push({ date: line })
    } else if (isDosageHeading(line) && currentDate) {
      if (line.split('(')[0].trim() == "Start") {
        currentDosages = { items: [] };
        // p('--- START DOSAGE DAY ---');
        // p(currentDate);
        inDosage = true;

        var startHour = line.split('(')[1].split('-')[0],
            pm = (startHour.indexOf('pm') == -1 || startHour.indexOf('12pm') != -1) ? 0 : 12;
        pm = (startHour.indexOf('12am') == -1) ? pm : -12;
        startHour = parseInt(startHour)+pm;

        var dateString = currentDate.split(/,\s?/);
        var timeString;
        /* Create new Date from date string */
        if (dateString.length > 3) {
          dateString = dateString.slice(0,3).join(', ')
        } else {
          if (!currentYear) { currentYear = new Date().getFullYear().toString() }
          dateString = dateString.slice(0,2).join(', ')+', '+currentYear;
        }
        var currentDosageDate = new Date(Date.parse(dateString));
        currentYear = currentDosageDate.getFullYear();
        /* Extract weekday hint from previous lines */
        var prevLine = (lines[i-3] +' '+ lines[i-2]).replace(/[\n:]/,'');
        var dayHint = /(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)/.exec(prevLine);
        dayHint = dayHint ? dayHint[0] : null;
        // p(dayHint);
        // p(currentYear);
        /* Fix dosage date according to weekday hint */
        var fixedDay = dayNum(dayHint);
        var oldDay = currentDosageDate.getDay();
        if (fixedDay != null && fixedDay != oldDay) {
          var diff = dayDiff(fixedDay,oldDay);
          currentDosageDate.setDate(currentDosageDate.getDate()-diff);
        }
        currentDosages.date = currentDosageDate;
        currentDosages.startHour = startHour;
        // p(currentDosageDate);
      } else {
      //pushes a dashed line for period separation
      //just temporary, so that info isn't lost in view
        currentDosages && currentDosages.items.push('---');
      }
    } else if (inDosage) {
      if (line.length > 0) {
        currentDosages.items.push(line.replace('*',''));
      } else {
        inDosage = false;
        // p(currentDosages)
        journal.dosages.push(currentDosages);
        // p("---- END DOSAGE DAY ---");
      }
    }
  })
  // p(journal.dosages.map(function(dosage) { return dosage.date; }));
  return journal;
  //this is purely a hack and for my own use. WOOT!
  function isDosageHeading(line) {
    return /^\*?(Start|Middle|End)\s?\(.*(am|pm)-.*(am|pm)\)/.test(line);
  }
  //TODO:move to utils.dayNum?
  function dayNum(name) {
    var num = "Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(' ').indexOf(name);
    return num != -1 ? num : null;
  }
  function dayDiff(fixed,old) {
    var diff = old-fixed
    return diff >= 0 ? diff : diff+7;
  }

  function isDateLine(line) {
    return /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{1,2}/.test(line);
  }
}