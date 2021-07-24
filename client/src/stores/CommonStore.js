import { observable, reaction, computed, action, toJS, runInAction, autorun } from 'mobx';
window.autorun = autorun; window.toJS = toJS; window.observable = observable;
import DropboxService from '../lib/dropbox';
import ParsleyService from '../lib/parsley';
import TurnipService from '../lib/turnip';
import Time from '../lib/time';
import axios from 'axios';

import StateSyncService from '../lib/pubnub';

window._p = ParsleyService;
window.t = TurnipService

/*
  Here are the stores that are appearing:

    1. DropboxStore, posssibly a login/update handling
        store a higher level of abstraction
    2. A Timer store

    There's also a bit of a difference between the original,
    shitty Parsley code and other stuff... But I'll deal with
    that later.
 */

export default class Common {
  userHash = null;
  pomsheetHasLoadedResolve = null;
  pomsheetHasLoaded = new Promise((r, j) => {
    this.pomsheetHasLoadedResolve = r;
  })
  scratchHasLoadedResolve = null;
  scratchHasLoaded = new Promise((r, j) => {
    this.scratchHasLoadedResolve = r;
  });
  lastPomsheetResult = {};
  lastScratchResult = {};

  @observable example = 'herrow'
  @observable rawPomsheet = 'react has loaded'
  @observable rawScratch = ''
  @observable bullshit = ''
  @observable.shallow parsleyData
  @observable pomsToday = ''
  @observable debugText
  _lastPomsheetHash = null
  @observable updatedOnFocus = false
  whenOnline = Promise.resolve
  _dayEndHour = 31 // can get this from the pomodoro sheet
  @observable dayTarget = 18

  @observable diegesis

  @observable selectedBook = ''

  @action loginAndParsley() {
    this.rawPomsheet = 'loginDropbox called';
    let _resolve;
    let pomsheetPromise = new Promise((r, j) => _resolve = r);
    try {
      this.rawPomsheet = 'made it to try block';
      // Might want to do a catch condition here
      // No, this thing is fucking horrible.. Goddamnit
      DropboxService.handleLogin({
        onLogin: userHash => {
          this.userHash = userHash;
          // TODO: should save the content_hashes for both pomsheet and scratch and prevent
          // any further load if they're both the same. Later, add more sophisticated
          // content_hash checking when performing a streamed read.
          const userPomsheetKey = `__vitarka_cache__/${this.userHash}/mergedSheet`;
          // TODO: ignoring userHash for now and just dumping the merged pomsheet in localStorage.
          // Should use IndexedDB instead, and look sheet up based on current logged in user.
          const maybeExistingSheet = localStorage.getItem(userPomsheetKey);
          if (maybeExistingSheet) {
            this.onPomsheetUpdate({
              merged: true,
              content_hash: 'cached', // NOTE: this prevent out-of-order error in onPomsheetUpdate
              file: maybeExistingSheet,
            }, 'loginAndParsley_localStorage');
          }
        },
        onFirstPomsheetChunk: this.onFirstPomsheetChunk,
        // Do this when the whole sheet has loaded... Just an ugly way to make it a Promise
        onPomsheetComplete: result => {
          // the strings are just for debugging outputs
          // 2021: this doesn't seem to be used. Why is it here?
          _resolve(this.onPomsheetUpdate(result, 'loginAndParsley'), 'loginAndParsley');
        },
        onFirstScratchChunk: this.onFirstScratchChunk,
        onScratchComplete: this.onScratchUpdate,
        onNetworkFail: _ => this.startNetworkHeartbeat(),
      });
    } catch (err) {
      this.rawPomsheet = 'everything fucked up' + err;
    }
    console.log('logging in dropbox, or at least trying');
    return pomsheetPromise;
  }

