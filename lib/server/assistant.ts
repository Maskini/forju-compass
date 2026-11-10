import "server-only";
import OpenAI from "openai";
import {mkdirSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {knowledgeCatalog} from "@/lib/knowledge";
import {assistantRequest,evidencePack,parseAssistantAnswer,MODEL,type AssistantInput,type AssistantReply} from "@/lib/assistant";
import {openAssistantBudget,reservationMicros} from "./assistant-budget.mjs";

export type AssistantResult = {reply:AssistantReply|null;status:string};
let budget:ReturnType<typeof openAssistantBudget>|undefined;
let cooldownUntil=0;

export async function answerWithAssistant(input:AssistantInput,lang:"de"|"en"):Promise<AssistantResult>{
  const fallback=(status:string):AssistantResult=>({reply:null,status});
  if(process.env.COMPASS_LOCAL_ONLY!=="false")return fallback("local");
  if(!process.env.OPENAI_API_KEY)return fallback("missing-key");
  if((process.env.OPENAI_CHAT_MODEL||MODEL)!==MODEL)return fallback("unpriced-model");
  if(Date.now()<cooldownUntil)return fallback("cooldown");
  const evidence=evidencePack(knowledgeCatalog,lang);
  const body=assistantRequest(input,lang,evidence);
  if(!body)return fallback("context-limit");
  try{
    const cap=Number(process.env.COMPASS_AI_DAILY_BUDGET_USD??"0.25");
    if(!Number.isFinite(cap)||cap<=0||cap>10)return fallback("budget-configuration");
    if(!budget){
      const path=resolve(/* turbopackIgnore: true */ process.cwd(),process.env.COMPASS_QUOTA_DB||"work/ai-quota.sqlite");
      mkdirSync(dirname(path),{recursive:true,mode:0o700});budget=openAssistantBudget(path);
    }
    if(!budget.reserve(reservationMicros(Buffer.byteLength(JSON.stringify(body)),body.max_output_tokens),Math.floor(cap*1e6)))return fallback("budget-limit");
  }catch{return fallback("budget-unavailable")}
  try{
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:18000,maxRetries:0});
    // Exactly one provider call. No embeddings, hosted search, tools or mail access.
    const response=await client.responses.create(body);
    if(response.status!=="completed"||!response.output_text?.trim())return fallback("incomplete");
    const reply=parseAssistantAnswer(response.output_text,evidence);
    return reply?{reply,status:"openai"}:fallback("invalid-evidence");
  }catch(error){
    const status=(error as {status?:number})?.status;
    if(status===401||status===403||status===429)cooldownUntil=Date.now()+5*60*1000;
    // Logs contain neither questions, history, source text, raw errors nor keys.
    console.warn("[compass-assistant]",status===401?"invalid-key":status===429?"provider-limit":status===403?"access-denied":"provider-unavailable");
    return fallback(status===401?"invalid-key":status===429?"provider-limit":status===403?"access-denied":"provider-unavailable");
  }
}
