/**
 * @fileoverview Configuração e Pool de Conexão MySQL
 * Gerencia a conexão persistente com o banco de dados
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

/**
 * Configuração da conexão MySQL a partir de variáveis de ambiente
 * @type {Object}
 */
const config = {
    host: process.env.BD_SERVIDOR,
    port: process.env.BD_PORTA || 3306,
    user: process.env.BD_USUARIO,
    password: process.env.BD_SENHA,
    database: process.env.BD_BANCO,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

/**
 * Pool de conexões MySQL
 * @type {mysql.Pool}
 */
let pool;

/**
 * Inicializa a pool de conexões e valida a conectividade
 * Valida se as variáveis de ambiente obrigatórias estão definidas
 *
 * @returns {Promise<void>}
 * @throws {Error} Se não conseguir conectar ao banco ou variáveis faltarem
 */
const initializeDatabase = async () => {
    try {
        // Valida se as variáveis de ambiente obrigatórias existem
        const requiredVars = ['BD_SERVIDOR', 'BD_USUARIO', 'BD_SENHA', 'BD_BANCO'];
        const missingVars = requiredVars.filter(v => !process.env[v]);

        if (missingVars.length > 0) {
            throw new Error(`Variáveis de ambiente não definidas: ${missingVars.join(', ')}`);
        }

        // Cria a pool de conexões
        pool = mysql.createPool(config);

        // Testa a conectividade com uma conexão simples
        const connection = await pool.getConnection();
        console.log('✓ Conexão MySQL estabelecida com sucesso');
        connection.release();

    } catch (error) {
        console.error('✗ Erro ao conectar ao banco de dados:', error.message);
        process.exit(1);
    }
};

// Inicializa o banco de dados ao carregar o módulo
initializeDatabase();

module.exports = pool;