  // TODO: there's currently no way to run something only ONCE
  // implement when/if needed.
  _parsleyCbs = []
  onParsleyData(cb) {
    if (!this._parsleyCbs.includes(cb)) {
      this._parsleyCbs.push(cb);
    }
  }
  // ToDo: This isn't popping them, what the hell?
  runParsleyCallbacks(parsleyData) {
    this._parsleyCbs.forEach(func => func(parsleyData));
    // Think this is correct?
    // this._parsleyCbs = [];
  }


  @action checkAndUpdatePomsheet() {
    // This method runs the on-focus check. It should check BOTH the scratch sheet and the pomsheet
    // and then act appropriately.
    const lastScratchHash = this.lastScratchResult.content_hash;
    return DropboxService.checkForUpdate(this._lastPomsheetHash, lastScratchHash)
      .then(({ pomsheet, scratch }) => {
        if (pomsheet.isUpdated || scratch.isUpdated) {
          this.updatedOnFocus = true;
          let fetchPomsheet = _ => Promise.resolve();
          let fetchScratch = fetchPomsheet;
          if (pomsheet.isUpdated) {
            if (!window.ReadableStream) {
              fetchPomsheet = _ => DropboxService.fetchPomsheet(this.onPomsheetUpdate);
            } else {
              fetchPomsheet = _ => DropboxService.streamPomsheet(this.onFirstPomsheetChunk)
                .then(text => this.onPomsheetUpdate(
                  { file: text, content_hash: pomsheet.content_hash },
                  'checkAndUpdatePomsheet',
                ));
            }
          }
          if (scratch.isUpdated) {
            if (!window.ReadableStream) {
              fetchScratch = _ => DropboxService.fetchScratch(this.onScratchUpdate);
            } else {
              fetchScratch = _ => DropboxService.streamScratch(this.onFirstScratchChunk)
                .then(text => this.onScratchUpdate(
                  { file: text, content_hash: scratch.content_hash },
                ));
            }
          }
          // Fetch in order. This will make the following (quick-and-dirty, suboptimal) thing happen:
          // 1. If there's a pomsheet update, it'll fetch it and run onPomsheetUpdate, otherwise nothing
          // 2. If there's a scratch sheet update, it'll pull the scratch and run onPomsheetUpdate *again*, otherwise nothing.
          // 3. If neither have changed, it'll use the current data.
          return fetchPomsheet().then(fetchScratch);
        }

        this.updatedOnFocus = false
        console.warn('Pomsheet checked, but no change in either pomsheet or scratch; skipping onPomsheetUpdate');
        // NOTE: I think that checking the scratch sheet hash obviates the onPomsheetUpdate() call.
        // console.warn('Pomsheet checked, but no change; skipping, but calling onPomsheetUpdate anyway.');
        // WARNING: TEMPORARY KLUDGE
        // Run onPomsheetUpdate anyway to force a re-merge with scratch on focus.
        // Note: it will use this.lastPomsheetResult and assume it is NOT being called for a scratch sheet update
        // this.onPomsheetUpdate();
      });
  }


  @action.bound onFirstPomsheetChunk(text) {
    this.updatedOnFocus = 'I did it! ' + Date.now(); // ???
    if ((!this.lastPomsheetResult || !this.lastPomsheetResult.merged) && !this.rawScratch) {
      const partialParsleyData = ParsleyService.buildParsleyData(text, { partialOnly: true });
      this.parsleyData = partialParsleyData;
      this.pomsToday = this.pomsDaysAgo(0, partialParsleyData);
    }
    this.diegesis = this.getDiegesis();
  }

