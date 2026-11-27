const CHUNK_RELOAD_KEY = "banestes-chunk-reload-ts";
const CHUNK_RELOAD_COOLDOWN_MS = 10_000;

/**
 * Recarrega a página no máximo uma vez dentro de uma janela de 10 s quando um chunk
 * lazy antigo falha após um novo deploy (evitando tela quebrada por hash obsoleto
 * sem nunca entrar em loop infinito se o usuário estiver offline).
 */
export function tryReloadOnceForStaleChunk(): boolean {
  const now = Date.now();
  try {
    const lastAttempt = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY));
    if (
      Number.isFinite(lastAttempt) &&
      now - lastAttempt < CHUNK_RELOAD_COOLDOWN_MS
    ) {
      return false;
    }
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
  } catch {
    // sessionStorage indisponível: ainda tenta recarregar uma vez.
  }

  window.location.reload();
  return true;
}

/**
 * Envolve um loader de `React.lazy` para recuperar automaticamente de falha de
 * importação dinâmica (ex.: aba aberta antes de um novo deploy na Vercel).
 */
export function loadChunkWithRecovery<T>(
  loader: () => Promise<T>,
): Promise<T> {
  return loader().catch((error: unknown) => {
    if (tryReloadOnceForStaleChunk()) {
      // Mantém a Promise pendente enquanto o navegador conclui o reload.
      return new Promise<T>(() => {});
    }
    throw error;
  });
}
