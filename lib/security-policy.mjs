// Markdown-style visitor text, local assets and the Compass iframe need no
// third-party script or network origin. Inline styles position the host dialog.
export function securityPolicy(ancestors,nonce,development=false){
  const scripts=["'self'"];
  if(nonce) scripts.push("'nonce-"+nonce+"'");
  if(development) scripts.push("'unsafe-eval'");
  return [
    "default-src 'self'", "script-src "+scripts.join(' '), "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:", "font-src 'self'", "connect-src 'self'", "frame-src 'self'",
    "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors "+ancestors
  ].join('; ');
}
