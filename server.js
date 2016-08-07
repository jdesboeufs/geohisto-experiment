const express = require('express');
const cors = require('cors');
const geohisto = require('./');

const app = express();
const towns = geohisto('towns');

app.use(cors());

app.get('/towns/:code', function (req, res) {
  let result;
  if (req.query.at) {
    result = towns.at(req.query.at).get(req.params.code);
  } else if (req.query.redirectTo === 'actual') {
    result = towns.get(req.params.code).getActual();
  } else {
    result = towns.get(req.params.code);
  }
  res.json(result);
});

app.listen(process.env.PORT || 5000);
