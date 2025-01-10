import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB7Er7lujXysZ_3J2seIoas3lAX1PAZRKE",
  authDomain: "zest-62191.firebaseapp.com",
  projectId: "zest-62191",
  storageBucket: "zest-62191.firebasestorage.app",
  messagingSenderId: "475534986851",
  appId: "1:475534986851:web:49a11fe3f50b7ee7237256"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, app };