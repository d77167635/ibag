import { FormEvent, useState } from "react";
import { api } from "../api/backend";
import { supabase } from "../api/supabase";
import { IrisMark } from "./IrisMark";
import "../styles/iris-assistant.css";

type Message={role:"iris"|"user";text:string;state?:string};
const starters=["What's happening with my money?","Why did my spending change?","How much is safe to spend?","Explain my cash flow","What does Plaid Transactions do?"];
const isPlaidQuestion=(q:string)=>/\bplaid\b|financial institution connection|plaid product|plaid service|plaid api|plaid link|item state|plaid check/i.test(q);

export function IrisAssistant(){
 const [open,setOpen]=useState(false);const [question,setQuestion]=useState("");const [busy,setBusy]=useState(false);const [messages,setMessages]=useState<Message[]>([]);
 async function ask(value=question){const text=value.trim();if(!text||busy)return;setQuestion("");setOpen(true);setMessages(m=>[...m,{role:"user",text}]);setBusy(true);try{
   if(isPlaidQuestion(text)){
    const {data}=await supabase.auth.getSession();const r=await fetch(`${import.meta.env.VITE_BACKEND_URL}/iris/plaid-knowledge`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${data.session?.access_token??""}`},body:JSON.stringify({question:text})});if(!r.ok)throw new Error("Iris could not retrieve Plaid public knowledge");const result=await r.json();const records=result.records??[];const answer=records.length?`I found ${records.length} relevant official-public Plaid knowledge record${records.length===1?"":"s"}. ${records.slice(0,5).map((x:any)=>`${x.name}: ${x.description} How: ${x.how_it_works} Iris mapping: ${(x.iris_capabilities??[]).join(", ")||"none"}.`).join(" ")} This is educational product knowledge, not evidence that the capability or its data was observed for your account.`:"I do not currently have a matching public Plaid knowledge record. I will not invent a product or service description.";setMessages(m=>[...m,{role:"iris",text:answer,state:"public Plaid knowledge"}]);
   }else{const result=await api.askIris(text,{surface:window.location.pathname});setMessages(m=>[...m,{role:"iris",text:result.answer,state:result.evidence_state}]);}
  }catch(error){setMessages(m=>[...m,{role:"iris",text:error instanceof Error?error.message:"Iris could not complete that question."}]);}finally{setBusy(false);}}
 function submit(event:FormEvent){event.preventDefault();void ask();}
 return <><button className="iris-assistant-orb" onClick={()=>setOpen(!open)} aria-label="Ask Iris"><IrisMark size={28} color="#fff"/><span>Iris</span></button>{open&&<section className="iris-assistant" aria-label="Iris financial assistant"><header><div className="iris-assistant-title"><IrisMark size={24} color="#fff"/><div><strong>Iris</strong><small>Your financial intelligence</small></div></div><button onClick={()=>setOpen(false)} aria-label="Close Iris">×</button></header><div className="iris-assistant-body">{!messages.length&&<div className="iris-assistant-welcome"><span>ASK IRIS ANYTHING</span><h2>What do you want to understand?</h2><p>Ask about your observed financial evidence, Iris interpretations, or publicly documented Plaid products and services.</p><div className="iris-assistant-starters">{starters.map(s=><button key={s} onClick={()=>void ask(s)}>{s}</button>)}</div></div>}{messages.map((m,i)=><div key={i} className={`iris-assistant-message ${m.role}`}><div>{m.text}</div>{m.role==="iris"&&<small>{m.state?`${m.state.replace(/_/g," ")} · evidence-grounded`:"Iris"}</small>}</div>)}{busy&&<div className="iris-assistant-message iris"><div className="iris-assistant-thinking"><i/><i/><i/></div><small>Reasoning from available evidence…</small></div>}</div><form onSubmit={submit} className="iris-assistant-input"><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask Iris…" maxLength={2000}/><button disabled={busy||!question.trim()}>Ask</button></form></section>}</>;
}
