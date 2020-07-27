/* FIRST BATCH:
1. Move all time-related utility functions OUT of renderCalendar().
    arcOf(), weekOf(), dayNameShort(), monthNameShort(), etc. etc.
2. Move filterToWeek and createFilteredStats() into parsley, where they 
    belong
3. Turn renderCalendar() into the "init" portion of the calendarView
4. Make renderTimebar(), renderWeek(), renderFilters() public, so that
    calendarController() can call them.
*/

/* SECOND BATCH:

1. Get all event definitions moved into calendarController(), rejiggering things as needed
2. 


*/


window.route = function route(loc) {
  window.dispatchEvent(new CustomEvent('en-route', { 
    detail: { 
      newLocation: loc 
    } 
  }))
  this.history.pushState(null, null, '/#' + loc)
}

window.addEventListener('en-route', e => {
  console.log(e.detail.newLocation)
})


var calendarView = function() {  
  return {
    init: function(model) { 
      return renderCalendar(model.parsley,model.journal);
    }
  }

  //TODO: clean this WAY up
  //For now, it returns renderWeek() and renderTimebar()
  //for the view interface to be used by calendarController()

  function renderCalendar(parsley,journal,startDate) {
    //TODO: make sure renderWeek uses hoursOffset to determine what "today" is!!
    //TODO: generateParlsyeColors is STILL iffy... figure out where to put it
    var mode = "Box";
    var calendar = {};
    calendar.nowLineInterval;

    var dayName = utils.dayName
        dayNameShort = utils.dayNameShort,
        monthNameShort = utils.monthNameShort;
        weekNum = utils.weekNum;

    //TODO: this.... belongs in renderWeek()
    //The reason it's here is.. button needs access to closured startDate
    function getAdjustedOffset() {
      //TODO: get daysInMonth out of here! this is to squash a task rendering bug 
      //      when daysInMonth is scoped from renderCalendar()!
      var daysInMonth = new Date(startDate.getFullYear(),startDate.getMonth()+1,0).getDate();
      var currentDate = new Date(startDate.getTime()),
          startDay = startDate.getDate(),
          startHours = [],
          startHour,
          currentDay,
          minOffset
      for (var i = 0; i < 7; i++) {
        currentDay = startDay+i;
        currentDate.setDate(currentDay);
        startHour = journal.dayStartHour(currentDate);
        //Warning: magic closure var. Might as well start marking them.
        if (typeof startHour == 'number' && currentDay <= daysInMonth) {
          startHours.push(startHour);
        }
      }
      startHours = startHours.length ? startHours : [0];
      return Math.min.apply(Math,startHours);
    }

    function generateParsleyColors(parsley,property) { 
      var colors = {}
      var stats = Object.keys(parsley.stats[property]);
      var seed;

      stats.forEach( function(stat) { 
        // sums the ascii values of each character in the stat to use as seed
        var charSum = stat.split('').reduce( function(sum,item,i) { return sum + item.charCodeAt()*i+2 },0);
        seed = charSum;

        var color = {
          r: parseInt(seededRandom()*100+50),
          g: parseInt(seededRandom()*100+50),
          b: parseInt(seededRandom()*100+100)
        }
        var colorString = "rgb("+color.r+','+color.g+','+color.b+")";

        colors[stat] = colorString;

        // $("#output").append('<div style="background:'+colorString+'">'+stat+' '+colorString+' '+charSum+'</div>');
      });
      return colors;

      function seededRandom() {
        var x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      }

    }

    var parsleyColors = {};
    parsleyColors["category"] = generateParsleyColors(parsley,"category");
    parsleyColors["subcategory"] = generateParsleyColors(parsley,"subcategory");

    var currentDate = new Date();
    //used in renderWeek for Uptime
    var latestStartDate = currentDate;

    var todayStartHour = journal.dayStartHour(currentDate);
    var hoursInPomDay = 15;
    var hoursInPeriod = hoursInPomDay/3;

    //Quicky currentDate() debug:
    // currentDate.setMonth(10);
    // currentDate.setDate(29);
    // currentDate.setYear(2015);

    // var $calendar = $("#pomsheet");
    $("#calendar").append(div("cal-heading",true));
    var labels = "weeklies monthlies timebar treemap".split(' ');
    // $calendar.append(div("cal-heading",true));
    $("#cal-heading").append(div(labels,false,"label"));
    $("#cal-heading").append(div("task-details",true));
    $("#calendar").append(div("cal-nav",true))
    $("#calendar").append(div("cal-body",true));

    // div("previous");
    // var hoursOffset = 12;
    var hoursOffset = 6;
    offsetCurrentDate = new Date(currentDate.getTime());
    offsetCurrentDate.setHours(offsetCurrentDate.getHours()-hoursOffset);

    var today = {}
    today.getTotal = function() {
      return parsley.dayTotal(currentDate,hoursOffset);
    };
    today.getTarget = function() { return parsley.dayTarget(currentDate); };
    today.getLeft = function() {
      return Math.max(today.getTarget()-today.getTotal(),0);
    };
    today.getPeriodPoms = function() {
      return [0,0,0];
    };


    var startDate = startDate || weekOf(offsetCurrentDate);

    // var startDate = startDate || weekOf(currentDate);

    var benchStart, benchEnd, benchElapsed;
    //EXTRACT INTO OPTIONS:

    benchStart = new Date().getTime();
    // renderWeek(startDate,hoursOffset);
     
    /// DRY this up to renderByRoute or something
    var actionMap = {
      weeklies: renderWeek.bind(null, startDate, hoursOffset, mode),
      monthlies: renderMonth.bind(null, startDate, hoursOffset),
      timebar: renderTimebar.bind(null, arcOf(startDate))
    };
    console.log(actionMap[window.location.hash.substr(1)]);
    (actionMap[window.location.hash.substr(1)] || actionMap['weeklies'])()  


    // renderMonth(startDate,hoursOffset);
    // renderTimebar(arcOf(startDate),false,"media");

    benchEnd = new Date().getTime();
    benchElapsed = benchEnd-benchStart;
    // p(benchElapsed);

    // $("#cal-heading .label").on("touch click",function() {

    // });
    //NOTE: this startDate is from renderCalendar()!
    //NOTE: mode is also from renderCalendar!
    //TODO: maybe make these not depend on *setting* startDate?
    return {
      showTaskStatus: function() {
        // r("ON!");
      },
      hideTaskStatus: function() {
        // r("OFF!");
      },
      setMonth: function(index) {
        // var newDate = new Date(startDate.getTime()); 
        startDate.setMonth(index);
        renderWeek(startDate,hoursOffset,mode);
      },
      setWeek: function(index) {
        var newWeekStart = (index)*7+1;
        startDate.setDate(newWeekStart);
        renderWeek(startDate,hoursOffset,mode);

      },
      setYear: function(index) {
        var year = parsley.getUnique("year").sort();
        startDate.setYear(year[index]);
        renderWeek(startDate,hoursOffset,mode);
      },
      setOption: function(index) { 
        //Ugh...
        mode = ["Box","Report"][index];
        renderWeek(startDate,hoursOffset,mode);
      },
      doLabelAction: function(label) {
        benchStart = new Date().getTime();
        var action = {
          weeklies: function() {
            route('weeklies')
            renderWeek(startDate,hoursOffset);
          },
          monthlies: function() {
            route('monthlies')
            renderMonth(startDate,hoursOffset);
          },
          timebar: function() {
            route('timebar')
            renderTimebar(arcOf(startDate));
          },
          treemap: function() {
            renderTreemap();
          },
          next: function() {
            var page = window.location.hash.substr(1)
            var currentMonth = startDate.getMonth();
            if (page === 'monthlies') {
              startDate.setMonth(startDate.getMonth()+1)
            } else {
              startDate.setDate(startDate.getDate()+7);
              if (startDate.getMonth() != currentMonth) {
                startDate.setDate(1);
              }
            }
            var actionMap = {
              weeklies: renderWeek.bind(null, startDate, hoursOffset, mode),
              monthlies: renderMonth.bind(null, startDate, hoursOffset),
            };
            (actionMap[page] || actionMap['weeklies'])()
          },
          previous: function() {
            var page = window.location.hash.substr(1)
            var currentMonth = startDate.getMonth();
            if (page === 'monthlies') {
              startDate.setMonth(startDate.getMonth()-1)
            } else {
              var dateDiff = startDate.getDate()-7;
              startDate.setDate(dateDiff);
              //sets date to 29th if there is month bleed
              //later, there will be a setting for this.
              if (dateDiff < 0) { 
                startDate.setDate(29); 
                //fixes feb
                if (startDate.getDate() == 1) {
                  startDate.setMonth(1);
                  startDate.setDate(22);
                }
              }
            }
            var actionMap = {
              weeklies: renderWeek.bind(null, startDate, hoursOffset, mode),
              monthlies: renderMonth.bind(null, startDate, hoursOffset),
            };
            (actionMap[page] || actionMap['weeklies'])()

          },
          today: function() {
            currentDate = new Date();
            startDate = weekOf(currentDate);
            var actionMap = {
              weeklies: renderWeek.bind(null, startDate, hoursOffset, mode),
              monthlies: renderMonth.bind(null, startDate, hoursOffset),
            };
            (actionMap[window.location.hash.substr(1)] || actionMap['weeklies'])()
          },
          '+': function() {
            hoursOffset += 1;
            //TODO: please fix +24 and -0 offsets. DONE?
            hoursOffset = Math.min(hoursOffset,23);
            renderWeek(startDate,hoursOffset,mode);
            // r(hoursOffset);
          },
          '-': function() {
            hoursOffset -= 1;
            hoursOffset = Math.max(hoursOffset,0);
            renderWeek(startDate,hoursOffset,mode);
      
            // r(hoursOffset);
          },
          R: function() {
            hoursOffset = getAdjustedOffset();
            renderWeek(startDate,hoursOffset,mode,true);
          }
        };
        action[label]();
        benchEnd = new Date().getTime();
        benchElapsed = benchEnd-benchStart;
        // r(benchElapsed);
      }



    }

    function arcOf(date) {
      var copiedDate = new Date(date.getTime());
      var month = copiedDate.getMonth();
      copiedDate.setDate(1);
      copiedDate.setMonth(Math.floor(month/4)*4);
      copiedDate.setHours(0,0,0,0);
      return copiedDate;
    }

    function weekOf(date) {
      var day = date.getDate();
      var startDay = 7*Math.floor((day-1)/7)+1;
      var copiedDate = new Date(date.getTime());
      copiedDate.setDate(startDay);
      copiedDate.setHours(0,0,0,0);
      return copiedDate;
    }

    function div(labelArray,noTitle,className) {
      var html = '';
      if (!(labelArray instanceof Array)) {
        labelArray = [labelArray];
      }
      labelArray.forEach(function(id) {
        html = html + '<div' + (className ? ' class="'+className+'"':'') +' id="'+id+'">'+(noTitle ? '' : id)+'</div>';
      });
      return html;
    }

    function renderTimebar(startDate,fullYear,propToShow) {
      fullYear = fullYear || false;
      propToShow = propToShow || "category";
      // p(startDate);
      benchStart = new Date().getTime();
      $("#cal-body").empty();
      // $("#cal-nav").empty();
      $("#cal-nav *").unbind();
      var epicNav = $("#mini-epic-nav"),
          yearNav = $("#mini-year-nav"),
          monthNav = $("#mini-month-nav");
      yearNav.empty();
      monthNav.empty();
      epicNav.empty();
      $("#mini-option-nav").remove();

      var arcs = "Jan-Apr May-Aug Sep-Dec Full&nbspYear".split(' ');
      var monthsInArc = 4;
      var monthsToShow = fullYear ? 12 : monthsInArc;

      //Generate colors for property if they don't exist
      //Otherwise, use cached
      parsleyColors[propToShow] = parsleyColors[propToShow] || generateParsleyColors(parsley,propToShow);

      parsley.getUnique("year").sort().forEach(function(year) { 
        epicNav.append('<div class="mini-year">'+year+'</div>')
      });
      for (var i in arcs) {
        yearNav.append("<div class='mini-month'>"+arcs[i]+"</div>");
      }
      var items = "Categories Subcategories Media Supps".split(' ');
      for (var i in items) { 
        monthNav.append("<div class ='mini-week'>"+items[i]+"</div>");
      }

      // var weekIndex = Math.floor((startDate.getDate()-1)/7)+1;
      // // p(weekIndex);
      // var monthIndex = startDate.getMonth()+1;

      //Please stop calling parsley.getUnique().sort() for this crap.
      var yearIndex = parsley.getUnique("year").sort().indexOf(startDate.getFullYear().toString())+1;

      var arcIndex = Math.floor(startDate.getMonth()/4)+1;
      var arcPos = (arcIndex-1)*monthsInArc;
      var propOptions = "category subcategory media".split(' ');

      // $("#mini-month-nav .mini-week:nth-child("+weekIndex+")").addClass("current");
      $("#mini-epic-nav .mini-year:nth-child("+yearIndex+")").addClass("current");
      $("#mini-year-nav .mini-month:nth-child("+(fullYear ? 4 : arcIndex)+")").addClass("current");
      $("#mini-month-nav .mini-week:nth-child("+(propOptions.indexOf(propToShow)+1)+")").addClass("current");

      $(".mini-month").on("touch click", function() {
        var index = $(".mini-month").index(this);
        var newDate = new Date(startDate.getTime());
        //calls renderTimebar for full year display
        if (index == 3) {
          newDate.setMonth(0);
          renderTimebar(newDate,true,propToShow);
        } else {
          newDate.setMonth(index*4);
          renderTimebar(newDate,false,propToShow);
        }      
      });
      $(".mini-year").on("touch click", function() { 
        var index = $(".mini-year").index(this);
        var newDate = new Date(startDate.getTime());
        var year = parsley.getUnique("year").sort();
        // p(year);
        // p(index);
        newDate.setYear(year[index]);
        renderTimebar(newDate,fullYear,propToShow);
      });
      //bleh, refactor this; not week in this view
      $(".mini-week").on("touch click", function() {
        var index = $(".mini-week").index(this);
        if (index == 3) {
          //do supp thing
        } else {
          renderTimebar(startDate,fullYear,propOptions[index]);
        }
      });

      var table = $("<table>").addClass('timebar');
      var row,catCol;
      var headingRow = "<td class='cat-width-setter' style='width:1px;white-space:nowrap;'>Categories</td><td style='width:2px'></td>"
      for (i = 0; i < monthsToShow; i++) {
        headingRow += "<td colspan=5>"+monthNameShort(i+arcPos)+"</td>";
      }

      // p(monthsInArc*5);
      // p(arcPos*5);

      table.append(headingRow);
      var tasks = fullYear ? filterToYear(startDate) : filterToArc(startDate),
          gridStats = buildGridStats(tasks),
          uniques = parsley.getUnique(propToShow,tasks);
          stats = parsley.createFilteredStats(tasks);
      // uniques = uniques.reverse();
      uniques = uniques.sort(function(a,b) {
        return Object.keys(gridStats[b]).length-Object.keys(gridStats[a]).length
        // return stats.category[b]-stats.category[a];
      });
      function d2h(d) {return d.toString(16);}

      var drawStart = fullYear ? 0 : arcPos*5,
          drawEnd = fullYear ? 60 : (arcPos+monthsInArc)*5;

      //TODO: this is for setting the Categories column width despite fixed column
      // It's slow. Try changing it.
      var maxPropWidth = 0;
      var measureEl = $("<span class='timebar' style='display:none'></span>");
      measureEl.appendTo("#cal-body");

      uniques.forEach(function(property,i) {
        // if (category != "Bindu") { return; }
        // if (!category) { p(i); }
        var dayCols ="<td></td>";
        var propColor = parsleyColors[propToShow][property];
        var displayNum;
        var propWidth;
        for (var i = drawStart; i < drawEnd; i++) {
          displayNum = parseInt((gridStats[property][i+1]/1).toFixed(0));
          // displayNum = '';
          dayCols += gridStats[property][i+1] ? "<td style='background:"+propColor+"'>"+displayNum+"</td>" : "<td>&nbsp&nbsp</td>";
          // dayCols += gridStats[property][i+1] ? "<td style='background:"+propColor+"'>" : "<td>";
          // dayCols += "&nbsp</td>";
        }
        row = $("<tr>");
        // var propString = property.replace(' ','&nbsp')+"&nbsp("+stats[propToShow][property]+"&nbspof&nbsp"+parsley.stats[propToShow][property]+")";
        var propString = property+" ("+stats[propToShow][property]+" of "+parsley.stats[propToShow][property]+")";
        // maxPropLength = Math.max(propString.length,maxPropLength);
        propWidth = measureEl.text(propString).width();
        maxPropWidth = Math.max(propWidth,maxPropWidth);
        propCol = $("<td style='background:"+propColor+"'>"+propString+"</td>");
        row = row.append(propCol).append(dayCols);

        // $("#cal-body").append("<div class=timebar-cat>"+property+"</div>");
        table.append(row);
      });
      $("#cal-body").append(table);
      $('.cat-width-setter').css({width:maxPropWidth});

      // r("Timebar time: " + benchElapsed);

      function buildGridStats(tasks) {
        var gridStats = {}
        tasks = tasks || parsley.tasks
        tasks.forEach(function(task) {
          // if (task.category != 'Bindu') { return; }
          var property = task[propToShow]
          gridStats[property] = gridStats[property] || {};
          var monthDay = task.baseDate.getDate();
          var month = task.baseDate.getMonth();
          var yearWeek = weekNum(monthDay)+5*month;
          // p(task.baseDate.toLocaleDateString());
          // p(yearWeek);
          gridStats[property][yearWeek] = gridStats[property][yearWeek] || 0;
          //TODO: investigate parsley's string property bullshit
          gridStats[property][yearWeek] += parseInt(task.duration);
          
          // p(task.baseDate.toLocaleDateString(),true);
          // p(" "+yearWeek);
        });
        // p(gridStats['Bindu']);
        return gridStats;
      }
      /* Assumes that startDate has already had arcOf() called on it */
      /* Corresponds to filterToWeek() in renderWeek() */
      //TODO: explore making filterToWeek also use baseDate?
      function filterToArc(startDate,tasks) {
        var arcStart = startDate.getTime(),
            arcEnd = new Date(arcStart),
            startMonth = startDate.getMonth();
        arcEnd.setMonth(startMonth+4);
    
        var tasks = tasks || parsley.tasks

        var filtered = tasks.filter(function(task) {
          var taskStart = task.baseDate.getTime();
          return taskStart >= arcStart && taskStart < arcEnd.getTime();
        });
        return filtered;
      }
      function filterToYear(startDate,tasks) {
        var targetYear = startDate.getFullYear();
        var tasks = tasks || parsley.tasks
        var filtered = tasks.filter(function(task) {
          var taskYear = task.baseDate.getFullYear();
          return targetYear == taskYear;
        })
        return filtered;
      }
    }

    function renderMonth(startDate) {
      console.log('tried it!')
      var i,
        $body = $("#cal-body"),
        $epicNav = $("#mini-epic-nav"),
        $yearNav = $("#mini-year-nav"),
        $monthNav = $("#mini-month-nav"),
        $row;

      $body.empty();
      $("#cal-nav *").unbind();
      $yearNav.empty();

      for (i = 0; i < 12; i++) {
        $yearNav.append('<div class="mini-month">'+monthNameShort(i)+'</div>');
      }
      $monthNav.remove();
      // epicNav.empty();
      $("#mini-option-nav").remove();

      var monthIndex = startDate.getMonth()+1;
      $("#mini-year-nav .mini-month:nth-child("+monthIndex+")").addClass("current");

      var $monthBody = $("<div id=monthlies-container></div>");
      $monthBody.appendTo($body);


      $row = $("<div class=monthlies-row></div>");
      for (j = 0; j < 7; j++) {
        $row.append("<div class='monthlies-day-heading'>"+utils.dayName(j+1)+"</div>");
      }
      $row.appendTo($monthBody);

      var daysInMonth = utils.daysInMonth(startDate);
      var pomsPerDay = parsley.dayTarget(startDate);

      var dayNum = 0;
      for (i = 0; i < 5; i++) {
        $row = $("<div class=monthlies-row></div>");
        $row.appendTo($monthBody);
        for (j = 1; j <= 7; j++) {
          dayNum += 1;
          if (dayNum <= daysInMonth) {
            $row.append('<div class="monthlies-day" data-day="'+dayNum+'""><div class="monthlies-day-label">'+dayNum+'</div></div>');
          } else {
            $row.append('<div class="monthlies-day-overflow"></div>');
          }
        }
      }

      var tasks = filterToMonth(startDate);
      var stats = parsley.createFilteredStats(tasks);
      var monthCats = Object.keys(stats.category);

      var dayHeight = parseInt($(".monthlies-day").css("height"));

      $(".monthlies-day").each(function(index,item) {
        var day = $(item).data('day');
        if (day) {
          renderDay($(item),day,tasks);
        }

      });

      function renderDay($dayBody,day,tasks) {
        //unpassed vars: dayHeight, hourseInPomDay, pomsPerDay
        var dayTasks = filterToDay(day,tasks);
        var dayStats = parsley.createFilteredStats(dayTasks);
        var dayCats = Object.keys(dayStats.category);
        // var hourPixels = parentHeight/(hoursInPomDay*7);
        var hourPixels = dayHeight/hoursInPomDay;
        var pomHoursPerPeriod = pomsPerDay/6;
        var i;

        dayCats.sort(function (a,b) {
          return dayStats.category[b] - dayStats.category[a];
        });
        dayCats.forEach(function(name) {
          var poms = dayStats.category[name];
          var divHeight = Math.round(poms/2*hourPixels);

          // var divHeight = 10;

          var totalsMinLabelHeight = 11;
          $dayBody.append("<div style='background:"+parsleyColors["category"][name]+";height:"+divHeight+"px' class='total-item'>"+(divHeight >= totalsMinLabelHeight ? name+" "+poms : '')+"</div>");
        });
        for (i = 1; i <= 4; i++) {
          addPeriodBar(pomHoursPerPeriod*i,i);
        }
        function addPeriodBar(hours, label) {
          var height = Math.round(hours*hourPixels);
          label = label || '';
          $dayBody.append("<div class=mini-periods-bar style='top:"+height+"px'>"+label+"</div>");
        }
      }


      monthCats.sort(function (a,b) {
        return stats.category[b] - stats.category[a];
      });

      var monthTotal = monthCats.reduce(function(sum,item) { 
        return sum + stats.category[item]; 
      },0);

      $monthTotals = $("<div id=month-totals></div>");
      $body.append($monthTotals);
      $monthTotals.append("<div class=day-heading>Totals</div><div id=totals-body></div><div class=day-footer>"+monthTotal+"</div>");

      // var whatever = tasks.map(function(obj) { return obj.baseDate.toLocaleString() });

      // p(whatever);

      var $totalsBody = $("#totals-body");
      //moved to renderCalendar():
      // var hoursInPomDay = 15;
      var parentHeight = parseInt($totalsBody.css("height"));

      var hourPixels = parentHeight/(hoursInPomDay*31);

      var totalsMinLabelHeight = 10;
      // // 1. Take care of basic case (ie. assume there are available divs)
      // // 2. Deal with case where there there is no space to redistribute

      monthCats.forEach(function(name) {
        var poms = stats.category[name];
        var divHeight = Math.round(poms/2*hourPixels);
        $totalsBody.append("<div style='background:"+parsleyColors["category"][name]+";height:"+divHeight+"px' class='total-item'>"+(divHeight >= totalsMinLabelHeight ? name+" "+poms : '')+"</div>");
      });



      var pomsPerDay = parsley.dayTarget(startDate);
      for (var i = 1; i <= 5; i++) {
        addTotalsBar(pomsPerDay*i/2*7,i+"w");
      }

      function addTotalsBar(hours,label) {
        var height = Math.round(hours*hourPixels);
        label = label || '';
        $totalsBody.append("<div class=totals-bar style='top:"+height+"px'>"+label+"</div>");
      }
      /* Uses task baseDate, which has hours zero'd out */
      function filterToMonth(startDate,tasks) {
        var copiedDate, 
            monthStartTime,
            monthEndTime;
        copiedDate = new Date(startDate.getTime());
        copiedDate.setDate(1);
        copiedDate.setHours(0,0,0,0);
        monthStartTime = copiedDate.getTime();
        copiedDate.setMonth(copiedDate.getMonth()+1);
        monthEndTime = copiedDate.getTime();

        var tasks = tasks || parsley.tasks;
        var filtered = tasks.filter(function(task) {
          var taskBaseTime = task.baseDate.getTime();
          return taskBaseTime >= monthStartTime && taskBaseTime < monthEndTime
        });
        return filtered;
      }
      /* Assumes all tasks are from the same month! */
      function filterToDay(day,tasks) {
        var filtered = tasks.filter(function(task) {
          var baseDateDay = task.baseDate.getDate();
          return day == baseDateDay;
        });
        return filtered;
      }

      // function filterToWeek(startDate,tasks) {
      //   var weekStart = startDate.getTime(),
      //       weekEnd = new Date(weekStart);
      //   //WARNING: using daysInMonth from WAY up top out of sheer laziness
      //   //NOTE: this eliminates Week 5 overdraw, but preserves day-bleed
      //   //Proprietary to renderWeek(), so shouldn't be in here.
      //   var endDate = Math.min(startDate.getDate()+7,daysInMonth+1);
      //   weekEnd.setDate(endDate);

      //   var tasks = tasks || parsley.tasks
      //   // p(tasks.length);

      //   var filtered = tasks.filter(function(task) {
      //     var taskStart = task.startDate.getTime();
      //     return taskStart >= weekStart && taskStart < weekEnd.getTime();
      //   });
      //   // p(filtered.length);
      //   // p(filtered);
      //   return filtered;
      // }

      // var arcs = "Jan-Apr May-Aug Sep-Dec Full&nbspYear".split(' ');
      // var monthsInArc = 4;
      // var monthsToShow = fullYear ? 12 : monthsInArc;
    }

    function renderTreemap() {
      // p("OH BOY!");
    }

    function renderWeek(startDate,hoursOffset,mode,autoAdjustOffset) {
      // p(getMinOffset());
      // p(hoursOffset);
      mode = mode || "Box";
      //TODO: stop this from changing renderCalendar's startDate!
      // Date behavior has gotten really convoluted since the refactor
      if (calendar.nowLineInterval) {
        clearInterval(calendar.nowLineInterval);
      }
      startDate.setHours(hoursOffset);

      var startMonthDay = startDate.getDate(),
          startDay = startDate.getDay(),
          daysInMonth = new Date(startDate.getFullYear(),startDate.getMonth()+1,0).getDate(),
          body = $("#cal-body"),
          nav = $("#cal-nav"),
          tasks = filterToWeek(startDate),
          stats = parsley.createFilteredStats(tasks);
      //TODO: find better way to keep the closured var updated with next-prev events
      // r(daysInMonth);
      // p(startDate);
      
      // p(daysInMonth);
      // if (autoAdjustOffset == true) { hoursOffset = getAdjustedOffset(); }


      body.empty();
      nav.empty();
      //TODO: ugh, please refactor all rendering!
      var navLabels = "- + R previous next today".split(' ');
      nav.append(div("nav-title",true));
      // nav.append('<div id="week-title">'+startDate.toLocaleDateString()+"</div>");
      nav.append(div("mini-epic-nav",true));
      nav.append(div("mini-year-nav",true));
      nav.append(div("mini-month-nav",true));
      nav.append(div("mini-option-nav",true));

      var epicNav = $("#mini-epic-nav"),
          yearNav = $("#mini-year-nav"),
          monthNav = $("#mini-month-nav");
          optionNav = $("#mini-option-nav");

      parsley.getUnique("year").sort().forEach(function(year) { 
        epicNav.append('<div class="mini-year">'+year+'</div>')
      });

      for (var i = 0; i < 12; i++) {
        yearNav.append('<div class="mini-month">'+monthNameShort(i)+'</div>');
      }
      for (var i = 0; i < 5; i++) {
        monthNav.append('<div class="mini-week">'+(i+1)+'</div>');
      }
      var navOptions = "Box Report".split(' ');
      for (var i in navOptions) { 
        optionNav.append('<div class="mini-option">'+navOptions[i]+'</div>');
      }


      var weekIndex = Math.floor((startDate.getDate()-1)/7)+1;
      // p(weekIndex);
      var monthIndex = startDate.getMonth()+1;

      //Please stop calling parsley.getUnique().sort() for this crap.
      var yearIndex = parsley.getUnique("year").sort().indexOf(startDate.getFullYear().toString())+1;

      $("#mini-year-nav .mini-month:nth-child("+monthIndex+")").addClass("current");
      $("#mini-month-nav .mini-week:nth-child("+weekIndex+")").addClass("current");
      $("#mini-epic-nav .mini-year:nth-child("+yearIndex+")").addClass("current");
      $("#mini-option-nav .mini-option:nth-child("+(navOptions.indexOf(mode)+1)+")").addClass("current");

      nav.append(div(navLabels,false,"nav-button"));


      var columnLabel, dayPos;
      if (mode == "Box") {
        for (var i = 0; i < 7; i++ ) {
          //this kills extra columns on week 5:
          // if (startMonthDay+i > daysInMonth) { break; }
          columnLabel = dayName((startDay+i)%7)+'&nbsp'+(startDate.getMonth()+1)+'/'+(startMonthDay+i); 
          body.append('<div class="week-column"><div class="day-heading">'+columnLabel+'</div><div class="day-tasks"></div></div>');
        }
      } else {
        for (var i = 0; i < 4; i++) {
          dayPos = i*2;
          columnLabel = (dayPos < 6) ?
            dayNameShort((startDay+dayPos)%7)+'-'+dayNameShort((startDay+dayPos+1)%7)+',&nbsp'+monthNameShort(startDate.getMonth())+'&nbsp'+(startMonthDay+dayPos)+'-'+(startMonthDay+dayPos+1) :
            dayNameShort((startDay+dayPos)%7)+',&nbsp'+monthNameShort(startDate.getMonth())+'&nbsp'+(startMonthDay+dayPos);

          body.append('<div class="block-column"><div class="day-heading">'+columnLabel+'</div><div class="block-report"></div></div>');
        }
      }

      var weekCats = Object.keys(stats.category);
      weekCats.sort(function (a,b) {
        return stats.category[b] - stats.category[a];
      });

      var weekTotal = weekCats.reduce(function(sum,item) { 
        return sum + stats.category[item]; 
      },0);

      body.append('<div id=week-totals></div>');
      $("#week-totals").append("<div class=day-heading>Totals</div><div id=totals-body></div><div class=day-footer>"+weekTotal+"</div>");
      
      var totalsBody = $("#totals-body");
      //moved to renderCalendar():
      // var hoursInPomDay = 15;
      var parentHeight = parseInt(totalsBody.css("height"));
      var hourPixels = parentHeight/(hoursInPomDay*7);

      //normally 12
      var totalsMinHeight = 0;
      //normally superfluous
      var totalsMinLabelHeight = 10;
      var minHeightAdjustment = 0;
      var heightMap = [];
      // 1. Take care of basic case (ie. assume there are available divs)
      // 2. Deal with case where there there is no space to redistribute

      weekCats.forEach(function(name) {
        var poms = stats.category[name];
        var divHeight = Math.round(poms/2*hourPixels);
        minHeightAdjustment += Math.max(totalsMinHeight-divHeight,0);
        // heightMap.push(divHeight);
        divHeight = Math.max(divHeight,totalsMinHeight);
        heightMap.push(divHeight);
      })
      var candidateDivs = true;
      // for (var z = 0; z < 3; z++) {
      while (minHeightAdjustment && candidateDivs) {
        candidateDivs = false;
        heightMap.forEach(function(height,index) {
          if (height <= totalsMinHeight+1 || !minHeightAdjustment) { return }
          candidateDivs = true;
          heightMap[index] -= 1;
          minHeightAdjustment -= 1;
        });
      }

      // var heightMapSum = heightMap.reduce(function(sum,item) { return sum += item });


      // p(heightMap);
      // p("heightMapSum: " + heightMapSum);
      // p("candidateDivs: " + candidateDivs);


      weekCats.forEach(function(name,i) {
        var poms = stats.category[name];
        totalsBody.append("<div style='background:"+parsleyColors["category"][name]+";height:"+heightMap[i]+"px' class='total-item'>"+(heightMap[i] >= totalsMinLabelHeight ? name+" "+poms : '')+"</div>");
      });
      // p("week total: " + Math.round(weekTotal/2*hourPixels));
      // p("adjustment total: " + minHeightAdjustment);
      // var singleAdjust = Math.floor(minHeightAdjustment/adjustedDivs);
      // var adjustRemainder = minHeightAdjustment%adjustedDivs;
      // p("adjusted divs: "+adjustedDivs);
      // p("total divs: " + weekCats.length);
      // p("single: "+singleAdjust);
      // p("remainder: "+adjustRemainder);
      // p('');

      // $(".total-item").each(function() {
      //   var prevHeight = parseInt($(this).css("height"));
        
      // })
      // addTotalsBar(16*7,"16 hpd");
      // addTotalsBar(15*7,"15 hpd");
      // addTotalsBar(24*7,"24 hpd");
      // addTotalsBar(9*7,"18 ppd");
      // p(weekTotal);
      // addTotalsBar(weekTotal/2);

      var pomsPerDay = parsley.dayTarget(startDate);
      for (var i = 1; i <= 7; i++) {
        addTotalsBar(pomsPerDay*i/2,i+"d");
      }



      function addTotalsBar(hours,label) {
        var height = Math.round(hours*hourPixels);
        label = label || '';
        totalsBody.append("<div class=totals-bar style='top:"+height+"px'>"+label+"</div>");
      }

      var columns = $(".day-tasks");
      for (var j = 0; j < 48; j++ ) {
          columns.append("<div class=day-row>"+(j%2 ? '&nbsp':j/2+hoursOffset)+"</div>");
      }

      //TODO: put weekSums in parsley
      var weekSums = {};
      // var weekSumsSubcat = {};
      tasks.sort(function (a,b) { 
        return a.startDate.getTime() - b.startDate.getTime();
      });

      //TODO: take hoursOffset into account when deciding block
      //TODO: fix bug where last week's block 3 show up this week
      if (mode == "Report") { printReport(); }
      function printReport() {
        var reports = [];
        tasks.forEach(function(task) {
          var baseDay = task.baseDate.getDate();
         //TODO: make this a general utility function
          var blockIndex = Math.floor(((baseDay-1)%7+2)/2)-1; 
          reports[blockIndex] = reports[blockIndex] || {};
          var report = reports[blockIndex];

          report[task.category] = report[task.category] || {}
          report[task.category][task.subcategory] = report[task.category][task.subcategory] || [];
          var capitalized = task.description.charAt(0).toUpperCase() + task.description.slice(1);
          report[task.category][task.subcategory].push(capitalized);
          //ToDo: maybe underline?
          // if (task.tag.indexOf("!") != -1) { report[task.category][task.subcategory].push("--!--"); }
        });     
        reports.forEach(function (report,index) {
          var column = $(".block-report:eq("+(index)+")");
          Object.keys(report).sort().forEach(function (key) {
            var color = parsleyColors["category"][key];
            // column.append("<span style='color:"+color+"'>"+key+"\n");
            Object.keys(report[key]).sort().forEach(function (subkey) {
              var subcolor = parsleyColors["subcategory"][subkey];
              column.append("<span style='color:"+color+"'>"+key+"</span> :: "+"<span style='color:"+subcolor+"'>"+subkey+"\n");
              for (i in report[key][subkey]) {
                column.append("      "+report[key][subkey][i]+"\n");
              }
            });
          });
        });
      }

      // bookTest();

      function bookTest() {
        var kindleBooks = parsley.tasks.filter(function (task) {
          return task.media && parsley.media[task.media] && parsley.media[task.media].goal
        });
        var kindleTotals = {};
        var kindleToday = {};
        var book, sitting;
        for (var i in kindleBooks) {
          book = kindleBooks[i];
          kindleTotals[book.media] = kindleTotals[book.media] || [];
          sitting = {};
          sitting.date = book.baseDate.getTime();
          sitting.progress = parseInt(book.progress);
          sitting.duration = parseInt(book.duration);
          kindleTotals[book.media].push(sitting);
          // p(kindleBooks[i].media);
          // p(parsley.media[kindleBooks[i].media].goal);
        }
        // p(kindleTotals);
        for (book in kindleTotals) {
          kindleTotals[book] = kindleTotals[book].sort(function(a,b) { return a.date - b.date; });
        }
        var pomTotal;
        for (book in kindleTotals) { 
          pomTotal = 0;
          kindleTotals[book].forEach(function(sitting) { 
            //TODO: please stop using strings as pom properties!
            pomTotal += sitting.duration;
            sitting.pomTotal = pomTotal;
          });
        }

        var lastRead,firstRead;
        sitting = {}
        for (book in kindleTotals) { 
          sitting.first = kindleTotals[book][0]
          sitting.last = kindleTotals[book][kindleTotals[book].length-1]
          lastRead = new Date(sitting.last.date ).toLocaleDateString();
          firstRead = new Date(sitting.first.date).toLocaleDateString();
          p(book);
          p("   Started: " + firstRead);
          p("   Last Read: " + lastRead);
          p("   Progress: " + sitting.last.progress + "%");
          p("   Percent Left: " + (100-sitting.last.progress) + "%");
          p("   Poms Total: " + sitting.last.pomTotal);
          p("   Progres Per Pom: " + (sitting.last.progress/sitting.last.pomTotal).toFixed(1) + "%");
        }
     }

      //TODO: rewrite ALL of this! This is AWFUL!
      tasks.forEach(function(task) { 
        var day = task.startDate.getDate()-startMonthDay;
        //quicky way to catch month-ends
        //necessary to fix after-midnight month-end blocks
        if (day < 0) { day += daysInMonth; }

        var startTime = task.startDate.getHours()+task.startDate.getMinutes()/60-hoursOffset;

        //Date difference booleanized on purpose; dayBleedOffset is 0 or 24.
        //Only bleeds into next day; 24+ pom tasks not accounted for.
        var dayBleedOffset = (task.endDate.getDate()-task.startDate.getDate() != 0)*24;
        var endTime = task.endDate.getHours()+task.endDate.getMinutes()/60-hoursOffset + dayBleedOffset;
        if (startTime < 0) {
          day -= 1;
          startTime += 24;
          endTime += 24;
          dayBleedOffset = 24;
        }
        //bottom clamps to 0
        var top = (startTime/24*100).toFixed(2),
            bottom = Math.max((100-(endTime)/24*100),0).toFixed(2);
        
        //parseInt here fixes "watch" bug...
        //...result of lack of hasOwnProperty check?
        weekSums[task.category] = parseInt(weekSums[task.category]) || 0;
        weekSums[task.category] += parseInt(task.duration);
        // weekSumsSubcat[task.subcategory] = weekSumsSubcat[task.subcategory] || 0;
        // weekSumsSubcat[task.subcategory] += parseInt(task.duration);

        drawTaskBox(day);

        if (endTime > 24 && day < 6) {
          top = 0.00;
          //if, in unlikely even of 48+ pomodoro task, clamps to 0.
          bottom = Math.max((100-(endTime-dayBleedOffset)/24*100),0).toFixed(2);
          drawTaskBox(day+1);
        }

        function drawTaskBox(day) {
          // p(weekSums[task.category]);
          // p(task.category +' '+weekSums[task.category]);
          var el = $('<div data-i="'+task.index+'" class="task" style="top:'+top+'%;bottom:'+bottom+'%;background:'+parsleyColors["category"][task.category]+'">'+task.category+' '+weekSums[task.category]+'</div>'),
              container = $(columns[day]),
              height = Math.floor((100-parseInt(bottom)-parseInt(top)-1)/2),
              style;
          el.appendTo(container);
          for (var i = 1; i < height; i++) {
            style = i%2 ? "style='background:white;opacity:0.09'":'';
            // style = "style='border: 1px dotted rgba(35,35,85,0.5);border-width: 1px 0 0 0'";
            el.append("<div "+style+">&nbsp</div>");
          }
          //This was for kludgy 50/50 cat-subcat display:
          // $(columns[day]).append('<div data-i="'+task.index+'" class="subtask" style="top:'+top+'%;bottom:'+bottom+'%;background:'+subcatColors[task.subcategory]+'">'+task.subcategory+' '+weekSumsSubcat[task.subcategory]+'</div>');
        }
      });
      var hoverTimeout = null;
      $(".task").on("mouseover", function() { 
        clearTimeout(hoverTimeout);
        var parsleyLine = parsley.lines[$(this).data('i')];
        $("#task-details").addClass("show-task");
        $("#task-details").text(parsleyLine);
      });
      $(".task").on("mouseout", function() {
        hoverTimeout = setTimeout(function () {
          $("#task-details").removeClass("show-task");
          // $("#task-details").text('')
          showDayStats();
        },1000);
      });


      function showDayStats() {
        //TODO: put this with time utility stuff
        function formatHour(hour) {
          return (hour%12||12)+(Math.floor(hour/12)%2?'pm':'am');
        }
        var time = new Date();
        if ($("#task-details").attr("class") != "show-task") {
          // p(latestStartDate);
          //WARNING: latestStartDate is closured and depends on being called after the calendar has been drawn!!
          console.log(time.toLocaleString())
          console.log(latestStartDate.toLocaleString())
          var hoursSinceStart = Math.floor((time.getTime()-latestStartDate.getTime())/(1000*60*60));
          // var hoursSinceStart = time.getHours()-todayStartHour;
          var currentPeriod = Math.floor(hoursSinceStart/hoursInPeriod)+1;
          var pomsLeft = today.getLeft();
          var pomsDone = today.getTotal();

          var periodTarget = Math.ceil(today.getTarget()/3);
          var cumulativeTarget = currentPeriod*periodTarget;
          var pomsLeftInPeriod = Math.max(cumulativeTarget-pomsDone,0);

          var currentPeriodEndHour = todayStartHour+currentPeriod*hoursInPeriod;
          var crunchBeginsHour = currentPeriodEndHour-pomsLeftInPeriod/2;

          // var crunchStatus = (crunchBeginsHour-time.getHours() <= 0) ? "NOW" : formatHour(crunchBeginsHour);

          //time.toLocaleTimeString() 
          var displayString = "Uptime: " + hoursSinceStart + ":" + time.getMinutes() + ":" + time.getSeconds() + "   Period: " + currentPeriod + "   " + 
            "Poms Left: " + pomsLeft + "   ";
            // "Periods: 0 / 0 / 0" + "   " + 
            
             // + "   " +
            // "Crunch: " + crunchStatus;
          $("#task-details").text(displayString);

        }
        updateNowBar(time);
      }
      //implemented this way to make sure it works correctly
      //with shifts, quickly. It's HORRIBLY inefficient.
      function updateNowBar(time) {
        // r(time.getMinutes()/60);
        // p(time.getHours());
        $(".week-column").each(function(index,item) {
          // p(index);
          var currentDay = new Date(startDate.getTime());
          var adjusted = new Date();
          adjusted.setHours(adjusted.getHours()-hoursOffset);
          currentDay.setDate(currentDay.getDate()+index);
          if (currentDay.toDateString() == adjusted.toDateString()) {
            var nowDecimal = time.getHours()+time.getMinutes()/60;
            // KLUDGE ALERT! this catches after midnight, last day of week
            //UPDATE: I have literally no clue when this might break after taking index == 6 out of the below conditional.
            if (adjusted.getDate() != time.getDate()) {
              index += 1;
            }
            $(".now-bar").remove();
            addNowBar(".day-tasks",index,nowDecimal-hoursOffset);
            return false;
          }
        });
      }

      function addNowBar(el,index,hours,label) {
        //99.84 ensures that line doesn't disappear at bottom:
        var height = (hours/24*99.84).toFixed(2)/1;
        label = label || '';
        //PRETTY sure this isn't needed, but just in case I end up wanting it...
        // var wrongDayStyle = (height > 100 || height < 0) ? ";border-color:orange" : '';
        if (height > 100) { 
          height -= 100; index += 1;
        } else if (height < 0) {
          height += 100; index -= 1;
        } 
        if (index >= 0 && index <= 6) {
          // $(el+":eq("+index+")").append("<div class=now-bar style='top:"+height+"%"+wrongDayStyle+"'>"+label+"</div>");
          $(el+":eq("+index+")").append("<div class=now-bar style='top:"+height+"%'>"+label+"</div>");
        }
      }

      //in case latestStartDate can't be gotten from the journal nowlines
      var isCurrentWeek = (weekOf(currentDate).toDateString() == startDate.toDateString())
      $(".week-column").each(function (index,item) { 
        var currentDay = new Date(startDate.getTime());
        currentDay.setDate(currentDay.getDate()+index);
        //ToDo: get rid of this AWFUL way to get totals!
        var total = parsley.dayTotal(currentDay);
        var target = parsley.dayTarget(currentDay);
        // var ratio = total/target;
        // var green = "rgb(50,100,100)";
        //   purple = "rgb(50,150,75)";
        //   orange = "rgb(150,100,0)";
        //   red = "rgb(150,0,0)";

        // var colorString = ratio == 1 ? green : ratio > 1 ? purple : ratio > 0.60 ? orange : red;

        // $(this).append("<div style='text-align: center;background:"+colorString+"'>"+total+" / "+target+"</div>");
        // if (currentDay.toDateString() == currentDate.toDateString())
        // {
        //   $(this).addClass("today-day-tasks");
        // }

        $(this).append("<div class='day-footer' style='text-align: center'>"+total+"</div>");
        $(this).append("<div class='dosage'></div>");
        dosageBox = $('.dosage:last');
        dosageItems = journal.dayDosageItems(currentDay);
        dosageItems.forEach(function(item) { 
          dosageBox.append(item + '<br>');
        });
        var dayStart = journal.dayStartHour(currentDay);
        if (typeof dayStart == 'number') { 
          //TODO: this only really needs to be called once! 
          if (isCurrentWeek) {
            currentDay.setHours(dayStart);
            latestStartDate = currentDay;
          }
          for (var i = 0; i < 4; i++) {
            addDayBar(".day-tasks",index,dayStart-hoursOffset+i*5);
          }
        } 

      });
      showDayStats();
      calendar.nowLineInterval = setInterval(showDayStats,1000);

      //TODO: refactor this with addTotalsBar()?
      function addDayBar(el,index,hours,label) {
        //99.84 ensures that line doesn't disappear at bottom:
        var height = (hours/24*99.84).toFixed(2)/1;
        label = label || '';
        var wrongDayStyle = (height > 100 || height < 0) ? ";background:red" : '';
        if (height > 100) { 
          height -= 100; index += 1;
        } else if (height < 0) {
          height += 100; index -= 1;
        } 
        if (index >= 0 && index <= 6) {
          $(el+":eq("+index+")").append("<div class=day-bar style='top:"+height+"%"+wrongDayStyle+"'>"+label+"</div>");
        }
      }

      /* Assumes that startDate has already had weekOf() called on it! */
      function filterToWeek(startDate,tasks) {
        var weekStart = startDate.getTime(),
            weekEnd = new Date(weekStart);
        //WARNING: using daysInMonth from WAY up top out of sheer laziness
        //NOTE: this eliminates Week 5 overdraw, but preserves day-bleed
        //Proprietary to renderWeek(), so shouldn't be in here.
        var endDate = Math.min(startDate.getDate()+7,daysInMonth+1);
        weekEnd.setDate(endDate);

        var tasks = tasks || parsley.tasks
        // p(tasks.length);

        var filtered = tasks.filter(function(task) {
          var taskStart = task.startDate.getTime();
          return taskStart >= weekStart && taskStart < weekEnd.getTime();
        });
        // p(filtered.length);
        // p(filtered);
        return filtered;
      }

    }
  }




}();