import type {Metadata} from "next";
import CompassPanel from "./panel";
export const metadata: Metadata = {title:"ForJu Compass", robots:{index:false,follow:false}};
export default async function Embed({searchParams}:{searchParams:Promise<{lang?:string;widget?:string}>}) {
  const params=await searchParams;
  return <CompassPanel widget={params.widget==="1"} initialLanguage={params.lang === "en" ? "en" : "de"}/>;
}
