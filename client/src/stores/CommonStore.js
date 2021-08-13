import { observable, computed, action, toJS, runInAction, autorun } from 'mobx';
window.autorun = autorun; window.toJS = toJS; window.observable = observable;

import SunriseService from '../lib/sunrise';
import TurnipService from '../lib/turnip';

/*
  Other things on the docket:
    1. TimerStore, which might handle the syncbus instead of NetworkStore.
    2. TurnipStore/VitarkaStore.
    3. BookStore.
    4. A better way for stores to know about each other, possibly via events
      or by setting up a Rootstore.
*/

import NetworkStore from './NetworkStore';
import ParsleyStore from './ParsleyStore';

// TODO: doing this temporarily, since it's better than nothing,
// but we need to work a common means to make stores available
// both for injection of state in stores/index.js and for
// inclusion in other stores.

const substores = {
  network: new NetworkStore(),
  parsley: new ParsleyStore(),
};

export default class Common {
  stores = substores;

  _dayEndHour = 31 // can get this from the pomodoro sheet
  @observable dayTarget = 18
  @observable diegesis

  @observable selectedBook = ''

  constructor() {
    this.runDiegesisTimeout();
  }

  // TODO: parsleyStore delegation; clean up
  get parsleyData() { return this.stores.parsley.parsleyData; }
  @computed get pomsToday() { return this.stores.parsley.pomsToday; }
  @action checkAndUpdatePomsheet() { return this.stores.parsley.checkAndUpdatePomsheet(); }
  pomsDaysAgo(daysAgo) { return this.stores.parsley.pomsDaysAgo(daysAgo); }
  tasksDaysAgo(daysAgo) { return this.stores.parsley.tasksDaysAgo(daysAgo); }
  onParsleyData(cb) { this.stores.parsley.onParsleyData(cb); }


  async getSunriseFn() {
    // Uncomment to debug (move to debug settings):
    // const lat = 41.11159; const lon = -114.96449;
    const { lat, lon } = await SunriseService.fetchLocation();
    return date =>  SunriseService.getTimes(date, lat, lon);
  }

  @action loginAndParsley() {
    const { network, parsley } = this.stores;
    // console.error('!!!!', parsley.onFirstScratchChunk);
    return parsley.loginAndParsley({
      onLogin: userHash => {
        // TODO: should save the content_hashes for both pomsheet and scratch and prevent
        // any further load if they're both the same. Later, add more sophisticated
        // content_hash checking when performing a streamed read.
        const userPomsheetKey = `__vitarka_cache__/${userHash}/mergedSheet`;
        // TODO: ignoring userHash for now and just dumping the merged pomsheet in localStorage.
        // Should use IndexedDB instead, and look sheet up based on current logged in user.
        const maybeExistingSheet = localStorage.getItem(userPomsheetKey);
        if (maybeExistingSheet) {
          parsley.onPomsheetUpdate({
            merged: true,
            content_hash: 'cached', // NOTE: this prevent out-of-order error in onPomsheetUpdate
            file: maybeExistingSheet,
          }, 'loginAndParsley_localStorage');
        }
      },
      onFirstPomsheetChunk: text =>
        parsley.onFirstPomsheetChunk(text)
          .then(_ => {
            console.log('------>>>>>>>> got the first');
            this.diegesis = this.getDiegesis();
          }),
      onPomsheetComplete: result =>
        parsley.onPomsheetUpdate(result, 'loginAndParsley')
          .then(_ => {
            console.log('------>>>>> got the second');
            this.diegesis = this.getDiegesis();
          }),
      onFirstScratchChunk: parsley.onFirstScratchChunk,
      onScratchComplete: parsley.onScratchUpdate,
      onNetworkFail: _ => network.startNetworkHeartBeat(),
    });
  }

  // Returns Unix time adjusted for the practical EOD.
  // WARNING: there's a "canonical" implementation in Parsley,
  // but it doesn't seem to be used anywhere. Fix.
  @computed get _adjustedUTC() {
    return Date.now()-(this._dayEndHour - 24)*36e5;
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
    return this.stores.network.startNetworkHeartbeat(interval, offlineInterval);
  }

  @observable isTimerActive = false
  @observable intervalMode = 1
  @observable elapsed = 0
  @observable ms
  @observable isTimerRunning = false;
  _lastStartTime = null
  _timerInterval = null


  @computed get money() {
    return '$'+(170*this.ms/1000/60/60).toFixed(2);
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
    if (!this.parsleyData) return null;
    // WARNING: CHANGE THIS
    const adjustedNow = Math.max(this._adjustedUTC, this.parsleyData.lastUTC);
    const startHour = this.parsleyData.startHour(adjustedNow);
    return TurnipService.getDiegesis(startHour, this._dayEndHour, adjustedNow);
  }

  // 2021: this syncBus stuff is a real mess, but we'll untangle it later.
  @action.bound handleTimerClick({ syncState, $syncBus } = this.stores.network) {
    console.log('timer has started');
    if (syncState.isTimerActive) return this.stopTimer();

    syncState._lastStartTime = $syncBus.now();
    syncState.isTimerActive = !syncState.isTimerActive;
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
        const ms = $syncBus.now() - syncState._lastStartTime;
        this.ms = $syncBus.now() - syncState._lastStartTime;
        this.elapsed = `${pad(mins(ms))}:${pad(secs(ms))}:${pad(csecs(ms))}`
      });
    },32);
  }

  @action.bound stopTimer({ syncState } = this.stores.network) {
    window.clearTimeout(this.__timerInterval);
    syncState.isTimerActive = false;
  }
  @action.bound resumeSyncBus({ $syncBus } = this.stores.network) {
    $syncBus.resume();
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
