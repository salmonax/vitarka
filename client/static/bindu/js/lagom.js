// Vitarka: Found some quicky query string thing that isn't great
// Doing this quickly and plan on rewriting, so don't
// want to have to pass this down the terrible render chain
window.qp = {
  set: (opt) => {
    window.history.replaceState({}, '',
      window.location.href.split('?')[0]
      + '?'
      + window.Qs.stringify(opt),
    );
  },
  get: () => window.Qs.parse(window.location.href.split('?')[1]),
  isEmpty() {
    return !Object.keys(this.get()).length
  },
};


// Vitarka: wrapped this to make clearer that it inits everything
// (was originally top-level)
// Note: this will get called by the component when the pomsheet is loaded
//  so no need to invoke it here.
function startBindu(parsleyData, sunrisePromise) {
  if (window.$view) {
    window.$view.clearIntervals();
  }
  // Vitarka: Using on re-renders as well, so always clear
  // the element. Kind of a kludge, but better
  // than leaving in the component
  window.$('#calendar').empty();

  // Not sure if these were closured anywhere, so attaching
  // to window to preserve prior behavior
  window.lastYear = '';
  window.thisYear = '';// $.get('/2017');
  window.journalRaw = '';//$.get('/journal');

  //TODO: get view rendered BEFORE getting the data
  // $.when(lastYear,thisYear,journalRaw).done(function (lastYear, thisYear,journalRaw, parsleyData) {
  var model = initModel(lastYear,thisYear,journalRaw, parsleyData),
      view = calendarView.init(model, sunrisePromise);
  calendarController.init("#calendar", view);
  window.$view = view
    // }
  // );
}


/**
 * Rework this, like this:
 *  1. lastYear/thisYear doesn't do anything anymore, neither does journal. Delete.
 *  2. Somehow make it possible to load ALL the pomsheets, even the SUPER old ones.
 */
function initModel(lastYear,thisYear,journalRaw, parsleyData) {
  // var pomsheet = lastYear[0] + "\n" + thisYear[0];

  // var pomsheetLines = pomsheet.split(/\n/),
      journalLines = journalRaw[0] ? journalRaw[0].split("\n") : [];

  var parsley = parsleyData;//buildParsleyData(pomsheetLines);

      // DANGER, DANGER: this "works", but calendarView is using
      // journal.
      journal = buildJournal(journalLines);

  return {
    parsley: parsley,
    journal: journal
  }
}

//This was initAlmostEverything()
//Filters need to be rejiggered, so leaving it as-is for now.
function initModelWithFilters(lastYear,thisYear,journalRaw) {
  var data = lastYear[0] + "\n" + thisYear[0];
// $.get("/2015",function (data) {
  //parsley = new Parsley(pomsheet);
  //parsleyColors is... iffy. Not sure where to put it yet:
  var parsley = buildData(data);

  //next two lines are left out of initModel()
  var filters = parsley.getStatsKeys(),
      selectionObject = {};

  var journalLines = journalRaw[0].split("\n"),
      journal = buildJournal(journalLines);

  calendarView.init(parsley,journal);

  //TODO: these are for the old pomsheet + filter browser view
  loadPomsheet(data);
  renderFilters();

  //TODO: parentFilter selection preserves child selections
  $(".filter").mouseup(function() {
    var selection = [],
        key = this.id.replace('-filter',''),
        parentFilters = filters.slice(0,filters.indexOf(key)+1);

    $('#'+this.id).children('option:selected').each(function() {
      /* Removes pom-count in parens after item text. */
      var itemText = $(this).text().replace(/\s\(\d+\)$/,'');
      selection.push(itemText);
    });


    clearSelectionObject(parentFilters);
    selectionObject[key] = selection;

    //TODO: make filtered return a parsley object, get rid of updateStats()
    var filtered = filterParsleyBySelectionObject();
    var stats = parsley.createFilteredStats(filtered);
    // p(stats);

    // var filtered = filterParsleyBy(key,selection);
    // linesFromFiltered(filtered);

    // r(parentFilters);
    // p(selectionObject);

    // filterParlseyBySelectionObject();

    clearFilters(parentFilters);
    populateFilters(filtered,parentFilters,stats);

  });


  function clearSelectionObject (exclusions) {
    filters.forEach(function (title) {
      if (exclusions.indexOf(title) == -1) {
        delete(selectionObject[title]);
      }
    });
  }

  function linesFromFiltered(filtered) {
    r();
    filtered.forEach( function(task,index) {
      p(parsley.lines[task.index]);
    });
  }

  function filterParsleyBySelectionObject() {
    var filtered = parsley.tasks.filter(function(task) {
      var conditionChecks = [];
      var selectAll;
      for (var key in selectionObject) {
        selectAll = false;
        selectionObject[key].forEach(function(item) {
          if (/^All \(\d+ items\)$/.test(item)) { selectAll = true; }
        });
        conditionChecks.push(selectAll || selectionObject[key].indexOf(task[key]) != -1)
      }
      // p(conditionChecks.indexOf(false) == -1);
      return conditionChecks.indexOf(false) == -1;
    });
    return filtered;
  }
  function filterParsleyBy(key,matches) {
    // p(key);
    // p(matches);
    var selectAll = false;
    matches.forEach(function(item) {
      if (/^All \(\d+ items\)$/.test(item)) { selectAll = true; }
    });

    var filtered = parsley.tasks.filter(function(task) {
      return selectAll || matches.indexOf(task[key]) != -1;
    });
    // p(filtered);
    return filtered;
  }

  function loadPomsheet(data) {
    $("#pomsheet").text(data);
  }
  function buildData(data) {
    var lines = data.split(/\n/);
    return buildParsleyData(lines);
  }

  function clearFilters(exclusions) {
    filters.forEach(function (title) {
      if (exclusions.indexOf(title) == -1) {
        $('#'+title+"-filter option").remove()
      }
    });
    // $(".filter option").remove();
  }
  function renderFilters(filtered) {
    var container = $("#filter-container");
    var width = 100.0/filters.length;

    filters.forEach(function (title) {
      container
        .append('<div class="filter-box"><div class="filter-caption">&nbsp&nbsp'+title+'</div><select id="'+title+'-filter" class="filter" name="'+title+'"" size="2" multiple></select></div>');
      populateFilter(title);
    });

    // filters.forEach(function (title) {
    //   $(".filter").append('<option value="'+title+'">'+title+'</option>')
    // });
    $(".filter")
      .css({
        width: "100%",
        borderStyle: "none",
        color: "white",
        background: "rgb(100,100,100)",
        height: "100%"
      });
    $(".filter-box")
      .css({
        display: "flex",
        flexFlow: "column",
        boxSizing: "border-box",
        height: "100%",
        background: "rgb(100,50,50)",
        width: width+"%",
        float: "left"
      });
  }
  function populateFilters(filtered,exclusions,stats) {
    filters.forEach(function (title) {
      // p(exclusions);
      // p(title +":"+ exclusions.indexOf(title));
      if (exclusions.indexOf(title) == -1) {
        populateFilter(title,filtered,stats);
      }
    });
  }
  function populateFilter(title,filtered,stats) {
    var stats = stats || parsley.stats;
    var uniques = parsley.getUnique(title,filtered).sort();
    var currentFilter = $('#'+title+'-filter');
    currentFilter.append('<option>All ('+uniques.length+' items)</option>');

    uniques.forEach(function(option) {
      //the following requires stats removal for on-click look up
      currentFilter.append('<option>'+option+' ('+stats[title][option]+')</option>');
    });
  }
}




