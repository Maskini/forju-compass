export function ChatChoices({choices,onChoose}:{choices:string[];onChoose:(s:string)=>void}) {
  if (!choices.length) return null;
  return <div className="chat-choices">{choices.map(label=>
    <button type="button" key={label} onClick={()=>onChoose(label)}>{label}</button>
  )}</div>;
}