  // These functions are misnamed; this should be "receivedPomsheet" as
  // it doesn't actually take any sort of callback.
  // It's called in several contexts, but always when the pomsheet is done loading.
  @action.bound async onPomsheetUpdate(result = this.lastPomsheetResult, caller) {
    console.error('@@@@@@@@@@@@@@@@@@@@ CALLED UPDATE', caller);
    // if (caller === 'loginAndParsley') {
      console.warn('ERRR: ',!!this.rawScratch, this.hasPomsheetLoadedOnce);
    // }
    // 2020: Sigh, tech debt; this makes rawPomsheet and _lastPomsheetHash redundant
    this._oldPomsheetResult = this.lastPomsheetResult; // why?!
    this.lastPomsheetResult = result;

    console.warn('Caller: ' + caller);
    console.log('updating pomsheet');
    let _updateStart = Date.now();
    // Really kludgy, but should skip everything if we know nothing has changed
    // ... UNLESS onScartchUpdate is the caller, in which case it keeps going.
    if (this.hasPomsheetLoadedOnce && this._oldPomsheetResult === this.lastPomsheetResult && caller !== 'onScratchUpdate') {
      console.warn('onPomsheetUpdate: skipped update because lastPomsheetResult unchanged');
      return;
    }

    // 2021: oh god, this logic needs to be killed with fire.
    // TODO: split CommonStore into pieces, rewrite pomsheet update logic!
    if (this.hasPomsheetLoadedOnce && this.rawScratch) {
      if (caller === 'onScratchUpdate' || !this._oldPomsheetResult.merged) {
        // On any subsequent pomsheet loads where the scratch sheet has already loaded,
        // build parsleyData out of a merged sheet rather than the raw data
        const { rawScratch, parsleyData } = this;
        console.warn('ABOUT TO CALL MERGE SCRATCH', caller);
        const { updatedPomsheet } = await ParsleyService[window.Worker ? 'mergeScratchAsync' : 'mergeScratch'](
          rawScratch,
          // always merge into an unmerged parsleyData object:
          ParsleyService.buildParsleyData(result.file),
        );
        // Unconditionally merge updatedPomsheet to localStorage:
        window.localStorage.setItem(
          `__vitarka_cache__/${this.userHash}/mergedSheet`,
          updatedPomsheet,
        );

        // TODO: mergeScratch should probably look more look like this:
        //const { updatedPomsheet } = ParsleyService.mergeScratch(rawScratch, parsleyData);

        // Only rebuild the parsley data if the merged raw pomsheet has changed:
        if (this.rawPomsheet !== updatedPomsheet) {
          this.rawPomsheet = updatedPomsheet;
          this.parsleyData =  ParsleyService.buildParsleyData(updatedPomsheet);
        } else {
          console.warn('onPomsheetUpdate: skipped parsleyData rebuild because merged sheet unchanged');
        }
      }
    } else {
      const rawPomsheet = result.file; // should maybe be result.text
      this.rawPomsheet = rawPomsheet;
      if (caller === 'onScratchUpdate' || !this._oldPomsheetResult.merged) {
        this.parsleyData = ParsleyService.buildParsleyData(rawPomsheet);
      } else {
        console.log('Skipped setting parsleyData, waiting for onScratchUpdate.');
      }
      console.log('Has not loaded once, or no rawScratch exists');
    }

    this._lastPomsheetHash = result.content_hash;

    if (caller === 'onScratchUpdate' || !this._oldPomsheetResult.merged) {
      this.pomsToday = this.pomsDaysAgo(0);
      this.diegesis = this.getDiegesis();
      this.pomsheetHasLoadedResolve();
      this.runParsleyCallbacks(this.parsleyData);
      console.log('updated pomsheet. elapsed:', Date.now() - _updateStart + 'ms', caller);
    } else {
      console.log('Ignored end of onPomsheetUpdate, waiting for onScratchUpdate.');
    }
    return this.parsleyData;
  }
  get hasPomsheetLoadedOnce() {
    return !!this._lastPomsheetHash;
  }

  @action.bound onFirstScratchChunk(text) {
    console.warn('##### CALLED ON FIRST SCRATCH CHUNK');
    // This doesn't do anything yet
  }

