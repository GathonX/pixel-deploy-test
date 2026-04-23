import React, { useEffect } from 'react';
import axios from '@/services/plain'; // ou '@/services/api' selon ton projet

export default function DebugAuthCheck() {
  useEffect(() => {
    axios
      .get('/api/debug/auth-check')
      .then(res => {
        console.log('✅ Auth Sanctum OK :', res.data);
      })
      .catch(err => {
        if (err.response) {
          console.error('❌ Auth Sanctum ERROR :', err.response.status, err.response.data);
        } else {
          console.error('❌ Auth Sanctum Request Failed', err);
        }
      });
  }, []);

  return (
    <div className="text-xs text-gray-500 mt-2">
      [Debug] Vérification de l’utilisateur en cours… (voir console)
    </div>
  );
}
