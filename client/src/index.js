import React, { Component } from 'react';
import { Provider } from 'mobx-react';
import ReactDOM from 'react-dom';
import stores from './stores';

import App from './components/App';
// Get rid of this if it isn't going to be used
import { BrowserRouter } from 'react-router-dom';


// 2021: ServiceWorker code was for beeps, which are now handled via
// Cordova on mobile.
// Commenting out in case it makes sense to re-implement for desktop.

// window.unregister = function unregisterServiceWorker() {
//   return navigator.serviceWorker.getRegistrations().then(regs => {
//     for (let reg of regs) {
//       reg.unregister();
//     }
//   });
// }

// function registerServiceWorker() {
//   Notification.requestPermission();
//   navigator.serviceWorker
//       .register('/service-worker.js')
//       .then(registration => {
//           console.log(
//               "ServiceWorker registered with scope:",
//               registration.scope,
//           );
//       })
//       .catch(e => console.error("ServiceWorker failed:", e));
// }

// if (navigator && navigator.serviceWorker && window.Notification) {
//   registerServiceWorker();
// }

ReactDOM.render(
  <Provider {...stores}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
  , document.getElementById('app')
);


