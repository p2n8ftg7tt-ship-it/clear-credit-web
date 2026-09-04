/* Este archivo es la fuente local que actualiza el agente diario. */
window.AUTO_RATES_DATA = (() => {
  const rows = [
    ['01','Alabama','AL',5.657,null],['02','Alaska','AK',5.832,null],['04','Arizona','AZ',5.683,null],['05','Arkansas','AR',5.434,null],
    ['06','California','CA',5.613,null],['08','Colorado','CO',5.682,null],['09','Connecticut','CT',5.471,null],['10','Delaware','DE',5.570,null],
    ['11','Distrito de Columbia','DC',5.832,null],['12','Florida','FL',5.419,null],['13','Georgia','GA',5.166,null],['15','Hawái','HI',5.064,null],
    ['16','Idaho','ID',5.731,null],['17','Illinois','IL',5.499,null],['18','Indiana','IN',5.802,null],['19','Iowa','IA',5.232,null],
    ['20','Kansas','KS',6.683,null],['21','Kentucky','KY',6.130,null],['22','Luisiana','LA',6.373,null],['23','Maine','ME',5.094,null],
    ['24','Maryland','MD',5.500,null],['25','Massachusetts','MA',6.255,null],['26','Michigan','MI',5.565,null],['27','Minnesota','MN',5.275,null],
    ['28','Misisipi','MS',5.225,null],['29','Misuri','MO',5.434,null],['30','Montana','MT',4.938,null],['31','Nebraska','NE',5.199,null],
    ['32','Nevada','NV',5.443,null],['33','Nuevo Hampshire','NH',5.675,null],['34','Nueva Jersey','NJ',5.562,null],['35','Nuevo México','NM',5.791,null],
    ['36','Nueva York','NY',5.941,null],['37','Carolina del Norte','NC',4.973,null],['38','Dakota del Norte','ND',5.403,null],['39','Ohio','OH',5.797,null],
    ['40','Oklahoma','OK',5.647,null],['41','Oregón','OR',6.001,null],['42','Pensilvania','PA',6.123,null],['44','Rhode Island','RI',5.539,null],
    ['45','Carolina del Sur','SC',5.452,null],['46','Dakota del Sur','SD',4.985,null],['47','Tennessee','TN',6.486,null],['48','Texas','TX',5.654,null],
    ['49','Utah','UT',6.391,null],['50','Vermont','VT',6.878,null],['51','Virginia','VA',5.252,null],['53','Washington','WA',5.595,null],
    ['54','Virginia Occidental','WV',5.512,null],['55','Wisconsin','WI',6.204,null],['56','Wyoming','WY',5.279,null]
  ];

  return {
    schemaVersion: 1,
    lastUpdated: '2026-08-14',
    retrievedAt: '2026-08-15T09:00:00-04:00',
    source: {
      name: 'MonitorBankRates.com',
      url: 'https://www.monitorbankrates.com/auto-loan-rates/trends',
      attribution: 'Source: MonitorBankRates.com'
    },
    national: {new:5.832,used:6.677},
    states: Object.fromEntries(rows.map(([id,name,abbr,newRate,usedRate]) => [id,{name,abbr,new:newRate,used:usedRate}]))
  };
})();
