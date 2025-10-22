// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA4Z_Mwz3YNpDWZBi9-cNivrv4J_1NyjtE",
  authDomain: "outlay-9c5b5.firebaseapp.com",
  projectId: "outlay-9c5b5",
  storageBucket: "outlay-9c5b5.firebasestorage.app",
  messagingSenderId: "490894783411",
  appId: "1:490894783411:web:34e4fc4f26ec7949e3d1c6",
  measurementId: "G-F2WGEMGJ8P"
};

// Initialize Firebase
const app = getApps().length ===0 ? initializeApp(firebaseConfig) : getApp() ;
const auth = getAuth(app);
auth.useDeviceLanguage();
export{auth};