  @action.bound onScratchUpdate(result) {
    window.fuckme = result;
    console.log('!!!!',result.file.length)
    console.warn('##### SCRATCH UPDATE DETECTED. WILL CALL ONPOMSHEETUPDATE() ####');
    this.lastScratchResult = result;
    this.rawScratch = result.file;
    // NOTE: this caller string causes onPomsheetUpdate to re-merge no matter what
    this.pomsheetHasLoaded.then(_ => this.onPomsheetUpdate(undefined, 'onScratchUpdate'));
  }

  // Returns Unix time adjusted for the practical EOD.
  // WARNING: there's a "canonical" implementation in Parsley,
  // but it doesn't seem to be used anywhere. Fix.
  @computed get _adjustedUTC() {
    return Date.now()-(this._dayEndHour - 24)*36e5;
  }

  pomsDaysAgo(daysAgo) {
    return this.tasksDaysAgo(daysAgo)
      .map(n => +n.duration)
      .reduce((a, n) => a+n,0);
  }

  tasksDaysAgo(daysAgo, parsleyData = this.parsleyData) {
    const { tasks, lastUTC } = parsleyData;
    const adjustedUTC = Math.max(this._adjustedUTC, lastUTC);
    return tasks.filter(task => -Time.countDaysToDate(task.baseDate, adjustedUTC) === daysAgo);
  }

  @computed get tasksToday() {
    if (!this.parsleyData) return [];
    return this.getTasksTodayFrom(this.parsleyData);
  }

  // This is hastily thrown together for cases where
  // a component that only knows diegesis-relative intervals
  // can get the decimal time; it's used to retrieve the task
  // in getTaskAtBlockPom
  //
  // NOTE: Putting this here so that the component doesn't know
  // so much about the incidental details of the common store
  _blockPomToDecimal(numInBlock, curBlock = this.diegesis.block) {
    if (!this.parsleyData) {
      console.warn('toAbsoluteDecimal called with no parsley data, ignoring.');
      return;
    }
    // Ugh... actually, parsleyData itself should have
    // the responsibility to calculate the adjusted UTC
    const startHour = this.parsleyData.startHour(this._adjustedUTC);

    const decimal = startHour + (curBlock-1)*this.diegesis._meta.counts.pom + (numInBlock/2);
    return decimal;
  }

  getTaskAtBlockPom(numInBlock) {
    const decimal = this._blockPomToDecimal(numInBlock);

    return this.blockInfoToday.tasks.decimalMap[decimal];
  }


  getTasksTodayFrom(parsleyData = this.parsleyData) {
    const dateToday = (new Date(this._adjustedUTC)).toLocaleDateString();
    return this.parsleyData.tasks.filter(({ baseDate }) =>
      baseDate.toLocaleDateString() === dateToday
    );
  }

  _getBlockAt(decimalHour, startHour, clamp = 4) {
    const rawBlock = Math.ceil((decimalHour-startHour)/5);
    return clamp ? Math.min(rawBlock, 4) : rawBlock;
  }

  // Returns the poms DONE, plus block and decimal maps
  // NOTE: Christ, call this something else!
  getBlockInfoToday(parsleyData = this.parsleyData) {
    const blockCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    if (!parsleyData) return Object.values(blockCounts);
    const { startHours } = parsleyData;
    const blockMap = {};
    const decimalMap = {};

    // Maxing this out at 4
    //
    const tasks = this.getTasksTodayFrom(parsleyData);
    console.warn('going to go through tasks');
    tasks.forEach(task => {
      const time = +task.time;
      const duration = +task.duration;
      const { date } = task;
      const startHour = startHours[date] || startHours.default;
      if (time <= startHour) {
        console.warn('WARNING: Common.getBlockInfo() found a task before the startHour! Skipping.');
        return;
      }

      // Walk back to put the appropriate pom in the appropriate block
      Array(duration).fill().forEach((n,i) => {
        if (curTime < startHour) return; // just in case, I guess
        const curTime = time - i * 0.5;
        const curBlock = this._getBlockAt(curTime, startHour);
        blockCounts[curBlock]++;
        decimalMap[curTime] = task;
        blockMap[curBlock] = task;
      });
    });
    // do more with this
    return {
      counts: Object.values(blockCounts),
      tasks: {
        decimalMap,
        blockMap,
      },
    };
  }

