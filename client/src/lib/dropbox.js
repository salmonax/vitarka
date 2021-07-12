/*
  This was cobbled together in a frenzy in a pug script tag and should
  be rewritten. Works, though!

 */
import { fetch } from 'whatwg-fetch';

import fetchStream from 'fetch-readablestream';

// OH NOO! Why the FUCK is the syncBus imported at THIS level?!
import $syncBus from './pubnub';

import md5 from 'js-md5';

window.md5 = md5;
window.fetchStream = fetchStream;

const CLIENT_ID = process.env.DROPBOX_CLIENT;

/*
  "callbacks" is POJO with the following keys:
      first: func for the first chunk
      end: func for after the stream is complete
   TODO: work out the content_hash issue!
 */
function handleTextStream(readableStream, onFirstFunc) {
  const reader = readableStream.getReader();
  let textDump = '';
  let count = -1;
  let firstTime;

  const readText = (value) => new Promise((resolve) => {
    const _reader = new FileReader();
    _reader.onload = () => resolve(_reader.result);
    _reader.readAsText(new Blob([value.buffer]));
  });

  function pump() {
    return reader.read().then(({ value, done }) => {
      count++;
      if (done) {
        return textDump;
      }
      return readText(value).then(text => {
        if (count === 0) {
          if (typeof onFirstFunc === 'function') {
            onFirstFunc(text);
          }
        }
        textDump += text;
        return pump();
      });
    });
  }

  return pump();
}

function streamPomsheet(onFirstFunc, filePath = POMSHEET_PATH) {
  return fetchStream('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      "Dropbox-API-Arg": JSON.stringify({ path: filePath }),
      'Content-Type': 'application/octet-stream',
    }
  }).then(res => {
    return handleTextStream(res.body, onFirstFunc);
  });
}
function streamScratch(onFirstFunc, filePath = SCRATCH_PATH) {
  return streamPomsheet(onFirstFunc, filePath);
}

window.streamPomsheet = streamPomsheet

const getAccessTokenFromUrl = _ => parseQueryString(window.location.hash).access_token;

// 2020: Dude, get this out of here, what the hell!?
const POMSHEET_PATH = window.pomsheet = '/apps/vicara/2017 pomodoro.txt';
const POMSHEET_FOLDER = '/apps/vicara/';
const SCRATCH_PATH = '/apps/vicara/scratch.txt';
const SCRATCH_FOLDER = '/apps/vicara/';


