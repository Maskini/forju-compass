import { takeAiRequest } from "@/lib/server/ai-limit";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { selectCatalogKnowledge } from "@/lib/knowledge";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && !takeAiRequest()) {
    return NextResponse.json({error: "Die Demo ist gerade ausgelastet. Bitte versuche es später erneut."}, {status: 429, headers: {"Retry-After": "60"}});
  }
  if (Number(request.headers.get("content-length") || 0) > 32000) {
    return NextResponse.json({error: "Anfrage zu groß."}, {status: 413});
  }
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY fehlt." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const query =
      typeof body?.query === "string"
        ? body.query.trim()
        : "";

    if (!query || query.length > 2000) {
      return NextResponse.json(
        { error: "Eine Suchanfrage ist erforderlich." },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    const embeddingResponse =
      await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
        encoding_format: "float",
      });

    const queryEmbedding =
      embeddingResponse.data[0].embedding;

    const { data, error } = await supabase.rpc(
      "match_documents",
      {
        query_embedding: queryEmbedding,
        match_count: 60,
      }
    );

    if (error) {
      console.error("Supabase search failed");

      return NextResponse.json(
        {
          error: "Die Wissenssuche ist gerade nicht verfügbar.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      query,
      results: selectCatalogKnowledge(data, query),
    });
  } catch (error) {
    console.error(
      "ForJu semantic search failed:",
      error instanceof Error ? error.name : "Unknown error"
    );

    return NextResponse.json(
      {
        error:
          "Die Wissenssuche konnte nicht durchgeführt werden.",
      },
      { status: 500 }
    );
  }
}