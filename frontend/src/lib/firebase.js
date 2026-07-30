import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
};

const requiredConfigKeys = ["apiKey", "authDomain", "projectId", "appId"];
const firebaseMissingKeys = requiredConfigKeys.filter(
  (key) => !firebaseConfig[key]
);

let firebaseAuth = null;
let firebaseConfigError = "";

if (firebaseMissingKeys.length === 0) {
  const app = initializeApp(firebaseConfig);
  firebaseAuth = getAuth(app);
} else {
  firebaseConfigError = `Missing Firebase config: ${firebaseMissingKeys.join(", ")}`;
}

export { firebaseAuth, firebaseConfigError, firebaseMissingKeys };
