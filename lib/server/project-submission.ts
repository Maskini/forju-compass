import "server-only";
import {createHash} from "node:crypto";
import {Resend} from "resend";
import {z} from "zod";
import {PROJECT_MAX_LENGTH,PROJECT_RECIPIENT,projectSubject} from "../project-mail";
import {BodyError,readBody} from "./feedback-handler";

export function projectMailConfig(env=process.env){
  const key=env.RESEND_API_KEY?.trim(),from=env.PROJECT_FROM_EMAIL?.trim();
  return key && from && z.email().safeParse(from).success && !/@(?:[^@]+\.)?resend\.dev$/i.test(from) ? {key,from} : null;
}
const payload=z.strictObject({confirmed:z.literal(true),language:z.enum(["de","en"]),draft:z.string().trim().min(1).max(PROJECT_MAX_LENGTH),replyEmail:z.email().max(254).optional()});
type Payload=z.infer<typeof payload>;
export async function deliverProject(config:{from:string;key:string},p:Payload,key:string){
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    const result=await Promise.race([
      new Resend(config.key).emails.send({from:config.from,to:[PROJECT_RECIPIENT],subject:projectSubject(p.language),text:p.draft,...(p.replyEmail?{replyTo:p.replyEmail}:{})},{idempotencyKey:key}),
      new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error("timeout")),15000)})
    ]);
    return !result.error && !!result.data?.id;
  }finally{clearTimeout(timer)}
}
type Dependencies={config:typeof projectMailConfig;deliver:typeof deliverProject;limit:(req:Request)=>{allowed:boolean;retryAfter:number}};
const json=(body:object,status=200,headers={})=>Response.json(body,{status,headers:{"Cache-Control":"no-store",...headers}});
export function createProjectHandler(deps:Dependencies){
  return async (request:Request)=>{
    const origin=request.headers.get("origin");
    if(!origin || (origin!==new URL(request.url).origin && origin!==(process.env.RENDER_EXTERNAL_URL || "https://forju-compass.onrender.com")))return json({error:"origin"},403);
    if(request.headers.get("content-type")?.split(";")[0].trim()!=="application/json")return json({error:"content_type"},415);
    const key=request.headers.get("idempotency-key");
    if(!z.uuid().safeParse(key).success)return json({error:"key"},400);
    const config=deps.config();if(!config)return json({error:"unavailable"},503);
    try{
      const parsed=payload.safeParse(await readBody(request));if(!parsed.success)return json({error:"invalid_draft"},400);
      const limit=deps.limit(request);if(!limit.allowed)return json({error:"rate_limited"},429,{"Retry-After":String(limit.retryAfter)});
      const digest=createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex");
      if(!await deps.deliver(config,parsed.data,'project/'+key+'/'+digest))return json({error:"unconfirmed"},502);
      return json({accepted:true});
    }catch(e){return e instanceof BodyError?json({error:"invalid_body"},e.status):json({error:"unconfirmed"},502)}
  };
}
