import assert from 'node:assert/strict';
import {remainingTime,studyDeadlines} from '../lib/countdowns.ts';
assert.equal(Date.parse(studyDeadlines[0].target), Date.parse('2026-12-31T18:30:00Z'));
assert.equal(Date.parse(studyDeadlines[1].target), Date.parse('2027-01-31T18:30:00Z'));
assert.deepEqual(remainingTime(studyDeadlines[0].target,Date.parse('2026-12-30T17:28:57Z')),{days:1,hours:1,minutes:1,seconds:3,reached:false});
assert.equal(remainingTime(studyDeadlines[0].target,Date.parse('2026-12-31T18:30:00Z')).reached,true);
assert.equal(remainingTime(studyDeadlines[0].target,Date.parse('2027-01-02T00:00:00Z')).days,0);
console.log('IST countdown dates, units, and expired targets passed.');
