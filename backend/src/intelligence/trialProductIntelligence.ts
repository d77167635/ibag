import { supabaseAdmin } from "../config/supabase.js";

type RawObservation = { id:string; item_id:string; product:string; raw_response:any; evidence_state:string; acquired_at:string };
type ProductAuthority = { id:string; item_id:string; product:string; acquired_at:string };
export type IrisProductIntent = "overview"|"cash_flow"|"spending"|"liquidity"|"debt"|"roundups"|"anomaly"|"explanation"|"provider_data"|"unknown";
const CORE_PRODUCTS=new Set(["transactions","balance"]);
const REQUIRED:Record<IrisProductIntent,string[][]>={overview:[["transactions"],["balance"]],cash_flow:[["transactions"]],spending:[["transactions"]],liquidity:[["balance"],["transactions"]],debt:[["liabilities"],["balance"],["transactions"]],roundups:[["transactions"]],anomaly:[["transactions"]],explanation:[],provider_data:[],unknown:[]};
const OPTIONAL:Record<IrisProductIntent,string[][]>={overview:[["liabilities"],["assets","investments"],["statements"]],cash_flow:[["balance"],["statements"]],spending:[["balance"],["statements"]],liquidity:[],debt:[],roundups:[["balance"]],anomaly:[["balance"]],explanation:[],provider_data:[],unknown:[]};
export const COMBINATION_LIBRARY=[
 {key:"cash_flow_state",products:["transactions","balance"],analyses:["cash_flow","liquidity","forecasting"]},
 {key:"debt_liquidity",products:["liabilities","balance","transactions"],analyses:["debt_health","cash_flow_risk","liquidity"]},
 {key:"net_worth_state",products:["assets","investments","liabilities","balance"],analyses:["asset_position","portfolio","net_worth"]},
 {key:"statement_reconciliation",products:["statements","transactions","balance"],analyses:["statement_reconciliation","history","cash_flow"]},
 {key:"account_integrity",products:["auth","identity","balance"],analyses:["account_integrity","identity_context"]},
 {key:"behavior_and_forecast",products:["transactions","balance","statements"],analyses:["behavior","forecasting","history"]},
 {key:"full_financial_state",products:["transactions","balance","assets","investments","liabilities","statements","auth","identity"],analyses:["financial_state","net_worth","cash_flow","spending","debt_health","portfolio","history","account_integrity"]}
] as const;
/** Capability declarations are not execution proof. Only request paths below write consumption proof. */
const ACTUAL_CONSUMPTION:Record<IrisProductIntent,Record<string,string[]>>={overview:{transactions:["cash_flow","spending"],balance:["liquidity"]},cash_flow:{transactions:["cash_flow"]},spending:{transactions:["spending"]},liquidity:{transactions:["cash_flow"],balance:["liquidity"]},debt:{liabilities:["debt_health"],balance:["debt_health","liquidity"],transactions:["debt_trend","cash_flow"]},roundups:{transactions:["roundups"]},anomaly:{transactions:["anomalies"]},explanation:{},provider_data:{},unknown:{}};
export type ObservedByItem=Map<string,Set<string>>;
export function chooseIrisCombinations(observedByItem:ObservedByItem,intent:IrisProductIntent){
 const requiredGroups=REQUIRED[intent]??[];
 const required=requiredGroups.map(group=>({acceptable_products:group,satisfied_on_item:[...observedByItem.entries()].filter(([,p])=>group.some(x=>p.has(x))).map(([id])=>id)}));
 const optional=(OPTIONAL[intent]??[]).map(group=>({acceptable_products:group,satisfied_on_item:[...observedByItem.entries()].filter(([,p])=>group.some(x=>p.has(x))).map(([id])=>id)}));
 const requiredItemIds=[...observedByItem.entries()].filter(([,p])=>requiredGroups.every(group=>group.some(x=>p.has(x)))).map(([id])=>id);
 const globallyObserved=new Set([...observedByItem.values()].flatMap(p=>[...p]));
 const candidates=COMBINATION_LIBRARY.map(combo=>{const matchingItems=[...observedByItem.entries()].filter(([,p])=>combo.products.every(x=>p.has(x))).map(([id])=>id);const missing_products=combo.products.filter(x=>!globallyObserved.has(x));const cross_item_conflict_products=combo.products.filter(x=>globallyObserved.has(x)&&matchingItems.length===0);return{...combo,evidence_ready:matchingItems.length>0,matching_item_ids:matchingItems,missing_products,cross_item_conflict_products};});
 return{intent,required,optional,evidence_ready:requiredGroups.length===0||requiredItemIds.length>0,required_item_ids:requiredItemIds,ready_combinations:candidates.filter(c=>c.evidence_ready),blocked_combinations:candidates.filter(c=>!c.evidence_ready).map(({key,missing_products,cross_item_conflict_products})=>({key,missing_products,cross_item_conflict_products})),cross_item_combination_forbidden:true};
}
function arrayAt(value:any,...paths:string[][]):any[]{for(const path of paths){let c=value;for(const key of path)c=c?.[key];if(Array.isArray(c))return c;}return[];}
function numericSum(rows:any[],fields:string[]):number|null{const values=rows.map(row=>{for(const field of fields){const value=Number(row?.[field]);if(Number.isFinite(value))return value;}return null;}).filter((v):v is number=>v!==null);return values.length?values.reduce((a,b)=>a+b,0):null;}
function summarize(product:string,payload:any){
 switch(product){
  case "auth":{const a=arrayAt(payload,["accounts"]);return{account_records:a.length,auth_response_received:true};}
  case "identity":{const i=payload?.identity??payload,o=arrayAt(i,["owners"],["accounts"]);return{identity_records:o.length||(i?1:0),identity_response_received:true};}
  case "assets":{const a=arrayAt(payload,["report","items"],["report","accounts"],["items"],["accounts"]);return{asset_records:a.length,asset_value_observed:numericSum(a,["value","current_value","balance"])};}
  case "liabilities":{const l=[...arrayAt(payload,["liabilities","credit"],["credit"]),...arrayAt(payload,["liabilities","student"],["student"]),...arrayAt(payload,["liabilities","mortgage"],["mortgage"])];return{liability_records:l.length,liability_balance_observed:numericSum(l,["last_statement_balance","current_balance","balance"])};}
  case "investments":{const h=arrayAt(payload,["holdings"],["investment_holdings"]),s=arrayAt(payload,["securities"]);return{holding_records:h.length,security_records:s.length,holding_value_observed:numericSum(h,["institution_value","market_value","quantity"])};}
  case "statements":{const s=arrayAt(payload,["statements"],["items"]);return{statement_records:s.length,statement_response_received:true};}
  default:return{response_received:true};
 }
}
export async function buildTrialProductIntelligence(userId:string,intent:IrisProductIntent="unknown"){
 const [{data:authorityRows,error:authorityError},{data:rawProducts,error:rawProductError},{data:rawTransactions,error:transactionError},{data:rawBalances,error:balanceError},{data:rawLiabilities,error:liabilityError}]=await Promise.all([
  supabaseAdmin.from("plaid_product_observations").select("id,item_id,product,acquired_at").eq("user_id",userId).eq("provider","plaid").eq("is_current",true).eq("lifecycle_state","observed").eq("evidence_state","observed"),
  supabaseAdmin.from("plaid_raw_product_observations").select("id,item_id,product,raw_response,evidence_state,acquired_at").eq("user_id",userId).eq("is_current",true).eq("evidence_state","observed").order("acquired_at",{ascending:false}),
  supabaseAdmin.from("plaid_raw_transactions").select("id,item_id,account_id,acquired_at",{count:"exact"}).eq("user_id",userId).eq("is_current",true).eq("evidence_state","observed"),
  supabaseAdmin.from("plaid_raw_balances").select("id,item_id,account_id,acquired_at",{count:"exact"}).eq("user_id",userId).eq("is_current",true).eq("evidence_state","observed"),
  supabaseAdmin.from("plaid_raw_liabilities").select("id,item_id,account_id,acquired_at",{count:"exact"}).eq("user_id",userId).eq("is_current",true).eq("evidence_state","observed")
 ]);
 if(authorityError)throw authorityError;if(rawProductError)throw rawProductError;if(transactionError)throw transactionError;if(balanceError)throw balanceError;if(liabilityError)throw liabilityError;
 const authorities=(authorityRows??[])as ProductAuthority[],rawObserved=(rawProducts??[])as RawObservation[];
 const evidenceKeys=new Set<string>();
 for(const r of rawObserved)evidenceKeys.add(`${r.item_id}:${r.product}`);
 for(const r of(rawTransactions??[])as any[])evidenceKeys.add(`${r.item_id}:transactions`);
 for(const r of(rawBalances??[])as any[])evidenceKeys.add(`${r.item_id}:balance`);
 for(const r of(rawLiabilities??[])as any[])evidenceKeys.add(`${r.item_id}:liabilities`);
 const eligibleAuthorities=authorities.filter(a=>evidenceKeys.has(`${a.item_id}:${a.product}`)),observedByItem=new Map<string,Set<string>>();
 for(const a of eligibleAuthorities){const s=observedByItem.get(a.item_id)??new Set<string>();s.add(a.product);observedByItem.set(a.item_id,s);}
 const observedProducts=[...new Set(eligibleAuthorities.map(r=>r.product))];
 const summaries:any[]=rawObserved.map(r=>({item_id:r.item_id,product:r.product,acquired_at:r.acquired_at,...summarize(r.product,r.raw_response)}));
 const txRows=rawTransactions??[],balRows=rawBalances??[],liabilityRows=rawLiabilities??[];
 for(const authority of eligibleAuthorities){
   if(authority.product==="transactions")summaries.push({item_id:authority.item_id,product:"transactions",acquired_at:authority.acquired_at,transaction_raw_observation_count:txRows.filter((r:any)=>r.item_id===authority.item_id).length});
   if(authority.product==="balance")summaries.push({item_id:authority.item_id,product:"balance",acquired_at:authority.acquired_at,balance_raw_observation_count:balRows.filter((r:any)=>r.item_id===authority.item_id).length});
   if(authority.product==="liabilities")summaries.push({item_id:authority.item_id,product:"liabilities",acquired_at:authority.acquired_at,liability_raw_observation_count:liabilityRows.filter((r:any)=>r.item_id===authority.item_id).length});
 }
 const selection=chooseIrisCombinations(observedByItem,intent),consumableItemIds=new Set(selection.required_item_ids),actualConsumption=selection.evidence_ready?(ACTUAL_CONSUMPTION[intent]??{}):{},consumptionRows:any[]=[];
 const combinationKeys=selection.ready_combinations.filter(c=>c.matching_item_ids.some(id=>consumableItemIds.has(id))).map(c=>c.key);
 const sourceRowsByProduct:Record<string,any[]>={transactions:txRows as any[],balance:balRows as any[],liabilities:liabilityRows as any[]};
 for(const[product,analysisKeys]of Object.entries(actualConsumption)){
   const authoritiesForProduct=eligibleAuthorities.filter(a=>a.product===product&&consumableItemIds.has(a.item_id));
   for(const authority of authoritiesForProduct){
     const rawProduct=rawObserved.find(r=>r.product===product&&r.item_id===authority.item_id);
     const specialized=sourceRowsByProduct[product]?.filter(r=>r.item_id===authority.item_id)??[];
     if(!rawProduct&&!specialized.length)continue;
     const sourceKind=rawProduct?"plaid_raw_product_observations":product==="transactions"?"plaid_raw_transactions":product==="balance"?"plaid_raw_balances":product==="liabilities"?"plaid_raw_liabilities":"plaid_product_observations";
     const sourceIds=rawProduct?[rawProduct.id]:specialized.map(r=>r.id);
     for(const analysisKey of analysisKeys){
       consumptionRows.push({user_id:userId,item_id:authority.item_id,product,analysis_key:analysisKey,evidence_observation_id:authority.id,raw_observation_id:rawProduct?.id??null,details:{evidence_state:"observed",acquired_at:rawProduct?.acquired_at??authority.acquired_at,source_kind:sourceKind,source_observation_ids:sourceIds,intent,combination_keys:combinationKeys,consumption:"request_path"}});
     }
   }
 }
 if(consumptionRows.length){const{error}=await supabaseAdmin.from("iris_product_consumption").upsert(consumptionRows,{onConflict:"user_id,item_id,product,analysis_key,dedupe_observation_id",ignoreDuplicates:true});if(error)throw error;}
 const consumedProducts=[...new Set(consumptionRows.map(r=>r.product))],consumedAnalyses=[...new Set(consumptionRows.map(r=>r.analysis_key))],coreConsumption=consumptionRows.filter(r=>CORE_PRODUCTS.has(r.product)).map(r=>({item_id:r.item_id,product:r.product,analysis_key:r.analysis_key,evidence_observation_id:r.evidence_observation_id,raw_observation_id:r.raw_observation_id,source_kind:r.details.source_kind,source_observation_ids:r.details.source_observation_ids}));
 return{observed_products:observedProducts,observed_by_item:Object.fromEntries([...observedByItem.entries()].map(([item,products])=>[item,[...products]])),summaries,by_product:summaries.reduce((acc,s)=>{acc[s.product]??=[];acc[s.product].push(s);return acc;},{} as Record<string,any[]>),consumed_products:consumedProducts,consumed_analyses:consumedAnalyses,core_consumption:coreConsumption,consumption_contract:{declared_combinations:COMBINATION_LIBRARY.map(c=>({key:c.key,products:[...c.products],analyses:[...c.analyses]})),actual_request_path_analyses:[...new Set(Object.values(actualConsumption).flat())],note:"Declared combinations are capabilities, not execution proof. Only analyses with concrete request-path consumption records are marked consumed."},selection,evidence_rule:"Only current Plaid product observations with lifecycle_state=observed and evidence_state=observed are selectable. Transactions, balances, and liabilities may be certified only when their specialized current raw provider evidence exists on the same Plaid Item. Other Trial domains require their current raw provider observation mirror. Products from different Items are never combined implicitly. Consumption is recorded only for an evidence-ready request path and includes the concrete provider-source observation identifiers used by that path."};
}
