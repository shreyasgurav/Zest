// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getAuth} from "firebase/auth";
import {getFirestore} from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
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

export const auth=getAuth();
export const db=getFirestore(app);
export default app;