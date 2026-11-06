// Limit the bytes consumed even when a client omits the Content-Length header.
export class BodyError extends Error { constructor(status) { super("invalid_body"); this.status = status; } }
export async function readBody(request, maxBytes = 64 * 1024) {
  if (Number(request.headers.get("content-length")) > maxBytes) throw new BodyError(413);
  if (!request.body) throw new BodyError(400);
  const reader = request.body.getReader();
  let bytes = 0, text = "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let timer;
  try {
    return await Promise.race([
      (async () => {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > maxBytes) throw new BodyError(413);
          text += decoder.decode(value, { stream: true });
        }
        return JSON.parse(text + decoder.decode());
      })(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new BodyError(408)), 5000); }),
    ]);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) throw new BodyError(400);
    throw error;
  } finally { if (timer) clearTimeout(timer); void reader.cancel().catch(() => {}); }
}
