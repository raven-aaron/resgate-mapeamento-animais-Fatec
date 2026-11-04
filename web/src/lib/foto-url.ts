/** Reconhece apenas fotos armazenadas pela aplicação, não URLs externas. */
export function fotoPermitidaNoMapa(url: unknown): url is string {
  return typeof url === "string" &&
    /^\/(?:api\/fotos|uploads)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/.test(url);
}
