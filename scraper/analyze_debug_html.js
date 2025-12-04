const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'debug_pagination.html');

try {
    const html = fs.readFileSync(filePath, 'utf8');

    // Count products
    const productCount = (html.match(/vip-card-produto/g) || []).length;
    console.log(`Product count: ${productCount}`);

    // Search for keywords
    const keywords = ['Próxima', 'Carregar mais', 'Ver mais', 'pagination', 'nav', 'button'];
    keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = (html.match(regex) || []).length;
        console.log(`Keyword "${keyword}": ${matches} matches`);

        if (matches > 0 && matches < 10) {
            // Print context for few matches
            let match;
            while ((match = regex.exec(html)) !== null) {
                const start = Math.max(0, match.index - 50);
                const end = Math.min(html.length, match.index + 50);
                console.log(`  Context: ...${html.substring(start, end).replace(/\s+/g, ' ')}...`);
            }
        }
    });

} catch (err) {
    console.error('Error reading file:', err);
}
