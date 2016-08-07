const geohisto = require('../');
const test = require('tape');

test('towns', t => {
  t.plan(14);
  const towns = geohisto('towns');

  t.equal(towns.at('2000-01-01').get('46201').name, 'Montcuq');
  t.equal(towns.at('2016-01-01').get('46201').name, 'Montcuq-en-Quercy-Blanc');
  t.equal(towns.at('2016-06-01').get('46201').name, 'Montcuq-en-Quercy-Blanc');

  t.equal(towns.at('2016-01-01').exists('46201'), true);
  t.equal(towns.at('2016-01-01').exists('46025'), false);

  const montcuq = towns.at('2000-01-01').get('46201');
  t.equal(montcuq.isActual(), false);
  t.equal(montcuq.successor.name, 'Montcuq-en-Quercy-Blanc');
  t.equal(montcuq.successor.isActual(), true);
  t.equal(montcuq.getActual().name, 'Montcuq-en-Quercy-Blanc');

  t.equal(towns.get('46025').name, 'Belmontet');
  t.equal(towns.get('46025').toJSON().endDate, '2015-12-31');

  t.equal(towns.at('now').get('46025'), null);

  t.equal(towns.at('1943-01-01').exists('37261'), true);
  t.equal(towns.at('1943-01-01').get('37261').name, 'Tours');

  // t.equal(towns.at('2004-01-01').getAll().length, 36568 + 45); // Towns + 45 municipal arrondissements
});
