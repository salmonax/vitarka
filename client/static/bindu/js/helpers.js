//BEGIN Print Helpers
function r(whatever,noBreak) {
  $("#output").text("");
  return p(whatever,noBreak);
}

function printString(whatever,noBreak) { 
    $("#output").append(whatever);
    if (!noBreak) { $("#output").append("<br>") }
}
function printObject(object,noBreak) {
  var pom_props = Object.keys(object);
  printString("{ ", true);
  for (var i = 0; i < pom_props.length; i++) {
    printString(pom_props[i] + ": ", true);
    p(object[pom_props[i]],true);
    if (i < (pom_props.length-1)) { printString(", ",true); }
  }
  printString(" }", true);
  if (!noBreak) { $("#output").append("<br>") }
}
function printArray(array,noBreak) {
  printString("[",true);
  for (var i = 0; i < array.length; i++) { 
    p(array[i],true);
    if (i < (array.length-1)) printString(", ", true); 
  }
  printString("]",true);
  if (!noBreak) { $("#output").append("<br>") }
}

function p(variable,noBreak) { 
  if (variable instanceof Object) {
    if (variable instanceof Array) {
      printArray(variable,noBreak);
    } else if (variable instanceof Date) {
      printString("(Date Object) " + variable,noBreak);
    } else {
      printObject(variable,noBreak);
    }
  }
  else {
    printString(variable,noBreak); 
  }
  return variable;
}

//END Print Helpers