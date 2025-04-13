// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDQ9vrnadJfyC_ZwVtwqMsFXU5YvRXWrak",
    authDomain: "focusforge-6ab8d.firebaseapp.com",
    projectId: "focusforge-6ab8d",
    storageBucket: "focusforge-6ab8d.firebasestorage.app",
    messagingSenderId: "508689528512",
    appId: "1:508689528512:web:aa888370a04f6d8e565f25"
  };

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
