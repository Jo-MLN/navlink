importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js","https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
firebase.initializeApp({apiKey:"AIzaSyDktsEtA23zVAJDtXt59d6AllOl13aGd60",authDomain:"airsoft-trajet.firebaseapp.com",projectId:"airsoft-trajet",storageBucket:"airsoft-trajet.firebasestorage.app",messagingSenderId:"796468093664",appId:"1:796468093664:web:76f9b63f75f49fdcbaa685"});
firebase.messaging().onBackgroundMessage(p=>{const d=p.data||{};self.registration.showNotification(d.title||"NAV-LINK",{body:d.body||""})});
