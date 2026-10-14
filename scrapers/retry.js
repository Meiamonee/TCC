function invalidSession(error) {
    return error?.name === 'NoSuchSessionError' || /invalid session id|session deleted because|chrome not reachable|disconnected: not connected to DevTools/i.test(error?.message || '');
}

async function retryCategory(run, pause, onFailure = () => {}, onRetry = async () => {}) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try { return await run(); }
        catch (error) {
            if (['BLOCKED', 'STOPPED', 'IMPORT_FAILED', 'STORE_MISMATCH'].includes(error.code)) throw error;
            onFailure({attempt, error: error.message});
            if (attempt === 3) {
                if (invalidSession(error)) error.code = 'BROWSER_FAILED';
                throw error;
            }
            console.log(`[categoria] Tentativa ${attempt} falhou: ${error.message}`);
            await pause(attempt + 1);
            await onRetry(error, attempt);
        }
    }
}
module.exports = {retryCategory, invalidSession};
