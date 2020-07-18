/*
  This was cobbled together in a frenzy in a pug script tag and should
  be rewritten. Works, though!

 */

import { fetch } from 'whatwg-fetch';
// import http from 'stream-http';
// window.http = http;

import fetchStream from 'fetch-readablestream';
import $syncBus from './pubnub';

import md5 from 'js-md5';

window.md5 = md5;
window.fetchStream = fetchStream;

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

function streamPomsheet(onFirstFunc) {
  return fetchStream('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      "Dropbox-API-Arg": JSON.stringify({ path: pomsheet }),
      'Content-Type': 'application/octet-stream',
    }
  }).then(res => {
    return handleTextStream(res.body, onFirstFunc);
  });
}

window.streamPomsheet = streamPomsheet

const getAccessTokenFromUrl = _ => parseQueryString(window.location.hash).access_token;

const POMSHEET_PATH = window.pomsheet = '/apps/vicara/2017 pomodoro.txt';
const POMSHEET_FOLDER = '/apps/vicara/';

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
      handleResult({ file: reader.result, content_hash: res.content_hash });
    } 
    reader.readAsText(res.fileBlob);
  })
}

let lastContentHash = null;
function watchForChanges(path, runner, afterWatchFail) {
  return dropbox.filesListFolder({ path })
  .then(({ cursor }) => { 
    return dropbox.filesListFolderLongpoll({ cursor }) 
    .then(_ => dropbox.filesListFolderContinue({ cursor }) )
    .then((res) => {
      const entries = res.entries;
      console.log(entries);
      window.entries = entries;
      const { content_hash } = 
        entries.filter(({ path_lower }) => path_lower === POMSHEET_PATH)[0] || {};
      if (!content_hash) {
        console.warn('false alarm... not running runner')
      } else {
        runner(content_hash); // note: takes no arg because downloadAndRead
      }
      return watchForChanges(path, runner, afterWatchFail);
    });
  })
  .catch(err => {
    console.warn('Long poll failed. Waiting for heartbeat and refreshing.' + err);
    return afterWatchFail().then(_ => {
      console.warn('BACK ONLINE. Restarting watcher');
      runner();
      return watchForChanges(path, runner, afterWatchFail);
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
function handleLogin(onFirstFunc, onCompleteFunc, waitForOnline) {
  const clientId = process.env.DROPBOX_CLIENT;
  
  // FUCK, I hate when I code like this!
  _s.rawPomsheet = 'In handleLong(); about to check for access token';
  accessToken = window.accessToken = loadTokenOrLogin(clientId);
  dropbox = window.dropbox = new Dropbox.Dropbox({ accessToken, fetch });

  loadOrGenerateUserHash(clientId).then(hash => {
    $syncBus.setUser(hash);
    if (!window.ReadableStream || !window.Symbol) {
      fetchAndWatchPomsheet(onCompleteFunc, waitForOnline);  
    } else {
      streamAndWatchPomsheet(onFirstFunc, onCompleteFunc, waitForOnline);
    }
  });  
}

function loadOrGenerateUserHash(clientId = process.env.DROPBOX_CLIENT) {
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

function streamAndRead(onFirstFunc, onCompleteFunc, content_hash) {
  /*
    The fetchStream library seems to swallow the Dropbox headers,
    so this performs a small workaround by retrieving file metadata
    if the content_hash isn't passed as an arg.

    This function is called in two cases:
      1. When checking for the file ad hoc
      2. When streaming the file because the long-poll has returned,
        in which case the content_hash is provided by the caller.

   */
  console.log('called streamAndRead', content_hash);
  const hashPromise = content_hash ? 
    Promise.resolve({ content_hash }) : 
    dropbox.filesGetMetadata({ path: POMSHEET_PATH });
  return streamPomsheet(onFirstFunc).then(text => {
    // onFirstFunc(text);
    return hashPromise.then(({ content_hash }) => {
      const result = { content_hash, file: text };
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

function checkForUpdate(lastHash) {
  return dropbox.filesGetMetadata({ path: POMSHEET_PATH })
     .then(({ content_hash }) => ({ isUpdated: (content_hash !== lastHash), content_hash }));
}

export default { handleLogin, fetchPomsheet, fetchAndWatchPomsheet, checkForUpdate, streamPomsheet, $syncBus }