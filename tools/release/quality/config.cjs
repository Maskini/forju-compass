const cases=require('./cases.cjs');
module.exports={
 description:'ForJu catalog release audit',prompts:['{{caseId}}'],providers:['file://provider.cjs'],
 tests:cases.filter(c=>process.env.AUDIT_PHASE==='final'||!c.holdout).map(c=>({
  description:c.id,vars:{caseId:c.id},assert:[{type:'javascript',value:'file://grade.cjs'}]
 }))
};
