import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./api/supabase";
import { Auth } from "./components/Auth";
import { IrisAssistant } from "./components/IrisAssistant";
import { IrisCommandSurface } from "./components/IrisCommandSurface";
import { PlaidCommandSurface } from "./components/PlaidCommandSurface";
import "./iris-command-deck.css";
import "./iris-hd.css";
import "./styles/data-semantics.css";

const accountControlStyle: React.CSSProperties={position:"fixed",right:20,bottom:18,zIndex:120,display:"flex",alignItems:"center",gap:9,padding:"7px 9px 7px 11px",border:"1px solid rgba(255,255,255,.11)",borderRadius:10,background:"rgba(7,9,14,.92)",boxShadow:"0 10px 30px rgba(0,0,0,.28)"};
const accountEmailStyle:React.CSSProperties={maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#778198",font:"600 8px/1 Inter,system-ui,sans-serif"};
const signOutStyle:React.CSSProperties={border:"1px solid rgba(255,255,255,.12)",borderRadius:7,padding:"6px 9px",background:"rgba(255,255,255,.035)",color:"#c5ccda",font:"700 8px/1 Inter,system-ui,sans-serif",letterSpacing:".06em",cursor:"pointer"};
function readWorkspace(){const hash=window.location.hash.replace(/^#/,"");if(hash==="workspace/plaid")return{workspace:"plaid",irisPage:"iris"};if(hash.startsWith("workspace/iris/"))return{workspace:"iris",irisPage:hash.slice("workspace/".length)||"iris"};if(hash==="workspace/iris")return{workspace:"iris",irisPage:"iris"};return{workspace:"iris",irisPage:"iris"}}
function isRecoveryUrl(){const p=new URLSearchParams(window.location.search),h=new URLSearchParams(window.location.hash.replace(/^#/,""));return p.get("type")==="recovery"||h.get("type")==="recovery"||p.has("code")}
export default function App(){const[session,setSession]=useState<Session|null>(null),[checkedAuth,setCheckedAuth]=useState(false),[recovery,setRecovery]=useState(isRecoveryUrl()),initial=readWorkspace(),[workspace,setWorkspace]=useState(initial.workspace),[irisPage,setIrisPage]=useState(initial.irisPage),[signingOut,setSigningOut]=useState(false);
 useEffect(()=>{let active=true;const recoveryUrl=isRecoveryUrl();supabase.auth.getSession().then(({data})=>{if(!active)return;setSession(data.session);if(recoveryUrl&&data.session)setRecovery(true);setCheckedAuth(true)});const{data:listener}=supabase.auth.onAuthStateChange((event,newSession)=>{if(!active)return;if(event==="PASSWORD_RECOVERY")setRecovery(true);setSession(newSession)});const sync=()=>{const n=readWorkspace();setWorkspace(n.workspace);setIrisPage(n.irisPage)};window.addEventListener("hashchange",sync);window.addEventListener("popstate",sync);return()=>{active=false;listener.subscription.unsubscribe();window.removeEventListener("hashchange",sync);window.removeEventListener("popstate",sync)}} ,[]);
 const navigate=(next:string,page="iris")=>{const hash=next==="plaid"?"#workspace/plaid":`#workspace/${page}`;if(window.location.hash!==hash)window.location.hash=hash.slice(1);else{const n=readWorkspace();setWorkspace(n.workspace);setIrisPage(n.irisPage)}};
 const signOut=async()=>{if(signingOut)return;setSigningOut(true);const{error}=await supabase.auth.signOut({scope:"local"});if(error){setSigningOut(false);return}window.location.replace("/")};
 if(!checkedAuth)return null;if(recovery&&session)return <Auth recovery onRecoveryComplete={()=>setRecovery(false)}/>;if(!session)return <Auth/>;
 const account=<div className="ia-account-control" style={accountControlStyle}><span aria-label="Signed-in account" style={accountEmailStyle}>{session.user.email??"Signed in"}</span><button aria-label="Sign out" style={signOutStyle} onClick={()=>void signOut()} disabled={signingOut}>{signingOut?"Signing out…":"Sign out"}</button></div>;
 const switcher=<div className="ia-mode-switch" role="navigation" aria-label="Workspace switcher"><button type="button" className={workspace==="iris"?"active":""} onClick={()=>navigate("iris")}>Iris</button><button type="button" className={workspace==="plaid"?"active":""} onClick={()=>navigate("plaid")}>Plaid</button></div>;
 if(workspace==="plaid")return <div className="app-workspace app-workspace-plaid"><PlaidCommandSurface/>{switcher}{account}<IrisAssistant/></div>;
 return <div className="app-workspace app-workspace-iris"><IrisCommandSurface page={irisPage} go={(p)=>navigate("iris",p)}/>{switcher}{account}<IrisAssistant/></div>;
}