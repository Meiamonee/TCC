require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');

const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/Mercados';

function getMongoUri() {
    return process.env.MONGODB_URI
        || process.env.MONGO_URI
        || process.env.MONGO_URL
        || DEFAULT_MONGODB_URI;
}

const connectDB = async () => {
    const mongoUri = getMongoUri();

    try {
        await mongoose.connect(mongoUri);
        console.log('MongoDB conectado com sucesso.');
        console.log(`Database: ${mongoose.connection.name}`);
    } catch (error) {
        console.error('Erro ao conectar ao MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
module.exports.getMongoUri = getMongoUri;
