// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB7Er7lujXysZ_3J2seIoas3lAX1PAZRKE",
  authDomain: "zest-62191.firebaseapp.com",
  projectId: "zest-62191",
  storageBucket: "zest-62191.firebasestorage.app",
  messagingSenderId: "475534986851",
  appId: "1:475534986851:web:49a11fe3f50b7ee7237256"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log("Firebase app initialized:", app);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Add debug logs
console.log("Firestore initialized:", db);
console.log("Auth initialized:", auth);
console.log("Storage initialized:", storage);

export { auth, db, storage };