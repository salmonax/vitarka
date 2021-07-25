import { observable, computed, action } from 'mobx';
import DropboxService from '../lib/dropbox';
import ParsleyService from '../lib/parsley';
import Time from '../lib/time';


export default class ParsleyStore {
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

  @observable rawPomsheet = ''
  @observable rawScratch = ''

  @observable.shallow parsleyData
  @observable pomsToday = ''

  _lastPomsheetHash = null
  @observable updatedOnFocus = false


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

  get hasPomsheetLoadedOnce() {
    return !!this._lastPomsheetHash;
  }

  // 2021: Hrm... Really not sure about this. Both this store and
  // ParsleyStore need the Dropbox dep, and only one probably should.
  @action async loginAndParsley(parsleyHandling) {
    // this.rawPomsheet = 'loginDropbox called';
    let _resolve;
    let pomsheetPromise = new Promise((r, j) => _resolve = r);
    try {
      // this.rawPomsheet = 'made it to try block';
      // Might want to do a catch condition here
      // No, this thing is fucking horrible.. Goddamnit
      await DropboxService.handleLogin({
        ...parsleyHandling,
        onLogin: userHash => {
          this.userHash = userHash;
          typeof parsleyHandling.onLogin === 'function' &&
            parsleyHandling.onLogin(userHash);
        },
        onNetworkFail: _ => this.startNetworkHeartBeat(),
      }); // REFACTOR: hmm... networkHeartBeat is passed in
    } catch (err) {
      throw new Error('LOGINSTORE: Could not log in. Handle me.');
      // this.rawPomsheet = 'everything fucked up' + err;
    }
    console.log('logging in dropbox, or at least trying');
    return pomsheetPromise;
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

  @action.bound async onFirstPomsheetChunk(text) {
    this.updatedOnFocus = 'I did it! ' + Date.now(); // ???
    let partialParsleyData;
    if ((!this.lastPomsheetResult || !this.lastPomsheetResult.merged) && !this.rawScratch) {
      partialParsleyData = await ParsleyService.buildParsleyData(text, { partialOnly: true });
      this.parsleyData = partialParsleyData;
      this.pomsToday = this.pomsDaysAgo(0, partialParsleyData);
    }
    return partialParsleyData;
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
          await ParsleyService.buildParsleyData(result.file),
        );
        // Unconditionally merge updatedPomsheet to localStorage:
        // TODO: abstract this away; we shouldn't need to handle userHashes from here.
        window.localStorage.setItem(
          `__vitarka_cache__/${this.userHash}/mergedSheet`,
          updatedPomsheet,
        );

        // TODO: mergeScratch should probably look more look like this:
        //const { updatedPomsheet } = ParsleyService.mergeScratch(rawScratch, parsleyData);

        // Only rebuild the parsley data if the merged raw pomsheet has changed:
        if (this.rawPomsheet !== updatedPomsheet) {
          this.rawPomsheet = updatedPomsheet;
          this.parsleyData =  await ParsleyService.buildParsleyData(updatedPomsheet);
        } else {
          console.warn('onPomsheetUpdate: skipped parsleyData rebuild because merged sheet unchanged');
        }
      }
    } else {
      const rawPomsheet = result.file; // should maybe be result.text
      this.rawPomsheet = rawPomsheet;
      if (caller === 'onScratchUpdate' || !this._oldPomsheetResult.merged) {
        this.parsleyData = await ParsleyService.buildParsleyData(rawPomsheet);
      } else {
        console.log('Skipped setting parsleyData, waiting for onScratchUpdate.');
      }
      console.log('Has not loaded once, or no rawScratch exists');
    }

    this._lastPomsheetHash = result.content_hash;

    if (caller === 'onScratchUpdate' || !this._oldPomsheetResult.merged) {
      this.pomsToday = this.pomsDaysAgo(0);
      // this.diegesis = this.getDiegesis();
      this.pomsheetHasLoadedResolve();
      this.runParsleyCallbacks(this.parsleyData);
      console.log('updated pomsheet. elapsed:', Date.now() - _updateStart + 'ms', caller);
    } else {
      console.log('Ignored end of onPomsheetUpdate, waiting for onScratchUpdate.');
    }
    return this.parsleyData;
    // UPDATE diegesis afterwards again!
  }

  @action.bound onFirstScratchChunk(text) {
    console.warn('##### CALLED ON FIRST SCRATCH CHUNK');
    // This doesn't do anything yet
  }

  @action.bound onScratchUpdate(result) {
    console.log('!!!!',result.file.length)
    console.warn('##### SCRATCH UPDATE DETECTED. WILL CALL ONPOMSHEETUPDATE() ####');
    this.lastScratchResult = result;
    this.rawScratch = result.file;
    // NOTE: this caller string causes onPomsheetUpdate to re-merge no matter what
    this.pomsheetHasLoaded.then(_ => this.onPomsheetUpdate(undefined, 'onScratchUpdate'));
  }
}