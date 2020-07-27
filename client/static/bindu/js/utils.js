var utils = {
  daysInMonth: function(date) { return new Date(date.getFullYear(),date.getMonth()+1,0).getDate()},
  dayName: function(num) { 
    return "Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(' ')[num%7];
  },
  dayNameShort: function(num) {
    return "Sun Mon Tue Wed Thu Fri Sat".split(' ')[num];
  },
  monthName: function (index) {
    return "January February March April May June July August September October November December".split(' ')[index];
  },
  monthNameShort: function(num) {
    return "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(' ')[num]
  },
  weekNum: function(monthDay) {
    return Math.floor((monthDay-1)/7)+1;
  },
  //From journal.js, which is not replaced!
  dayNum: function(name) {
    var num = "Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(' ').indexOf(name);
    return num != -1 ? num : null;
  }
}