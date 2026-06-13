const multer = require('multer');
const fs = require('fs');

//Função que cria a configuração do multer dinamicamente
const uploadImage = (destinationFolder) => {
    //Validação para garantir que a pasta de destino exista
    if (!destinationFolder) {
        throw new Error("A pasta de destino é obrigatória para o upload.");
}

}