const multer = require('multer');
const fs = require('fs');

//Função que cria a configuração do multer dinamicamente
const uploadImage = (destinationFolder) => {
    //Validação para garantir que a pasta de destino exista
    if (!destinationFolder) {
        throw new Error("A pasta de destino é obrigatória para o upload.");
}
    const fullPath = `./uploads/${destinationFolder}/`;
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }

    //Configuração do storage (onde e como salvar)
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, fullPath);
        },
        filename: function (req, file, cb) {
            const uniqueSuffic = Date.now + '-' + Math.round(Math.random() * 1E9);
            //Extrai a extensão do arquivo a partir do mimetype
            const extension = file.mimetype.split('/')[1];
            cb(null, `${uniqueSuffic}.${extension}`);
        }
    });

    //Filtro para aceitar apenas certos tipos de imagem
    const fileFilter = (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos JPEG, PNG e GIF são permitidos.'), false);
        }
    };

    return multer ({
        storage: storage,
        limits: {
            fileSize: 1024 * 1024 * 5 // 5MB
        },
        fileFilter: fileFilter
    });
}
module.exports = uploadImage;