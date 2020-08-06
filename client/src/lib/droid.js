let _backgroundInitiated = false
let _activeTimerClear = null;
let _deviceReady = new Promise(r => document.addEventListener('deviceready', r)); 

export async function initBackgroundMode() {
  await _deviceReady;
  if (_backgroundInitiated) {
    console.warn('Attempted to initiate background mode twice; ignoring');
    return;
  }
  if (!window.cordova || !window.powerManagement) {
    console.error('Missing dependency in initBackgroundMode(). Skipping.');
    return;
  }
  window.cordova.plugins.backgroundMode.on('activate', () => {
      console.log('Activated Background Mode.');
      cordova.plugins.backgroundMode.disableWebViewOptimizations();
      console.log('Disabled WebView Optimizations.');
  });
  window.cordova.plugins.backgroundMode.enable(); 
              
  // Not verified to be necessary, but makes Android less likely to suspend the process
  window.powerManagement.dim(function() {
      console.log('Wakelock acquired');
  }, function() {
      console.log('Failed to acquire wakelock');
  });
  window.powerManagement.setReleaseOnPause(false, function() {
      console.log('setReleaseOnPause successfully');
  }, function() {
      console.log('Failed to set');
  });
  _backgroundInitiated = true;
}

// Uses evil module state in order to cancel and re-cast
// any currently active timer according to the given startingHour
// By means of further evil, won't bother to reset the timer
// unless the startingHour is different from the last invocation. 
export async function playBlockBeepsMinutely(startingHour) {
  await _deviceReady;
  if (startingHour === undefined) {
    console.error('playBlockBeepsMinutely: startingHour not specified. Ignoring.');
    return;
  } else {
  
  }
  const beeps = initCasio();
  if (_activeTimerClear) {
    if (_activeTimerClear.startingHour === startingHour) {
      console.log('playBlockBeepsMinutely: called with same startingHour as before. Skipping.');
      return;
    }
    console.log('playBlockBeepsMinutely: Clearing previous timer and activating one with startingHour:', startingHour);
    _activeTimerClear();
  } else {
    console.log('playBlockBeepsMinutely: Starting initial timer with startingHour:', startingHour);
  }
  _activeTimerClear = runHourly(() => playCountdownBeep(beeps, startingHour));
  _activeTimerClear.startingHour = startingHour;
}


// Too lazy for JSDoc right now; returns beeps object
// of following form:
// beeps[1].good.play() will play one bright beep 
// beeps[2].bad.play() will play two discordant beeps
function initCasio(beepsPath = '/static/audio/beeps/') {
  return [null].concat(
    Array(5).fill()
      .map((n, i) => ({
          good: new Audio(`${beepsPath}${i+1}.wav`),
          bad: new Audio(`${beepsPath}${i+1}-bad.wav`),
      }))
  );
}

function playCountdownBeep(_beeps = beeps, startingHour) {
  console.log('Tried to play beep at', (new Date()).toLocaleTimeString([], { timeStyle: 'short'}) );
  const beepCount = getBeepCountFromHour(startingHour);
  // Randomly play the maru or batsu beep
  // Make this depend on number of poms done, or something
  _beeps[beepCount][Math.round(Math.random()) ? 'good' : 'bad'].play();
}

// This determins the number of beeps relative to the current block,
// which are calculated from a given starting hour. 
// Example: 
//  Your starting hour is 14, or 2pm. The first beep will be at 15.
//  Because there are 4 hours left to the block, it will beep 4 times.
//  At 16, 3 times, at 17, 2 times, and so forth. The new block
//  Is signaled by a 5-beep block at 19.
function getBeepCountFromHour(startingHour) {
    return 5-((_getBigNowHour(startingHour)-startingHour)%5);
    
    // Just use starting time to decide whether to pad 24 hours
    function _getBigNowHour (startingHour) {
        const curHour = (new Date()).getHours();
        return (curHour < startingHour) ? curHour + 24 : curHour;
    }
}

// Set a timeout that runs at the start of the next hour
// Needs to be rewritten to remove later.js
function runHourly(cb, later = window.later) {
  console.log('runHourly called. Waiting', (_timeToNextHour()/1000/60).toFixed(0), 'minutes');
  let timer;
  let count = 1;
  timer = window.setTimeout(
    () => {
      console.log(count++, 'initiating first timeout timer at', (new Date()).toLocaleString())
      cb();
      timer = window.setInterval(() => {
        console.log(count++, 'ran setInterval at', (new Date()).toLocaleString());
        cb();
      }, 3.6e+6);
    },
    _timeToNextHour(),
  );
  // Closure the timer variable and return a function.
  // This way, the caller won't need to care. 
  return () => clearInterval(timer);

  function _timeToNextHour() {
    const now = new Date(Date.now() + 3.6e+6);
    now.setMinutes(0); 
    return now.setSeconds(0)-Date.now();
  }
}

// TODO: DRY these up when refactoring.
// Might not need minutes, but probably want it to beep every 5 minutes when doing a pom,
// with an analogous countdown method.
function runMinutely(cb, later = window.later) {
  console.log('runMinutely called. Waiting', _timeToNextMinute(), 'ms');
  let timer;
  let count = 1;
  timer = window.setTimeout(
    () => {
      console.log(count++, 'initiating first timeout timer at', (new Date()).toLocaleString())
      cb();
      timer = window.setInterval(() => {
        console.log(count++, 'ran setInterval at', (new Date()).toLocaleString());
        cb();
      }, 60000);
    },
    _timeToNextMinute(),
  );
  // Closure the timer variable and return a function.
  // This way, the caller won't need to care. 
  return () => clearInterval(timer);

  function _timeToNextMinute() {
    return (new Date(Date.now() + 60000)).setSeconds(0)-Date.now();
  }
}