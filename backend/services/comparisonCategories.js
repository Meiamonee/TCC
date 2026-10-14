const { categoryOf } = require('./normalization');

const foodFamily = new Set(['Mercearia', 'Cereais e farináceos', 'Matinais e sobremesas']);
const familyOf = category => foodFamily.has(category) ? 'Mercearia' : category;

function categoryNamesFor(selected, knownCategories, includeFamily = false) {
    const target = categoryOf(selected);
    return knownCategories.filter(name => {
        const category = categoryOf(name);
        return includeFamily ? familyOf(category) === familyOf(target) : category === target;
    });
}

module.exports = { categoryNamesFor };