const $token = {
  load: _ => {
    _s.rawPomsheet = 'trying to load localStorage item';
    return window.localStorage.getItem('__vicara__');
   },
  save:  token => {
    history ?
      history.replaceState(null, null, ' ') :
      location.hash.replace(/^#/, '')
    localStorage.setItem('__vicara__', token);
    return token;
  },
  logout: _ => {
    localStorage.removeItem('__vicara__');
  },
  login: clientId => {
    _s.rawPomsheet = 'trying to run login'
    const prebox = new Dropbox.Dropbox({ clientId, fetch });
    _s.rawPomsheet = 'successfully instantiated Dropbox client';
    // console.warn(window.location.href);
    window.location = prebox.getAuthenticationUrl(window.location.href);
  }
};

function loadTokenOrLogin(clientId) {
  const storageToken = $token.load();
  if (storageToken) return storageToken;
  _s.rawPomsheet = 'No token found. Trying to do dropbox business';
  const urlToken = getAccessTokenFromUrl();
  if (urlToken) return $token.save(urlToken);
  _s.rawPomsheet = 'Successfully ran getAccesToken and $token.save';
  $token.login(clientId);
}


const oldReadFunc = (readerResult) => document.getElementById('pomsheet').innerHTML = readerResult;

function downloadAndRead(pomsheetPath, handleResult = oldReadFunc) {
  return dropbox.filesDownload({ path: pomsheetPath })
  .then(res => {
    const reader = new FileReader();
    window.res = res
    reader.onloadend = () => {
      // _s.rawPomsheet = 'reader has loaded';
      handleResult({ file: reader.result, content_hash: res.content_hash, rev: res.rev });
    }
    reader.readAsText(res.fileBlob);
  })
}

let lastContentHash = null;
function watchForChanges(path, runner, afterWatchFail, filePath = POMSHEET_PATH) {
  return dropbox.filesListFolder({ path })
  .then(({ cursor }) => {
    return dropbox.filesListFolderLongpoll({ cursor })
    .then(_ => dropbox.filesListFolderContinue({ cursor }) )
    .then((res) => {
      const entries = res.entries;
      console.log(entries);
      window.entries = entries;
      const { content_hash, rev } =
      entries.filter(({ path_lower }) => path_lower === filePath)[0] || {};
      if (!content_hash) {
        console.warn('DropboxService.watchForChanges: no content_hash... not running runner')
      } else {
        runner({ content_hash, rev });
      }
      return watchForChanges(path, runner, afterWatchFail, filePath);
    });
  })
  .catch(err => {
    console.warn('Long poll failed. Waiting for heartbeat and refreshing.' + err);
    return afterWatchFail().then(_ => {
      runner();
      return watchForChanges(path, runner, afterWatchFail, filePath);
    });
  });
}

// move to utilities if I'm going to use this
function parseQueryString(str) {
  var ret = Object.create(null);

  if (typeof str !== 'string') {
    return ret;
  }

  str = str.trim().replace(/^(\?|#|&)/, '');

  if (!str) {
    return ret;
  }

  str.split('&').forEach(function (param) {
    var parts = param.replace(/\+/g, ' ').split('=');
    // Firefox (pre 40) decodes `%3D` to `=`
    // https://github.com/sindresorhus/query-string/pull/37
    var key = parts.shift();
    var val = parts.length > 0 ? parts.join('=') : undefined;

    key = decodeURIComponent(key);

    // missing `=` should be `null`:
    // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
    val = val === undefined ? null : decodeURIComponent(val);

    if (ret[key] === undefined) {
      ret[key] = val;
    } else if (Array.isArray(ret[key])) {
      ret[key].push(val);
    } else {
      ret[key] = [ret[key], val];
    }
  });

  return ret;
}

// Terrible, please just change all this stuff
// The callback is for file updates... so.. yeah.

let dropbox, accessToken;
/**
 * Sigh, where do I begin with this stuff...
 * 1. handleLogin literally calls two proprietary functions that
 *    only watch the pomodoro sheet? How am I supposed to expect that
 *    it's doing so much?
 * 2. We're *literally* setting observables on the MobX store from here?
 *    I'm not sure that it's really necessary to keep things that way,
 *    but it'd be pretty great to get rid of it *quickly*
 */
function handleLogin(onFirstFunc, onCompleteFunc, waitForOnline, onFirstScratchFunc, onCompleteScratchFunc) {
  const clientId = CLIENT_ID;

  // FUCK, I hate when I code like this!
  _s.rawPomsheet = 'In handleLong(); about to check for access token';

  // Gross, but the next function will cause the page to reload
  // preventing anything that follows from loading
  accessToken = window.accessToken = loadTokenOrLogin(clientId);

  dropbox = window.dropbox = new Dropbox.Dropbox({ accessToken, fetch });

  loadOrGenerateUserHash(clientId).then(hash => {
    $syncBus.setUser(hash);
    if (!window.ReadableStream || !window.Symbol) {
      fetchAndWatchPomsheet(onCompleteFunc, waitForOnline);
      fetchAndWatchScratch(onCompleteScratchFunc, waitForOnline);
    } else {
      streamAndWatchPomsheet(onFirstFunc, onCompleteFunc, waitForOnline);
      streamAndWatchScratch(onFirstScratchFunc, onCompleteScratchFunc, waitForOnline);
    }
  });
}

function loadOrGenerateUserHash(clientId = CLIENT_ID) {
  const userHash = window.localStorage.getItem('__bindu__');
  if (userHash) return Promise.resolve(userHash);
  return dropbox.usersGetCurrentAccount().then(result => {
    const hash = md5(result.account_id+clientId);
    window.localStorage.setItem('__bindu__', hash);
    return hash;
  });
}

function fetchPomsheet(cb) {
  return downloadAndRead(POMSHEET_PATH, cb);
}
function fetchScratch(cb) {
  return downloadAndRead(SCRATCH_PATH, cb);
}

function streamAndRead(onFirstFunc, onCompleteFunc, metadata, filePath = POMSHEET_PATH) {
  /*
    The fetchStream library seems to swallow the Dropbox headers,
    so this performs a small workaround by retrieving file metadata
    if the content_hash isn't passed as an arg.

    This function is called in two cases:
      1. When checking for the file ad hoc
      2. When streaming the file because the long-poll has returned,
        in which case the content_hash is provided by the caller.

   */
  console.log('called streamAndRead', metadata, filePath);
  const hashPromise = metadata ?
    Promise.resolve({ content_hash: metadata.content_hash, rev: metadata.rev }) :
    dropbox.filesGetMetadata({ path: filePath });
  return streamPomsheet(onFirstFunc, filePath).then(text => {
    // onFirstFunc(text);
    return hashPromise.then(({ content_hash, rev }) => {
      const result = { content_hash, rev, file: text };
      onCompleteFunc(result);
      return result;
    });
  });
}

function streamAndWatchPomsheet(onFirstFunc, onCompleteFunc, afterWatchFail) {
  streamAndRead(onFirstFunc, onCompleteFunc);
  watchForChanges(POMSHEET_FOLDER, streamAndRead.bind(null, onFirstFunc, onCompleteFunc), afterWatchFail);
}

function fetchAndWatchPomsheet(cb, afterWatchFail) {
  downloadAndRead(POMSHEET_PATH, cb);
  watchForChanges(POMSHEET_FOLDER, downloadAndRead.bind(null, POMSHEET_PATH, cb), afterWatchFail);
}

// Urgh, not DRY; don't care right now
// TODO: For the love of god, please rewrite all this stuff... it's the worst thing
// in the entire application!
function streamAndWatchScratch(onFirstFunc, onCompleteFunc, afterWatchFail) {
  streamAndRead(onFirstFunc, onCompleteFunc, undefined, SCRATCH_PATH);
  watchForChanges(SCRATCH_FOLDER, streamAndRead.bind(null, onFirstFunc, onCompleteFunc, undefined, SCRATCH_PATH), afterWatchFail, SCRATCH_PATH);
}

function fetchAndWatchScratch(cb, afterWatchFail) {
  downloadAndRead(SCRATCH_PATH, cb);
  watchForChanges(SCRATCH_FOLDER, downloadAndRead.bind(null, SCRATCH_PATH, cb), afterWatchFail, SCRATCH_PATH);
}


function checkForUpdate(lastPomsheetHash, lastScratchHash, filePath = POMSHEET_PATH, scratchPath = SCRATCH_PATH) {
  const pomsheetCheck = dropbox.filesGetMetadata({ path: filePath });
  const scratchCheck = dropbox.filesGetMetadata({ path: scratchPath });
  return Promise.all([pomsheetCheck, scratchCheck]).then(([pomsheet, scratch]) => {
    return {
      pomsheet: {
        isUpdated: (pomsheet.content_hash !== lastPomsheetHash),
        content_hash: pomsheet.content_hash,
      },
      scratch: {
        isUpdated: (scratch.content_hash !== lastScratchHash),
        content_hash: scratch.content_hash,
      },
    };
  });
}

export default {
  handleLogin,
  fetchPomsheet,
  streamPomsheet,
  fetchScratch,
  streamScratch,
  fetchAndWatchPomsheet,
  checkForUpdate,
  $syncBus,
}