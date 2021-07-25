/*
  Making this store an umbrella for the following:

  1. Login
  2. Network Heartbeat
  3. Socket-related management, including SyncBus.

*/

import DropboxService from '../lib/dropbox';
import { action, reaction, observable } from 'mobx';

export default class NetworkStore {
  isOnline = true;
  whenOnline = Promise.resolve

  $syncBus = DropboxService.$syncBus;

  @observable syncState = {
     isTimerActive: false,
     _lastStartTime: 0,
  }

  constructor() {
    const { $syncBus } = this;
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
  }

  // NOTE: This method of checking the heartbeat does literally
  // nothing on Cordova, so make sure to check for it.
  // 2021: I actually have no idea if this works.
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
}