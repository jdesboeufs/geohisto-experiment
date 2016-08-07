const moment = require('moment');
const debug = require('debug')('geohisto');

function handleInstant(instant, required = false) {
  if (!instant && required) throw new Error('instant is a required param');
  if (!instant && !required) return;
  if (instant instanceof Date) return instant;
  if (instant === 'now') return new Date();
  return new Date(instant);
}

class Record {
  constructor(attributes) {
    Object.assign(this, attributes);
    this.ancestors = [];
  }

  isValidAt(instant) {
    instant = handleInstant(instant, true);
    let isValid = true;
    if (this.startDate) {
      isValid = isValid && instant >= this.startDate;
    }
    if (this.endDate) {
      isValid = isValid && instant <= this.endDate;
    }
    return isValid;
  }

  isActual() {
    return this.isValidAt('now');
  }

  getActual() {
    if (this.isActual()) return this;
    return this.successor.getActual();
  }

  toJSON() {
    const obj = { name: this.name, code: this.code, status: this.status };
    if (this.startDate) obj.startDate = moment(this.startDate).toJSON().substr(0, 10);
    if (this.endDate) obj.endDate = moment(this.endDate).toJSON().substr(0, 10)
    return obj;
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

function selectByInstant(records, instant) {
  const candidates = records.filter(record => record.isValidAt(instant));
  if (candidates.length === 0) throw new Error('No record found for this instant');
  // if (candidates.length > 1) throw new Error('At least two records match for this instant');
  return candidates[0];
}

function selectMostRecent(records) {
  const candidates = [];
  records.forEach(record => {
    if (record.isActual()) return candidates.push({ distanceFromNow: 0, record });
    const diff = moment().diff(record.endDate, 'days');
    if (diff > 0) candidates.push({ distanceFromNow: diff, record });
  });
  candidates.sort((a, b) => {
    if (a.distanceFromNow === b.distanceFromNow) return 0;
    return (a.distanceFromNow < b.distanceFromNow) ? -1 : 1;
  });
  if (candidates.length === 0) throw new Error('Unable to select the most recent record');
  return candidates[0].record;
}

function getByCode(code, records, options = {}) {
  const instant = handleInstant(options.instant);
  if (!(code in records)) throw new Error('No record for this code');
  if (instant) return selectByInstant(records[code], instant);
  return selectMostRecent(records[code]);
}

function getAll(records, options = {}) {
  const instant = handleInstant(options.instant || 'now');
  const validRecords = [];
  Object.keys(records).forEach(code => {
    if (codeExists(code, records, options)) {
      validRecords.push(getByCode(code, records, options));
    }
  });
  return validRecords;
}

function codeExists(code, records, options = {}) {
  const instant = handleInstant(options.instant || 'now');
  if (!(code in records)) return false;
  const candidates = records[code].filter(record => record.isValidAt(instant));
  if (candidates.length === 0) return false;
  if (candidates.length > 1) throw new Error('At least two records match for this instant');
  return true;
}

function createQueryContext(records, options = {}) {
  if (!records) throw new Error('records is a required param');

  return {
    at: instant => {
      instant = handleInstant(instant, true);
      return createQueryContext(records, Object.assign({}, options, { instant }));
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
