import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDSvhTWga6PLbbIffAsP0nULJ5luirtFXE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "redycakes-studio.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "redycakes-studio",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "redycakes-studio.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "255605316352",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:255605316352:web:e9d15bc3c8ab5d2ee1b1e5",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
