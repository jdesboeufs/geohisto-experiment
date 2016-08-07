# geohisto-experiment

## Installation

```
npm install
```

## Usage as a JS library

```js
const geohisto = require('./');
const towns = geohisto('towns');

towns.at('2000-01-01').get('46201').name; // Montcuq
towns.at('2016-01-01').get('46201').name; // Montcuq-en-Quercy-Blanc

towns.at('2016-01-01').exists('46201'); // true
towns.at('2016-01-01').exists('46025'); // false

const montcuq = towns.at('2000-01-01').get('46201');
montcuq.isActual(); // false
montcuq.successor.name; // Montcuq-en-Quercy-Blanc
montcuq.successor.isActual(); // true
montcuq.getActual().name; // Montcuq-en-Quercy-Blanc

towns.get('46025').toJSON().endDate; // 2015-12-31
towns.at('now').get('46025'); // null
```

## Start server

```
npm start
```

The service will listen on port 5000.

## Test

```
npm test
```

## License

WTFPL
