const express = require('express');
const cors = require('cors');
const geohisto = require('./');

const app = express();
const towns = geohisto('towns');

app.use(cors());

app.get('/towns/:code', function (req, res) {
  if (req.query.at) {
    res.send(towns.at(req.query.at).get(req.params.code));
  } else {
    res.send(towns.get(req.params.code));
  }
});

app.listen(process.env.PORT || 5000);
