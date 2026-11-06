import {NextResponse, type NextRequest} from 'next/server';
import {securityPolicy} from './lib/security-policy.mjs';

export function proxy(request: NextRequest) {
  const nonce=Buffer.from(crypto.randomUUID()).toString('base64');
  const ancestors=request.nextUrl.pathname==='/embed' ? process.env.COMPASS_FRAME_ANCESTORS : "'self'";
  const value=securityPolicy(ancestors || "'self'",nonce,process.env.NODE_ENV==='development');
  const headers=new Headers(request.headers);
  headers.set('Content-Security-Policy',value);
  const response=NextResponse.next({request:{headers}});
  response.headers.set('Content-Security-Policy',value);
  response.headers.set('Cache-Control','private, no-store');
  return response;
}
export const config={matcher:['/','/embed','/wissen/:path*']};