  @computed get blockInfoToday() {
    return this.getBlockInfoToday();
  }

  // NOTE: This method of checking the heartbeat does literally
  // nothing on Cordova, so make sure to check for it.
  startNetworkHeartbeat(interval = 30000, offlineInterval = 5000) {
    if (this._heartbeatTimeout) window.clearTimeout(this._heartbeatTimeout);
    let _resolveCheck;
    const checkPromise = new Promise(r => _resolveCheck = r);
    axios.get('/static/network', {
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      }
    }).then(_ => {
      this.isOnline = true;
      console.warn('online');
      if (this._resolveOffline) {
        this._resolveOffline();
        _resolveCheck(this.whenOnline);
        this._resolveOffline = null;
      }
      this._heartbeatTimeout = setTimeout(() => {
        this.startNetworkHeartbeat(interval, offlineInterval);
      }, interval);
    })
    .catch(_ => {
      console.error('offline');
      if (!this._resolveOffline) {
        this._resolveOffline;
        this.whenOnline = new Promise(r => this._resolveOffline = r);
        _resolveCheck(this.whenOnline);
      }
      this.isOnline = false;
      this._heartbeatTimeout = setTimeout(() => {
        this.startNetworkHeartbeat(interval, offlineInterval);
      }, offlineInterval);
    });
    return checkPromise;
  }

  @observable isTimerActive = false
  @observable intervalMode = 1
  @observable elapsed = 0
  @observable ms
  @observable isTimerRunning = false;
  _lastStartTime = null
  _timerInterval = null


  @observable syncState = {
     isTimerActive: false,
     _lastStartTime: 0,
  }

  @computed get money() {
    return '$'+(170*this.ms/1000/60/60).toFixed(2);
  }

  constructor() {
    const { $syncBus } = DropboxService;
    // NOTE: timestamp is being passed in just in case; not to be
    // confused with time calibration handling, which is its own function
    const applySync = ({ state: syncState, timestamp }) => {
      this.__isDispatchPaused = true;
      console.log('applying', syncState);
      if (typeof syncState !== 'object' &&
        !Array.isArray(syncState)) {
        console.warn('Invalid state on server. Skipping load.');
        this.__isDispatchPaused = false;
        return;
      }
      Object.keys(syncState).forEach(key => {
        this.syncState[key] = syncState[key];
      });
      console.error('what the fuck', this._pauseDispatch);
      this.__isDispatchPaused = false;
    };
    $syncBus.addListener(applySync);
    $syncBus.onReady(() => $syncBus.load(applySync));

    // Handle all syncState changes
    reaction(
      () => toJS(this.syncState),
      (data, reaction) => {
        if (this.__isDispatchPaused) return;
        $syncBus.post(data);
      },
    );

    //
    reaction(
      () => this.syncState.isTimerActive,
      (hasActivated, reaction) => {
        if (hasActivated) {
          this.startTimer();
        } else {
          this.stopTimer();
        }
      }
    );

    this.runDiegesisTimeout();
  }

  runDiegesisTimeout() {
    console.error('Running diegesis');
    this.setDiegesisOnChange();
    window.setTimeout(() => {
      this.runDiegesisTimeout();
    }, 60000);
  }

  @action setDiegesisOnChange() {
    console.warn('Checking diegesis');
    if (!this.parsleyData) return;
    const diegesis = this.getDiegesis();
    if (diegesis._hash === this.diegesis._hash) return;

    this.diegesis = diegesis;
    console.warn('!! diegesis has changed');
  }
  // Returns an array of countdown turnips
  // It takes the blockInfo (ie. the pomodoros done during each block)
  // and subtracts it from the daily allocation, which is calculated from
  // the current day's target. interalTurnipsToday should work analogously.
  //
  // TODO:
  //  1. Should scale the demands of the present turnip according to
  //  how many pomodoros are left in the current interval

  @computed get blockTurnipsToday() {
    if (!this.parsleyData) return;
    const { allocateDayTarget, allocateBlockTarget } = TurnipService;

    const curBlockIndex = this.diegesis.block - 1;
    const blockInfoToday = this.blockInfoToday;
    const dayAllocation = allocateDayTarget(this.dayTarget);

    console.log('####', dayAllocation);

    let _acc = 0;
    const diffs = dayAllocation.concat(0).map((alloc, i) => {
      // store the ones that have actually been completed
      const doneInBlock = blockInfoToday.counts[i]
      let diff = alloc - doneInBlock;
      // before arriving at the current block, accumulate undone poms
      if (i < curBlockIndex) _acc += diff;
      // at the current block, add all undone poms to the block,
      // and then set the accumulated poms to whatever doesn't fit
      if (i >= curBlockIndex) {
        let pushedTotal = diff + _acc;
        diff = Math.min(pushedTotal, 10 - doneInBlock); // maybe should subtract the count?
        _acc = pushedTotal - diff;
      }
      return diff;
    });

    return diffs;
  }

  @computed get intervalTurnips() {
    if (!this.diegesis) return;
    const leftInInterval = this.blockTurnipsToday[this.diegesis.block-1];

    const doneThisBlock = this.blockInfoToday.counts[this.diegesis.block-1];
    // Ugh, convoluted, redundant way to get this...
    const totalInInterval = leftInInterval + doneThisBlock;

    const intervalInfo = this.intervalInfo;
    const intervalAllocation = TurnipService.allocateBlockTarget(totalInInterval);

    const curIntervalIndex = this.diegesis.interval - 1;

    let _acc = 0;
    const diffs = intervalAllocation.map((alloc, i) => {
      let diff = alloc - intervalInfo.counts[i];
      if (i < curIntervalIndex) {
        _acc += diff;
      }
      if (i >= curIntervalIndex) {
        let pushedTotal = diff + _acc;
        diff = Math.min(pushedTotal, intervalInfo.lengths[i]-intervalInfo.counts[i]);
        _acc = pushedTotal - diff;
      }
      return diff;
    });

    /*
      Calculating turnips on the "interval" are a little subtler than
      for the block, here's some discussion:

      1. The "saturation" point has been a part of the system for a while
        and is worth showing at the interval level. It's the point after
        which you have to work nonstop until the end of the block in order
        to "win" the turnip.
      2. It's worth showing that the block turnip has been lost. The naive
        way to do this is to just compare the turnip allocation to the
        number of poms left based on the current block. However, there
        might be a timer running already, and there's no telling how many
        will be recorded when they are.
      3. Except, there IS a way; the last completed set of poms shows the
        point before which there was definitely dead time. For instance, if
        a single pom was recorded at pom 7/10 of the block, and there were
        10 poms in the turnip, we can know it's dead. Just, not before that
        pom was recorded.
     */

    // START the maybe thing I'm doing
    // if (!this.parsleyData) return;
    // const { allocateDayTarget, allocateBlockTarget } = TurnipService;

    // const curBlockIndex = this.diegesis.block - 1;
    // const blockInfoToday = this.blockInfoToday;
    // const dayAllocation = allocateDayTarget(this.dayTarget);

    // let _acc = 0;
    // const diffs = dayAllocation.concat(0).map((alloc, i) => {
    //   // store the ones that have actually been completed
    //   let diff = alloc - blockInfoToday.counts[i];
    //   // before arriving at the current block, accumulate undone poms
    //   if (i < curBlockIndex) _acc += diff
    //   // at the current block, add all undone poms to the block,
    //   // and then set the accumulated poms to whatever doesn't fit
    //   if (i >= curBlockIndex) {
    //     let pushedTotal = diff + _acc;
    //     diff = Math.min(pushedTotal, 10);
    //     _acc = pushedTotal - diff;
    //   }
    //   return diff;
    // });

    // return diffs;



    return diffs; //intervalAllocation;
  }

  // These both return decimals
  @computed get blockStart() {
    return this.startHour + (this.diegesis.block-1)*5;
  }
  @computed get blockEnd() {
    return this.startHour + this.diegesis.block*5;
  }

  // Making this a bit like blockInfo today, but it *probably* won't
  // need decimalMap or a subintervalMap
  @computed get intervalInfo() {
    if (!this.parsleyData) return [];
    // Bleh, diegesis needs to be the single source of truth on this
    // makes much easier to debug
    const blockStart = this.startHour + (this.diegesis.block-1)*5 // Ugh, *tried* to keep this consistent
    const intervalCounts = [0,0,0];
    console.warn('start:', blockStart);
    for (let i = 0.5; i <= blockStart + 5; i += 0.5) {
      const { decimalMap } = this.blockInfoToday.tasks;
      let bucket = 0;
      if (!decimalMap[i+blockStart]) continue;
      if (i > 1.5) bucket++;
      if (i > 3.5) bucket++;
      intervalCounts[bucket]++;
    }
    return {
      counts: intervalCounts,
      lengths: [3, 4, 3], // maybe put this in diegesis
      intervalMap: {},
    };
  }

  @computed get startHour() {
    if (!this.parsleyData) {
      console.warn('Common.startHour called before parsleyData populated.');
      return null;
    }
    return this.parsleyData.startHour(this._adjustedUTC);
  }


  getDiegesis() {
    if (!this.parsleyData) return {};
    // WARNING: CHANGE THIS
    const adjustedNow = Math.max(this._adjustedUTC, this.parsleyData.lastUTC);
    const startHour = this.parsleyData.startHour(adjustedNow);
    return TurnipService.getDiegesis(startHour, this._dayEndHour, adjustedNow);
  }

  @action.bound handleTimerClick() {
    console.log('timer has started');
    const { $syncBus } = DropboxService;
    if (this.syncState.isTimerActive) return this.stopTimer();

    this.syncState._lastStartTime = $syncBus.now();
    this.syncState.isTimerActive = !this.syncState.isTimerActive;
  }
  @action.bound startTimer() {
    const { $syncBus } = DropboxService;
    const csecs = n => Math.floor((n%1000)/10);
    const secs = n => Math.ceil(n/1000%60);
    const mins = n => Math.floor(n/(1000*60));
    const pad = (num, spaces = 2) => {
      const textNum = num.toFixed();
      return '0'.repeat(Math.max(spaces-textNum.length,0))+textNum
    }

    this.__timerInterval = setInterval(() => {
      runInAction(() => {
        const ms = $syncBus.now() - this.syncState._lastStartTime;
        this.ms = $syncBus.now() - this.syncState._lastStartTime;
        this.elapsed = `${pad(mins(ms))}:${pad(secs(ms))}:${pad(csecs(ms))}`
      });
    },32);
  }

  @action.bound stopTimer() {
    window.clearTimeout(this.__timerInterval);
    this.syncState.isTimerActive = false;
  }
  @action.bound resumeSyncBus() {
    DropboxService.$syncBus.resume();
  }

  @computed get booksByLastRead() {
    // TODO: consider changing the media object to include the lastRead property!
    if (!this.parsleyData) return [];
    const { media } = this.parsleyData;
    return Object.keys(media)
      .reduce((acc, title) => {
          const item = media[title];
          const { tasks, category } = item;
          const lastRead = Math.max.apply(null, tasks.map(n => n.endDate.getTime()));
          return acc.concat({ title, lastRead, tasks });
      }, [])
      .sort((a, b) => b.lastRead - a.lastRead);
  }
}
