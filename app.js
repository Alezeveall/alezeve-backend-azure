const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const AzureStorageBlob = require('@azure/storage-blob');
const { BlobServiceClient } = require('@azure/storage-blob');
var cors = require('cors');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const {
  FormRecognizerClient,
  AzureKeyCredential,
} = require('@azure/ai-form-recognizer');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const hostname = 'http://localhost';

const port = process.env.PORT || '3005';
app.set('port', port);

const server = http.createServer(app);
server.listen(port, () => {
  console.log(`Serve rodando porta ${port}`);
});

app.get('/', (req, res) => {
  st;
  res.send('<h1>Node.js OCR - Azure Form Recognizer Receipt</h1>');
});

// enable files upload
app.use(
  fileUpload({
    createParentPath: true,
  })
);

app.use((req, res, next) => {
  console.log('Enter CORS');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, DELETE, OPTIONS, PUT'
  );
  next();
});

app.options('*', cors()); // include before other routes

app.post('/api/analyze', (req, res, next) => {
  console.log('Rota');
  console.log(req.files);
  if (!req.files) {
    return res.status(400).send('No files were uploaded.');
  }
  let file = req.files.file;
  uploadPath = __dirname + '\\uploads\\' + new Date().getTime() + '.jpg';
  file.mv(uploadPath, async () => {
    recognizeForm(uploadPath).then((result) => {
      return res.status(200).json({
        output: result,
      });
    });
  });
});

async function recognizeForm(file) {
  const endpoint =
    'https://handson-mba-fiap-form-ale.cognitiveservices.azure.com/';
  const apiKey = '827bff0b7e224350a86ce0d5588b9355';
  console.log('Entering Forms Recognizer');

  let fileStream = fs.createReadStream(file);

  const client = new FormRecognizerClient(
    endpoint,
    new AzureKeyCredential(apiKey)
  );

  const poller = await client.beginRecognizeReceipts(fileStream, {
    contentType: 'image/jpeg',
    onProgress: (state) => {
      console.log(`status: ${state.status}`);
    },
  });

  const [receipt] = await poller.pollUntilDone();

  console.log('Reconheci recibo:');

  console.log(receipt);
  console.log('-----------------> ITENS <-----------------');

  const forms = await poller.pollUntilDone();

  console.log(forms);

  console.log('Forms:');
  for (const form of forms || []) {
    console.log(`${form.formType}, page range: ${form.pageRange}`);
    console.log('Pages:');
    for (const page of form.pages || []) {
      console.log(`Page number: ${page.pageNumber}`);
      console.log('Tables');
      for (const table of page.tables || []) {
        for (const cell of table.cells) {
          console.log(
            `cell (${cell.rowIndex},${cell.columnIndex}) ${cell.text}`
          );
        }
      }
    }

    console.log('Fields:');
    let items = undefined;
    for (const fieldName in form.fields) {
      // each field is of type FormField
      const field = form.fields[fieldName];
      console.log(
        `Field ${fieldName} has value '${field.value}' with a confidence score of ${field.confidence}`
      );
      console.log('----------------> ITEM <----------------');
      // console.log(typeof field.value);
      if (typeof field.value === 'object') {
        items = field.value;
      }

      // console.log(JSON.stringify(field.value));
      // console.log('Teste');
      // console.log(JSON.stringify(fieldName));
    }
    let newItem = [];
    if (items.length > 0) {
      for (const item in items) {
        newItem.push(items[item]?.value?.Name?.value);
      }
    }
    console.log(newItem);
    // console.log(JSON.stringify(items[0]?.value?.Name?.value));
  }
  fs.unlinkSync(uploadPath);
  return forms;
}
