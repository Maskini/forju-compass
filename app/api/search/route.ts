import {BodyError, readBody} from "@/lib/server/request-body.mjs";
import {takeAiRequest} from "@/lib/server/ai-limit";
import {localKnowledge,selectCatalogKnowledge} from "@/lib/knowledge";

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
  // Catalog search remains local in BOTH modes. Enabling flexible chat must not
  // open a second, unbudgeted embeddings path or forward visitor text to a DB.
  const rows=localKnowledge(query);
  return Response.json({success:true,query,results:selectCatalogKnowledge(rows,query)});
}
