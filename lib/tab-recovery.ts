import {z} from "zod";

// Recovery is deliberately per tab, short lived, and never sent to a server.
export const RECOVERY_TTL = 30 * 60 * 1000;
export const RECOVERY_PREFIX = "forju-compass:recovery:v1:";
const MAX_BYTES = 400_000;
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const lang = z.enum(["de", "en"]);
const source = z.object({title:z.string().max(500), url:z.string().max(2048).refine(value => {
  if (/^\/wissen\/[a-z0-9-]+$/.test(value)) return true;
  try { const u=new URL(value);return ["https:","http:"].includes(u.protocol) && !u.username && !u.password; } catch {return false;}
})});
export const chatRecoverySchema = z.object({
  question:z.string().max(2000),pending:z.string().max(2000),
  turns:z.array(z.object({question:z.string().max(2000),answer:z.string().max(12000),sources:z.array(source).max(10),
    suggestions:z.array(z.string().max(80)).max(4),topic:z.string().max(48).optional(),draft:z.boolean(),limited:z.boolean().optional(),
    recipient:z.string().regex(/^[\w.+-]+@forju\.at$/i).optional(),answeredAt:z.number().finite().min(0).max(8.64e15)})).max(30),
  preferredLanguage:lang.optional(),visitorName:z.string().max(80).optional(),uiLanguage:lang,
});
export type ChatRecovery = z.infer<typeof chatRecoverySchema>;
export const projectRecoverySchema = z.object({
  draftLang:lang, step:z.number().int().min(-1).max(5), fields:z.array(z.string().max(16000)).length(7),
  goals:z.array(z.number().int().min(0).max(5)).max(6),custom:z.string().max(16000),seeded:z.boolean(),
  delivery:z.object({reply:z.string().max(254),key:z.union([z.literal(""),z.uuid()]),
    receipt:z.object({identity:z.string().max(130000),state:z.enum(["accepted","unavailable","error"])}).nullable()}),
});
export type ProjectRecovery = z.infer<typeof projectRecoverySchema>;
export function recoveryKey(name:"chat"|"project", pathname:string) {
  return RECOVERY_PREFIX+(pathname.startsWith("/embed")?"embed":"standalone")+":"+name;
}
export function readRecovery<T>(storage:StorageLike|undefined,key:string,schema:z.ZodType<T>,now=Date.now()):T|undefined {
  try {
    const raw=storage?.getItem(key);if(!raw)return;
    if(raw.length>MAX_BYTES)throw Error();
    const envelope=JSON.parse(raw);
    if(envelope.version!==1 || !Number.isFinite(envelope.expiresAt) || envelope.expiresAt<=now || envelope.expiresAt>now+RECOVERY_TTL)throw Error();
    return schema.parse(envelope.value);
  } catch {try{storage?.removeItem(key)}catch{}return;}
}
export function writeRecovery<T>(storage:StorageLike|undefined,key:string,schema:z.ZodType<T>,value:T,now=Date.now()) {
  try {
    const raw=JSON.stringify({version:1,expiresAt:now+RECOVERY_TTL,value:schema.parse(value)});
    if(raw.length>MAX_BYTES)throw Error();
    storage?.setItem(key,raw);
  } catch {try{storage?.removeItem(key)}catch{/* Storage may be blocked in an iframe. */}}
}
export function clearRecovery(storage:StorageLike|undefined,pathname:string) {
  for(const name of ["chat","project"] as const)try{storage?.removeItem(recoveryKey(name,pathname))}catch{}
}
