/*
  The original definition of a "turnip" was:
    A gauge used for pacing time-on-task and thwarting procrastination

  This file contains things that pertain to turnip-gauges

 */

import time from './time';

/*
  This returns an object with the current "narrative" position,
  according to my arbitrary divisions.

  It's meant to run continuously.

 */
export function getDiegesis($startHour = 9, $endHour, $adjustedUTC, $odysseyOffset = 7) {
  /*
    Today is:
      Block 1/1 (Block 1 of Stanza) <-- Dash is 1 block on off-sprint day
        (DAY goes here somewhere)
        Stanza 3/3 (Stanza 3 of SPRINT) <-- Same as blocks on off-sprint day
          Sprint 4/4 (Sprint 4 of WEEK)
            Week 2/5 (Week 2 of MONTH)
              Month 2/4 (Month 2 of ARC)
                (YEAR goes here somehow)
                Arc 1/2 (Arc 1 of CHAPTER)
                  CHAPTER 1/3 (CHAPTER 1 of Cycle)
                    Saga 1/4 of ODYSSEY

    For some reason I'm calculating all of these in place rather
    than making functions available to calculate them on the fly,
    but they're all so simple that it probably doesn't matter.
  */
  let today = new Date();
  let adjustedDate = new Date($adjustedUTC);

  const curDecimalMinute = today.getMinutes() / 60;
  const curHour = today.getHours();
  const curMonth = today.getMonth();
  const curYear = today.getYear()%100; // lop off centuries

  // const activeDecimalHours = curHour - $startHour;
  console.log($adjustedUTC);


  // console.error('!#####################', $startHour, $endHour, curHour+24)
  // if (curHour < $startHour && curHour+24 > $endHour) {
  //   console.warn('we are in limbo!');
  // }

  // Note: activeDecimalHours includes decimal minutes
  const activeDecimalHours = (Date.now() - adjustedDate.setHours($startHour, 0)) / 3600000;
  console.log('### diegesis ###',activeDecimalHours, $startHour);

  // Note: hard-coding the '5' hour blocks here
  const curBlock = Math.min(Math.ceil(activeDecimalHours/5),4);
  const curPom = Math.floor((activeDecimalHours*2)%10)+1;


  const decimalHoursInBlock = activeDecimalHours-(curBlock-1)*5;
  const curInterval = (decimalHoursInBlock <= 1.5) ? 1 : (decimalHoursInBlock <= 3.5 ? 2 : 3);

  const dayDate = adjustedDate.getDate();
  // "Monthweek" refers to weeks synced to
  // Multiples of 7 on the calendar
  const curMonthweek = Math.ceil(dayDate/7);

  const dayInWeek = dayDate-(curMonthweek-1)*7;
  const curSprint = Math.ceil(dayInWeek/2);

  const blockInSprint = (dayInWeek-1)*3 - (curSprint-1)*6 + Math.min(curBlock,3);
  const curStanza = Math.ceil(blockInSprint/2);

  const curArc = Math.ceil(curMonth/4);

  const curArcMonth = (curMonth%4) + 1;

  const yearInSaga = curYear%7;
  const curSaga = Math.ceil(yearInSaga/2);

  const chapterInOdyssey = Math.ceil(((yearInSaga-1)*3 + curArc)/2);
  const curChapter = (chapterInOdyssey-1)%3+1;

  // Anchoring these to multiples of 7, but it's so arbitrary
  // That I think I want to move to Chinese Zodiac seasons
  // const $odysseyOffset = 7;
  const curOdyssey = Math.ceil((curYear-7)/7);

  const counts = {
    pom: 5, // in block
    block: 3,
    day: 2, // in sprint
    stanza: 3, // made of blocks, also in sprint
    sprint: 4, // note: fourth is trunkated
    week: 5, // really, monthweek; 5th is truncated
    month: 4, // months in arc, of course
    arc: 3, // arcs in year
    year: 2, // in saga
    chapter: 3, // made of arcs, also in saga
    saga: 4, // in odyssey; 4th is truncated
    odyssey: 3, // These should maybe be 4? (these are 7 year periods)
  };

  const diegesis = {
    _meta: { counts },
    pom: curPom, // ordinal pom from start of block, starting at 1
    interval: curInterval, // placeholder for the current position within a 5 hour block
    block: curBlock, // 5 hours, 3 measured per day
    // day: 0, // day in sprint
    stanza: curStanza, // 2 blocks or 10 hours -- FUCK, I hate these
    sprint: curSprint, // 3 stanzas, 2 days
    week: curMonthweek,
    arc: curArc,
    month: curArcMonth,
    // year: 0, // year in saga
    chapter: curChapter, // 2 arcs, or 8 months -- Yes, I fucking HATE these
    saga: curSaga, // 3 phases, or 2 years
    odyssey: curOdyssey, // 3 sagas and a caesura, 7 years
  };
  // return diegesis;
  const _hash = Object.keys(diegesis).reduce((acc, key) => {
    if (key === '_meta') return acc;
    acc += '-'+diegesis[key];
    return acc;
  }, '');
  return Object.assign(diegesis, { _hash });
}

/*
  This simply divides a daily or block target into three sections.
  The favorIndex determines which index gets the highest value. It
  isn't generalizable: only the center and first values work.

  The idea is that a pacer like this should always be front-loaded,
  giving more room for failure and re-adjustment.
 */

function _allocateTriplet(target, favorIndex, maxValue, maxErrorMsg) {
    const division = Math.floor(target/3);
    let remainder = target%3;
    const output = Array(3).fill(division);

    if (favorIndex === 2)  {
      // So... lazy
      throw new Error('Only first and second favorIndices are supported.');
    }
    if (target > maxValue) {
      throw new Error(maxErrorMsg + ': ' + target);
    }
    if (!remainder) {
      if (target === maxValue) return output;
      output[2]--;
      output[favorIndex]++;
    } else {
      if (remainder === 1) {
          output[favorIndex]++;
      } else {
        while(remainder) output[--remainder]++;
      }
    }
    return output;
}

function allocateBlockTarget(target) {
  return _allocateTriplet(target, 1, 10,
    'Trying to allocate more than the maximum number of time in a block!'
  );
}
function allocateDayTarget(target) {
  return _allocateTriplet(target, 0, 30,
    'Trying to allocate more than the maximum number of time in a day!'
  );
}

export default { getDiegesis, allocateDayTarget, allocateBlockTarget };
