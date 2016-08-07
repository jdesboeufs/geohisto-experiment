const express = require('express');
const cors = require('cors');
const geohisto = require('./');

const app = express();
const towns = geohisto('towns');

app.use(cors());

app.get('/towns', function (req, res) {
  res.send(towns.at(req.query.at).get(req.query.code));
});

app.listen(process.env.PORT || 5000);
