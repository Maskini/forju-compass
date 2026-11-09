const cases=require('./cases.cjs');
module.exports=(output,context)=>{
 const c=cases.find(x=>x.id===context.vars.caseId);
 const a=typeof output==='string'?JSON.parse(output):output, errors=[];
 for(const pattern of c.must)if(!new RegExp(pattern,'iu').test(a.answer))errors.push('Missing evidence for '+c.fact+' ['+pattern+']');
 for(const pattern of c.forbid)if(new RegExp(pattern,'iu').test(a.answer))errors.push('Contradicted source or correction: '+pattern);
 if(c.source&&!a.sources?.some(s=>s.url===c.source))errors.push('Missing exact supporting page '+c.source);
 if(c.topic!==undefined && (a.topic??null)!==c.topic)errors.push("Wrong offer: "+a.topic);
 if(c.topics && !c.topics.includes(a.topic??null))errors.push('Wrong offer: '+a.topic);
 const allowed=new Set([c.source,...(c.supportingSources||[])]);
 if(c.source?.includes('/services/')){
   const route=new URL(c.source);
   allowed.add(route.origin+'/'+c.lang+'/kontakt?intent=service&thema='+route.pathname.split('/').at(-1));
 }
 if(c.source?.endsWith("/kontakt?intent=partner"))allowed.add("https://forju.at/"+c.lang+"/projects/forju-partnerpool");
 for(const s of a.sources||[]) if(!allowed.has(s.url)) errors.push('Unrelated additional citation: '+s.url);
 if(!c.source && a.sources?.length)errors.push('Citation for an unspecified topic');
 if(a.sources?.some(s=>!/^https:\/\/forju\.at\/(de|en)(\/|#|\?|$)/.test(s.url)))errors.push('Unapproved citation');
 return {pass:!errors.length,score:errors.length?0:1,reason:errors.join('; ')||c.fact};
};
