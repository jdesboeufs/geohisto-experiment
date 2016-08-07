const moment = require('moment');
const debug = require('debug')('geohisto');

class Record {
  constructor(attributes) {
    Object.assign(this, attributes);
    this.ancestors = [];
  }

  isValidAt(moment = new Date()) {
    if (typeof moment === 'string') {
      moment = new Date(moment);
    }
    let isValid = true;
    if (this.startDate) {
      isValid = isValid && moment >= this.startDate;
    }
    if (this.endDate) {
      isValid = isValid && moment <= this.endDate;
    }
    return isValid;
  }

  isActual() {
    return this.isValidAt(new Date());
  }

  getActual() {
    if (this.isActual()) return this;
    return this.successor.getActual();
  }
}

const datasets = {};

function getDataset(name) {
  if (!(name in datasets)) {
    const records = datasets[name] = {};

    let successionCandidates;
    let noSuccessorFound = 0;

    function findImmediateSuccessor(record) {
      const tomorrow = moment.utc(record.endDate).add(1, 'days').toDate();

      let i = successionCandidates.length - 1;
      let immediateSuccessor;

      do {
        const candidate = successionCandidates[i];
        if ((!candidate.startDate || candidate.startDate <= tomorrow) && (!candidate.endDate || candidate.endDate > tomorrow)) {
          immediateSuccessor = candidate;
        }
        i--;
      } while (!immediateSuccessor && i >= 0);

      return immediateSuccessor;
    }

    require(`./data/${name}.json`).forEach(rawRecord => {
      if (rawRecord.startDate) {
        rawRecord.startDate = new Date(rawRecord.startDate);
      }
      if (rawRecord.endDate) {
        rawRecord.endDate = new Date(rawRecord.endDate);
      }

      const record = new Record(rawRecord);
      let successor;

      // Ancestors and successor
      if (record.status === 'actual') {
        successionCandidates = [record];
      } else {
        successor = findImmediateSuccessor(record);
        if (successor) {
          record.successor = successor
          successor.ancestors.push(record);
        } else {
          debug('Warning: %s (%s) has no successor after %s', record.name, record.code, moment(record.endDate).format('YYYY-MM-DD'));
          noSuccessorFound++;
        }
        successionCandidates.push(record);
      }

      // Insert
      if (!(record.code in records)) {
        records[record.code] = [];
      }
      records[record.code].push(new Record(record));
    });
    if (noSuccessorFound > 0) debug('Warning: %d ended records without successor', noSuccessorFound);
  }
  return datasets[name];
}

function getByCode(code, records, options = {}) {
  const moment = options.moment || new Date();
  if (!(code in records)) throw new Error('No record for this code');
  const candidates = records[code].filter(record => record.isValidAt(moment));
  if (candidates.length === 0) throw new Error('No record found for this moment');
  // if (candidates.length > 1) throw new Error('At least two records match for this moment');
  return candidates[0];
}

function getAll(records, options = {}) {
  const moment = options.moment || new Date();
  const validRecords = [];
  Object.keys(records).forEach(code => {
    if (codeExists(code, records, options)) {
      validRecords.push(getByCode(code, records, options));
    }
  });
  return validRecords;
}

function codeExists(code, records, options = {}) {
  const moment = options.moment || new Date();
  if (!(code in records)) return false;
  const candidates = records[code].filter(record => record.isValidAt(moment));
  if (candidates.length === 0) return false;
  if (candidates.length > 1) throw new Error('At least two records match for this moment');
  return true;
}

function createQueryContext(records, options = {}) {
  if (!records) throw new Error('records is a required param');

  return {
    at: moment => {
      if (typeof moment === 'string') {
        moment = new Date(moment);
      }
      return createQueryContext(records, Object.assign({}, options, { moment }));
    },
    get: code => getByCode(code, records, options),
    getAll: () => getAll(records, options),
    exists: code => codeExists(code, records, options)
  };
}

function geohisto(name) {
  return createQueryContext(getDataset(name));
}

module.exports = geohisto;
