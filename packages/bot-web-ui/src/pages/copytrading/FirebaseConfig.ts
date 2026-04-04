import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// User Integrated Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDVanWrEJkH6_79ORmRfQ_wrZetsb0X9XA",
  authDomain: "copytrading-9ac67.firebaseapp.com",
  projectId: "copytrading-9ac67",
  storageBucket: "copytrading-9ac67.firebasestorage.app",
  messagingSenderId: "161196390335",
  appId: "1:161196390335:web:50e9cda88dfe6cbe97530a",
  measurementId: "G-N3NYXGC86R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
