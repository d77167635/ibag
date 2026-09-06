import { useMemo, useState } from "react";

type EvidenceRow={id?:string;item_id?:string;product?:string;source_domain?:string;account_id?:string;plaid_transaction_id?:string;raw_response?:unknown;[key:string]:unknown};
type FieldStat={path:string;present:number;nulls:number;sample?:unknown};

const label=(s:string)=>s.replace(/\[\]/g,"[]").replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
const moneyKeys=new Set(["amount","current_balance","available_balance","credit_limit","limit"]);
function flatten(value:unknown,path:string,rows:Map<string,FieldStat>,depth=0){
 if(depth>14)return;
 const add=(p:string,v:unknown)=>{const x=rows.get(p)??{path:p,present:0,nulls:0};x.present++;if(v===null)x.nulls++;if(x.sample===undefined&&v!==null&&typeof v!=="object")x.sample=v;rows.set(p,x)};
 if(Array.isArray(value)){add(path,value);value.forEach(v=>flatten(v,`${path}[]`,rows,depth+1));return;}
 if(value&&typeof value==="object"){add(path,value);for(const [k,v] of Object.entries(value))flatten(v,path?`${path}.${k}`:k,rows,depth+1);return;}
 add(path,value);
}
function formatValue(v:unknown){if(v===undefined)return "missing";if(v===null)return "null";if(typeof v==="object")return Array.isArray(v)?`Array(${v.length})`:`Object(${Object.keys(v as object).length})`;return String(v);}

export function PlaidEvidenceBrowser({evidence=[],fieldInventory={}}:{evidence:EvidenceRow[];fieldInventory?:Record<string,any>}){
 const [q,setQ]=useState("");const [product,setProduct]=useState("all");const [open,setOpen]=useState<string|null>(null);const [raw,setRaw]=useState<string|null>(null);
 const products=useMemo(()=>[...new Set(evidence.map(r=>String(r.product??r.source_domain??"unknown")))].sort(),[evidence]);
 const filtered=useMemo(()=>evidence.filter(r=>(product==="all"||String(r.product??r.source_domain)===product)&&(!q||JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))),[evidence,product,q]);
 const fieldStats=useMemo(()=>{const m=new Map<string,FieldStat>();for(const r of filtered)flatten(r.raw_response,"",m);return [...m.values()].filter(x=>x.path).sort((a,b)=>a.path.localeCompare(b.path));},[filtered]);
 return <section className="plaid-panel full" style={{marginTop:12}}>
  <div className="panel-title"><div><span className="eyebrow">RAW PROVIDER EVIDENCE</span><h2>Complete Plaid evidence browser</h2><p>Every current observed provider record returned by the source surface remains inspectable. Nothing is promoted from capability to observation here.</p></div><strong>{filtered.length} records</strong></div>
  <div style={{display:"grid",gridTemplateColumns:"minmax(180px,1fr) minmax(160px,220px) auto",gap:10,marginBottom:12}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search every raw field and value…"/><select value={product} onChange={e=>setProduct(e.target.value)}><option value="all">All provider domains</option>{products.map(p=><option key={p} value={p}>{label(p)}</option>)}</select><span style={{alignSelf:"center",opacity:.75}}>DB observed: {evidence.length}</span></div>
  <div style={{display:"grid",gap:8}}>{filtered.map((r,i)=>{const key=String(r.id??`${r.product}-${r.account_id}-${r.plaid_transaction_id}-${i}`);const isOpen=open===key;return <article key={key} style={{border:"1px solid #2a3445",borderRadius:12,padding:12,background:"#171e2a"}}>
   <button type="button" onClick={()=>setOpen(isOpen?null:key)} style={{width:"100%",textAlign:"left",background:"transparent",border:0,color:"inherit",cursor:"pointer",display:"grid",gridTemplateColumns:"1fr auto",gap:8}}><div><b>{label(String(r.product??r.source_domain??"provider"))}</b><div style={{fontSize:12,opacity:.7}}>{r.plaid_transaction_id?`Transaction ${r.plaid_transaction_id}`:r.account_id?`Account ${r.account_id}`:r.item_id?`Item ${r.item_id}`:"Provider observation"} · {r.evidence_state?String(r.evidence_state):"observed"}</div></div><strong>{isOpen?"−":"+"}</strong></button>
   {isOpen&&<div style={{marginTop:10,display:"grid",gap:10}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}>{Object.entries(r).filter(([k])=>k!=="raw_response").map(([k,v])=><div key={k}><small style={{opacity:.65}}>{label(k)}</small><div style={{wordBreak:"break-word"}}>{formatValue(v)}</div></div>)}</div><div><button type="button" onClick={()=>setRaw(raw===key?null:key)}>{raw===key?"Hide raw Plaid response":"Show raw Plaid response"}</button>{raw===key&&<pre style={{maxHeight:480,overflow:"auto",whiteSpace:"pre-wrap",wordBreak:"break-word",marginTop:8,padding:12,borderRadius:8,background:"#0c111a"}}>{JSON.stringify(r.raw_response,null,2)}</pre>}</div></div>}
  </article>})}</div>
  {!filtered.length&&<div className="plaid-empty"><span>◌</span>No provider evidence matches the current filter.</div>}
  <div style={{marginTop:16,borderTop:"1px solid #2a3445",paddingTop:14}}><div className="panel-title"><div><span className="eyebrow">NESTED FIELD INVENTORY</span><h3>Fields actually observed in this selection</h3></div><b>{fieldStats.length}</b></div><p style={{opacity:.75}}>Field paths are calculated from the raw responses currently selected above. Presence, nulls, and examples are shown separately; absence is never treated as a provider assertion.</p><div style={{display:"grid",gap:4}}>{fieldStats.map(f=><div key={f.path} style={{display:"grid",gridTemplateColumns:"minmax(240px,2fr) 90px 80px minmax(120px,1fr)",gap:8,padding:"6px 8px",borderBottom:"1px solid #202a39"}}><code style={{wordBreak:"break-all"}}>{f.path}</code><span>present {f.present}</span><span>null {f.nulls}</span><span style={{wordBreak:"break-word",opacity:.8}}>{formatValue(f.sample)}</span></div>)}</div></div>
  <div style={{marginTop:14,borderTop:"1px solid #2a3445",paddingTop:12}}><b>Canonical inventory cross-check</b><div style={{display:"grid",gap:4,marginTop:6}}>{Object.entries(fieldInventory).map(([k,v]:any)=><div key={k}><span>{label(k)}: </span><b>{v?.field_count??0} top-level fields</b><span style={{opacity:.7}}> · {v?.source_observation_count??0} source observations</span></div>)}</div></div>
 </section>;
}
