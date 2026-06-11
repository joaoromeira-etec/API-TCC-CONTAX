require('dotenv').config();

const express = require('express');
const cors = require('cors');
const router = require('./src/routes/naiara');
const app = express();
app.use(cors());
app.use(express.json());
app.use('/naiara', router);
app.use('/public', express.static('public'));

const porta = process.env.PORT || 3333;

app.listen(porta, () => {
    console.log(`Servidor rodando em http://localhost:${porta}`);
});

app.get('/', (request, response) => {
    response.send('Bem-vindo à API da Contax!');
});