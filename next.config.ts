import type { NextConfig } from "next";
import {securityPolicy} from './lib/security-policy.mjs';
const parents=(process.env.COMPASS_EMBED_ORIGINS ?? "https://forju.at,https://www.forju.at").split(",").map(x=>x.trim()).filter(Boolean).map(value=>{
  const url=new URL(value);
  if(url.protocol!=="https:" || value!==url.origin) throw Error("COMPASS_EMBED_ORIGINS requires exact HTTPS origins");
  return url.origin;
});
const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  env:{COMPASS_FRAME_ANCESTORS:["'self'",...parents].join(" ")},
  async headers(){
    return [
      {source:"/:path*",headers:[{key:"Content-Security-Policy",value:securityPolicy("'self'")},{key:"X-Content-Type-Options",value:"nosniff"},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"}]},

    ];
  },
};
export default nextConfig;
