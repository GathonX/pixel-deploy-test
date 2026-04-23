
import axios from 'axios';

// ➔ Axios sans intercepteur pour les requêtes pures
const plain = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // ⚡ PAS de /api ici
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true, // Obligatoire pour Sanctum
});

export default plain;
