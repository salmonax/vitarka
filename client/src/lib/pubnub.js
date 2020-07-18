const PubNub = window.PubNub; // Sorry everybody! 

const publishKey = process.env.PN_PUB;
const subscribeKey =  process.env.PN_SUB;

const client = new PubNub({
  publishKey,
  subscribeKey,
  ssl: true,
});

client.addListener({
  message: function(message) {
    console.log(_uuid);
    console.log(message);
  }
});

let toStamp = (token) => Math.ceil(token/10000); 
// This function returns a version of the current time
// with an offset calibrated to PubNub's timestamp, for
// near perfect synchronization between machines
function _getServerTimeDelta() {
  let _resolveDelta;
  const _timePromise = new Promise(r => _resolveDelta = r);
  client.time((_, { timetoken }) => {
    const serverTime = toStamp(timetoken);
    _serverTimeDelta = Date.now()-serverTime;
    _resolveDelta(_serverTimeDelta);
  });
  return _timePromise;
}


function uuid() { // Public Domain/MIT
    var d = Date.now();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}
/*
  This is crap, but is JUST for simple
    sync.
 */

let _userHash = null;
let _uuid = uuid();
let _onReady = [() => {}];
let _serverTimeDelta;
const clientWrapper = window.stateBus = {
  _client: client,
  get userHash() { return _userHash },
  addListener(applyFunc) {
    client.addListener({
      message: ({ timetoken, message }) => {
        const timestamp = toStamp(timetoken);
        const { state, uuid } = message;
        if (uuid === _uuid) return;
        applyFunc({ state, timestamp });
      },
    });
  },
  onReady(func) {
    _onReady.push(func);
  },
  setUser(userHash) {
    _userHash = userHash;
    client.subscribe({
      channels: [userHash]
    });
    // Note: this is running before onReady;
    // any streams should be assembled *within*
    // onReady, allowing $stateBus.now() to be synchronous
    // 
    // If you're reading this, the exception is $SyncBus.load().
    // which should probably be forced to only resolve in onReady,
    // independent of what the caller does.
    
    console.log(typeof _getServerTimeDelta())
    _getServerTimeDelta().then(serverTimeDelta => {
      _serverTimeDelta = serverTimeDelta;
      _onReady.forEach(fn => fn())
    });
  },
  load(applyFunc) {
    console.log('what the fuck! TRYING TO LOAD')
    if (!_userHash) throw new Error('Must set user with setUser!')
    client.history({ 
      channel: _userHash,
      count: 1
    }, (_, res) => {
      if (typeof applyFunc === 'function') {
        if (!res.messages.length) {
          console.warn('WARNING: No messages in PubNub, not loading state');
           return;
        }
        const { timetoken, entry: { state } } = res.messages[0];
        const timestamp = toStamp(timetoken);
        applyFunc({ state, timestamp }); 
      }
    });
  },
  post(state) {
    if (!_userHash) throw new Error('Must set user with setUser!')
    client.publish({
      message: { state, uuid: _uuid },
      channel: _userHash,
    });
  },
  resume() {
    client.reconnect();
  },
  now() {
    if (!_serverTimeDelta) {
      console.warn('WARNING: $syncBar.now() called too early, returning system time')
      return Date.now();
    }
    return Date.now()-_serverTimeDelta;

  }
};
export default clientWrapper