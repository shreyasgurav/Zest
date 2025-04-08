import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics"; // Import analytics with isSupported check

const firebaseConfig = {
  apiKey: "AIzaSyB7Er7lujXysZ_3J2seIoas3lAX1PAZRKE",
  authDomain: "zest-62191.firebaseapp.com",
  projectId: "zest-62191",
  storageBucket: "zest-62191.firebasestorage.app",
  messagingSenderId: "475534986851",
  appId: "1:475534986851:web:49a11fe3f50b7ee7237256",
  measurementId: "G-XSS8QEY3PX", // Replace with your actual Measurement ID
};

let app;
let auth;
let db;
let storage;
let analytics = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log("Analytics initialized:", analytics);
    } else {
      console.warn("Analytics is not supported in this environment.");
    }
  }).catch(console.error);
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// Debug Logs
console.log("Firebase initialized:", app);
console.log("Firestore initialized:", db);
console.log("Auth initialized:", auth);
console.log("Storage initialized:", storage);

export { auth, db, storage, analytics };
