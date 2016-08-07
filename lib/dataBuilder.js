const request = require('superagent');
const parseCSV = require('csv-parse');
const t = require('through2').obj;
const moment = require('moment');
const fs = require('fs');

const GEOHISTO_TOWNS_URL = 'https://raw.githubusercontent.com/etalab/geohisto/improve-history-support/exports/towns/towns.csv';

const directionMapping = {
  '--': 'actual',
  '<-': 'renamed',
  '<<': 'moved',
  '->': 'merged',
};

function getStreamFromRemote(location = GEOHISTO_TOWNS_URL) {
  console.log('Will load from url %s', location);
  return request
    .get(location)
    .buffer(false);
}

function getStreamFromLocal(location = __dirname + '/../data/towns.csv') {
  console.log('Will load from file %s', location);
  return Promise.resolve(fs.createReadStream(location, 'utf8'));
}

function build(src) {
  let srcStream;

  if (!src) {
    srcStream = getStreamFromRemote();
  } else if (src.indexOf('http') === 0) {
    srcStream = getStreamFromRemote(src);
  } else {
    srcStream = getStreamFromLocal(src);
  }

  return srcStream
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
