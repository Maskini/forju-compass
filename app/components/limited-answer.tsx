export function LimitedAnswer({en}:{en:boolean}) {
  return <p className="limited-answer" role="note">{en?"I can currently provide general information only. For a reply specific to your situation, please contact the team.":"Ich kann dir gerade nur allgemeine Informationen geben. Für eine Antwort auf deine persönliche Situation wende dich bitte ans Team."}</p>;
}
