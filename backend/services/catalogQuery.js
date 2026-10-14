function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function numberFilter(value) {
    if (value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
}

function catalogQuery(params, enabledMarkets, normalizeName) {
    const filter = {supermercado: {$in: enabledMarkets}};
    if (params.includeIndisponiveis !== 'true') filter.disponivel = true;
    if (params.supermercado) filter.supermercado = {$in: enabledMarkets.filter(m => m === params.supermercado)};
    if (params.categoria) filter.categoria = new RegExp(`^${escapeRegex(params.categoria)}$`, 'i');
    const search = params.search?.trim() ? String(normalizeName(params.search)).trim() : '';
    if (search) filter.$text = {$search: search};
    const minimum = numberFilter(params.min);
    const maximum = numberFilter(params.max);
    if (minimum !== null || maximum !== null) {
        filter.preco = {};
        if (minimum !== null) filter.preco.$gte = minimum;
        if (maximum !== null) filter.preco.$lte = maximum;
    }
    const sort = params.sort === 'low' ? {preco:1,_id:1}
        : params.sort === 'high' ? {preco:-1,_id:1}
            : search ? {searchScore:{$meta:'textScore'},_id:1}
                : {nomeNormalizado:1,_id:1};
    const page = Math.max(Number.parseInt(params.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(params.limit, 10) || 24, 1), 100);
    return {filter,sort,page,limit};
}

module.exports = {catalogQuery,escapeRegex};
