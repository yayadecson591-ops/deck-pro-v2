import test from 'node:test';
import assert from 'node:assert/strict';
import { sugraWeatherStatus, fetchSugraWeather } from './sugra-weather-adapter.js';

test('Sugra is classified only as optional weather enrichment',()=>{
  const s=sugraWeatherStatus();
  assert.equal(s.provider,'sugra');
  assert.equal(s.purpose,'weather_enrichment');
  assert.equal(s.sportsOdds,false);
  assert.equal(s.bookmakerExecution,false);
});

test('Sugra adapter fails closed when no server key is configured',async()=>{
  const old=process.env.SUGRA_API_KEY;
  delete process.env.SUGRA_API_KEY;
  try{ assert.deepEqual(await fetchSugraWeather({lat:3.87,lon:11.52}),{ok:false,code:'SUGRA_NOT_CONFIGURED'}); }
  finally{ if(old===undefined) delete process.env.SUGRA_API_KEY; else process.env.SUGRA_API_KEY=old; }
});
