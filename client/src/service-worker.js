// function showNotification() {
//   Notification.requestPermission(function(result) {
//     if (result === 'granted') {
//       navigator.serviceWorker.ready.then(function(registration) {
//         console.error('notification')
        // registration.showNotification('Vibration Sample', {
        //   body: 'Buzz! Buzz!',
        //   icon: '../images/touch/chrome-touch-icon-192x192.png',
        //   vibrate: [200, 100, 200, 100, 200, 100, 200],
        //   tag: 'vibration-sample'
        // });
//       });
//     }
//   });
// }



self.addEventListener('install', function(event) {
  self.skipWaiting();
  // event.waitUntil(self.skipWaiting);
})

self.addEventListener('activate', function(event) {
  self.clients.claim();
  console.log('################ activated');
  // self.registration.showNotification('Vibration Sample', {
  //   body: 'Buzz! Buzz!',
  //   icon: '../images/touch/chrome-touch-icon-192x192.png',
  //   vibrate: [200, 100, 200, 100, 200, 100, 200],
  //   tag: 'vibration-sample'
  // });
  // showNotification();
  // event.waitUntil(self.clients.claim());
});

self.addEventListener('message', function(event) {
  console.log("Well, I received a fucking message, now what?");
  self.registration.showNotification('Vibration Sample', {
    body: 'Message Posted Waiting!',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    // tag: 'vibration-sample'
  });

  setTimeout(() => {
    self.registration.showNotification('Hey babay!', {
      body: 'WAT WAT!?!?',
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      // tag: 'vibration-sample'
    });
  }, 5000);
})