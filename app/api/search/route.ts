import {BodyError, readBody} from "@/lib/server/request-body.mjs";
import {takeAiRequest} from "@/lib/server/ai-limit";
import {localKnowledge,selectCatalogKnowledge} from "@/lib/knowledge";
import OpenAI from "openai";

export async function POST(request: Request) {
  let body;
  try { body = await readBody(request, 32000); }
  catch (error) {
    return Response.json({error:"Ungültige Suchanfrage."},{status:error instanceof BodyError ? error.status : 400});
  }
  const query=typeof body?.query==="string" ? body.query.trim() : "";
  if(!query || query.length>2000) return Response.json({error:"Ungültige Suchanfrage."},{status:400});
  const retry=process.env.NODE_ENV==="production"?takeAiRequest(request):0;
  if(retry) return Response.json({error:"Zu viele Anfragen."},{status:429,headers:{"Retry-After":String(retry)}});
  let rows=localKnowledge(query);
  if(process.env.COMPASS_LOCAL_ONLY === "false" && process.env.OPENAI_API_KEY){
    try{
      const ai=new OpenAI({timeout:10000,maxRetries:0});
      const embedding=await ai.embeddings.create({model:"text-embedding-3-small",input:query});
      const {retrievePublicKnowledge}=await import("@/lib/server/public-retrieval");
      rows=[...rows,...await retrievePublicKnowledge(embedding.data[0].embedding)];
    }catch{/* Return local public matches when a provider is unavailable. */}
  }
  return Response.json({success:true,query,results:selectCatalogKnowledge(rows,query)});
}
