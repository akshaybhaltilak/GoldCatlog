import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';


const firebaseConfig = {
  apiKey: "AIzaSyB95ifKzozbFbw4I2EtCaqq36B-vWgxnnw",
  authDomain: "goldcatlog.firebaseapp.com",
  databaseURL: "https://goldcatlog-default-rtdb.firebaseio.com/",
  projectId: "goldcatlog",
  storageBucket: "goldcatlog.firebasestorage.app",
  messagingSenderId: "90898046577",
  appId: "1:90898046577:web:4492e80747143d782445d0",
  measurementId: "G-V1J9DJSM04"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);