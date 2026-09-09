import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { Me } from '@create-for-christ/contracts';
import { ApiError, getMe } from './api';
export function useMe(userId?: string) {
  const [me,setMe] = useState<Me|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [unauthorized,setUnauthorized] = useState(false);
  const [version,setVersion] = useState(0);
  useFocusEffect(useCallback(() => {
    if(!userId){setMe(null);setLoading(false);return;}
    let active=true;const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),10000);
    setMe(null);setLoading(true);setError('');setUnauthorized(false);
    getMe(controller.signal).then(value=>{if(active)setMe(value);}).catch(cause=>{
      if(active){setError(cause instanceof ApiError ? cause.message : 'Keine Verbindung. Bitte versuche es erneut.');setUnauthorized(cause instanceof ApiError && cause.status===401);}
    }).finally(()=>{clearTimeout(timer);if(active)setLoading(false);});
    return ()=>{active=false;clearTimeout(timer);controller.abort();};
  },[userId,version]));
  return {me,loading,error,unauthorized,retry:()=>setVersion(value=>value+1)};
}
