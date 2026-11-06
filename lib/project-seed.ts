type Turn = {question:string};
const topic=/projekt|project|thesis|abschlussarbeit|diplomarbeit|research idea|forschungsfrage|unsere klasse|our class|wir (möchten|bauen)|we (want to|are building)/i;
const visitor=/\b(my|our|we|i|ich|wir|mein\w*|unser\w*)\b/i;

// Keep verbatim excerpts. Unlabelled statements belong in the description;
// infer neither a title nor goals from the assistant's answer or a generic question.
export function projectSeed(turns:Turn[]){
  const messages=turns.map(t=>t.question.trim());
  const anchor=messages.findLastIndex(m=>topic.test(m)&&visitor.test(m)&&!m.endsWith("?"));
  const seed={title:"",description:"",goal:""};
  if(anchor<0)return seed;
  const body:string[]=[];
  for(const [i,message] of messages.slice(anchor).entries()){
    for(const line of message.split("\n")){
      const named=line.match(/^\s*(projekttitel|project title|titel|title|ziel|goal|beschreibung|description)\s*:\s*(.+)$/i);
      if(named){
        if(/titel|title/i.test(named[1]))seed.title=named[2].trim();
        else if(/ziel|goal/i.test(named[1]))seed.goal=named[2].trim();
        else body.push(named[2].trim());
      }else if(i===0&&line.trim())body.push(line.trim());
    }
  }
  seed.description=body.join("\n");
  return seed;
}
