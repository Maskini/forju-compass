import type { NextConfig } from "next";
const parents=(process.env.COMPASS_EMBED_ORIGINS ?? "https://forju.at,https://www.forju.at").split(",").map(x=>x.trim()).filter(Boolean).map(value=>{
  const url=new URL(value);
  if(url.protocol!=="https:" || value!==url.origin) throw Error("COMPASS_EMBED_ORIGINS requires exact HTTPS origins");
  return url.origin;
});
const nextConfig: NextConfig = {
  devIndicators: false,
  async headers(){
    return [
      {source:"/:path*",headers:[{key:"Content-Security-Policy",value:"frame-ancestors 'self'"}]},
      {source:"/embed",headers:[{key:"Content-Security-Policy",value:["frame-ancestors 'self'",...parents].join(" ")}]},
    ];
  },
};
export default nextConfig;
