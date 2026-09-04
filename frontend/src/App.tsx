import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./api/supabase";
import { Auth } from "./components/Auth";
import { IrisApplication } from "./components/IrisApplication";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setCheckedAuth(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => listener.subscription.unsubscribe();
  }, []);
  if (!checkedAuth) return null;
  if (!session) return <Auth />;
  return <IrisApplication />;
}
