const {sleep}=require('./browser');
function integer(value,fallback,min=0){if(value===undefined)return fallback;const n=Number(value);if(!Number.isInteger(n)||n<min)throw new Error('Intervalo de coleta invalido: '+value);return n;}
function createPacer(options={},dependencies={}) {
  const wait=dependencies.sleep || sleep;
  const retryDelay=integer(options.retryDelayMs ?? process.env.SCRAPER_RETRY_DELAY_MS,5000);
  return async function pause(failure=0) {
    if(options.shouldStop?.())throw Object.assign(new Error('Coleta interrompida; progresso salvo.'),{code:'STOPPED'});
    // Navegacoes normais seguem imediatamente. Apenas uma tentativa apos falha
    // recebe um recuo curto para nao repetir o mesmo erro em um loop apertado.
    const ms=failure ? Math.min(30000,retryDelay*2**Math.max(0,failure-1)) : 0;
    options.onWait?.({nextNavigationAt:new Date(Date.now()+ms).toISOString(),delayMs:ms});
    if(!ms)return 0;
    console.log(`[nova tentativa] em ${(ms/1000).toFixed(1)}s`);
    // Divide pausas para permitir parada cooperativa sem perder progresso.
    for(let remaining=ms;remaining>0;remaining-=1000){if(options.shouldStop?.())throw Object.assign(new Error('Coleta interrompida; progresso salvo.'),{code:'STOPPED'});await wait(Math.min(1000,remaining));}
    return ms;
  };
}
module.exports={createPacer};
