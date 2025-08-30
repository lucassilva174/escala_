// firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyAU_gns7SaNEA4B8HizeASKw-MxJQwb0kM",
  authDomain: "louvor-sara.firebaseapp.com",
  projectId: "louvor-sara",
  storageBucket: "louvor-sara.appspot.com",
  messagingSenderId: "28410852377",
  appId: "1:28410852377:web:208881d6ab87a5cbea2688",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/img/icon.png",
  });
});
