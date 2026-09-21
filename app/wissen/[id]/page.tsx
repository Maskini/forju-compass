import Link from "next/link";
import { notFound } from "next/navigation";
import { knowledgeCatalog, kindLabels } from "@/lib/knowledge";

export default async function KnowledgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = knowledgeCatalog.find(item => item.id === id && item.active);
  if (!entry) notFound();
  return <main className="knowledge-page">
    <Link href="/">← Zurück zu ForJu Compass</Link>
    <p className="knowledge-status">{kindLabels[entry.kind]}</p>
    <h1>{entry.title}</h1>
    <p>{entry.sourceTitle} · Stand {entry.sourceYear}</p>
    <p>Diese Demo fasst öffentlich verfügbare Informationen zusammen. Verfügbarkeit und Konditionen bitte direkt bei ForJu prüfen.</p>
    <article className="knowledge-excerpt">{entry.content}</article>
    <p>Quelle: <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">Öffentliche ForJu-Website</a>. Stand: {entry.lastReviewedAt}.</p>
  </main>;
}
