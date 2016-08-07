const request = require('superagent');
const parseCSV = require('csv-parse');
const t = require('through2').obj;
const moment = require('moment');
const fs = require('fs');

const GEOHISTO_TOWNS_URL = 'https://raw.githubusercontent.com/etalab/geohisto/master/exports/towns/towns.csv';

const directionMapping = {
  '--': 'actual',
  '<-': 'renamed',
  '<<': 'moved',
  '->': 'merged',
};

function build(options = {}) {
  return request
    .get(GEOHISTO_TOWNS_URL)
    .buffer(false)
    .then(response => {
      const records = [];
      return new Promise((resolve, reject) => {
        response
          .on('error', reject)
          .pipe(parseCSV({ columns: true }))
          .on('error', reject)
          .pipe(t((chunk, enc, cb) => {
            const record = {
              code: chunk.INSEE_CODE,
              name: chunk.NAME,
              status: directionMapping[chunk.DIRECTION],
            };
            if (chunk.START_DATE !== '1943-01-01') {
              record.startDate = chunk.START_DATE;
            }
            if (chunk.END_DATE !== '2020-01-01') {
              record.endDate = moment.utc(chunk.END_DATE).subtract(1, 'days').toJSON().substr(0, 10);
            }
            records.push(record);
            cb();
          }))
          .on('finish', () => resolve({ records }));
      })
      .then(data => {
        fs.writeFileSync(__dirname + '/../data/towns.json', JSON.stringify(data.records, true, 2));
      });
    });
}

module.exports = { build };
