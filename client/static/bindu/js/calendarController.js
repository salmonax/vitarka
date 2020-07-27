var calendarController = function() {
  var $calendar,
      view,
      initialized = false;
  return {
    init: function(page,view) {
      if (!initialized) { 
        $calendar = $(page);
        view = view;
        bindEvents(view);
        initialized = true;
      }
    }
  }
  function bindEvents(view) {
    var miniNavs = ".mini-month, .mini-week, .mini-year, .mini-option",
        navButton = ".nav-button",
        headingButton = "#cal-heading .label",
        hoverClasses = [miniNavs,navButton].join(', '),
        labelClasses = [navButton,headingButton].join(', '),
        taskBox = ".task";
    $calendar
      .on("mouseover mouseout",hoverClasses, function() {
        $(this).toggleClass('hovered');
      })
      .on("touch click",miniNavs, function() {
        var buttonClass = '.'+$(this).attr("class").split(' ')[0];
        var index = $(buttonClass).index(this);
        var action = {
          '.mini-month': view.setMonth,
          '.mini-week': view.setWeek,
          '.mini-year': view.setYear,
          '.mini-option': view.setOption
        };
        action[buttonClass](index);
      })
      .on("touch click",labelClasses, function() {
        var label = this.id;
        view.doLabelAction(label);
      })
      .on("mouseover",taskBox, function() {
        // p("HELLO!?")
        view.showTaskStatus();
      })
      .on("mouseout",taskBox, function() {
        // p("HELLO!?")
        view.hideTaskStatus();
      });
  }
  
}();