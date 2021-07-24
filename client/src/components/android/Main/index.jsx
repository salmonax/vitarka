import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import { withRouter } from 'react-router';
import { observable, action, computed } from 'mobx';

import * as Droid from 'lib/droid';
import time from 'lib/time';

import '../main.scss';
import './index.scss';

const NBSP = '\u00A0';

const TimerProgress = props => pug`
  .flex-layer
    h1.center 23:43:12
    h2.center - 4 +
    br.dx
    .rows
      h1 Break
      h1 &nbspPause
      h1(onClick=${props.end}) &nbspEnd
`;

const Setting = ({ label }) => pug`
  .rows.wide
    p {label}
    p On/Off
`;

const NotificationSettings = props => pug`
  Setting(label='Hourly Chime')
  Setting(label='Block Chime')
  Setting(label='Saturation')
`;

@withRouter @inject('common') @observer
export default class Main extends Component {
  @observable path = 'main'
  @observable navState = null
  @observable books = `
    Pro TypeScript
    Effective TypeScript
    On Anarchism
    SitAnth
  `.trim().split('\n').map(n => n.trim())
  @observable topics = `
    Code
    Metier
    Demi
    Journal Writing
    Sprint Planning
  `.trim().split('\n').map(n => n.trim())

  @action.bound navTo(path, state) {
    this.loadPath(path, state);
    window.history.pushState(undefined, undefined, path);
  }

  @action.bound loadPath(path = window.location.pathname, navState) {
    path = path.substr(1);
    if (!this[path]) path = 'main';
    this.path = path;
    if (navState) {
      this.navState = navState;
    }
  }

  componentDidMount() {
    window.main = this;
    this.loadPath();
    window.addEventListener('popstate', (e) => this.loadPath());
    Droid.initBackgroundMode();
    this.props.common.onParsleyData(parsleyData => {
      Droid.playBlockBeepsMinutely(parsleyData.latestStartHour());
    });
  }

  @computed get diegesisTitle() {
    const { diegesis } = this.props.common;
    if (!diegesis) return NBSP;
    const { arc, month, week, sprint, day } = this.props.common.diegesis;
    return `A${arc}.M${month}.W${week} : S${sprint}.${day}`;
  }

  @computed get blocksInScratchNotation() {
    const { parsleyData } = this.props.common;
    if (!parsleyData) return NBSP;
    const startHour = parsleyData.latestStartHour();
    return `${startHour}: ${startHour + 5} ${startHour + 10} ${startHour + 15}`;
  }

  @computed get activeBooks() {
    return this.props.common.booksByLastRead
      .map(n => n.title);
  }

  pomsRemaining({ goal, pomsLeft, pomsToDate, weightedPomsLeft }) {
    if (!goal) return '';
    return weightedPomsLeft ? weightedPomsLeft + '/' + (weightedPomsLeft + pomsToDate) :
    `DONE (${pomsToDate} poms)`;
  }
  @observable ppd = 8

  @observable selectedTopicPPD = [0, 0, 0, 0]
  @action setTopicPPD(value, index) {
    this.selectedTopicPPD[index] = value;
  }
  @action setPPD(value) {
    this.ppd = value;
    this.selectedTopicPPD = this.selectedTopicPPD
      .map(n => Math.min(value, n));
  }
  sumOtherPPD(index) {
    return this.selectedTopicPPD
      .reduce((acc, n, i) => index === i ? acc : acc + n, 0);
  }

  get main() {
    const { common } = this.props;
    const media = common.parsleyData && this.activeBooks.length ? common.parsleyData.media : {};
    // NOTE: extract all the garbage the template to methods and otherwise clean it up
    const daysLeft =
      ({ goal, pomsLeft }, ppd = 6) =>
        goal ?
          `${pomsLeft ? '(' + Math.ceil(pomsLeft / ppd) + ' days)' : ''}` :
          '';

    const colorFromBook = (book) => {
      return getColorFromTask(book.tasks[book.tasks.length-1], common.parsleyData.lastUTC, 7);
    };

    return pug`
      .screen
        h1.center Main
        p.center ${this.diegesisTitle}
        p.center ${this.blocksInScratchNotation}
        br
        SprintBurnDown(legend=${true} common=${common} parsleyData=${common.parsleyData} ppd=${this.ppd} diegesis=${common.diegesis})
        p Poms Done Today: ${common.pomsToday}
        // p Saturation: <WIP>
        p Poms Per Day Target: ${this.ppd}
        br
        // h3 Active Topics
        // h4 <WIP>
        // each topic in this.topics.toJS()
        //   h4(
        //     key=topic
        //     onClick=${e => this.navTo('/topic_start', { topic })}
        //   )= topic
        // br
        h3 Active Books
        div(style=${{ minHeight: 72, maxHeight: 280, overflow: 'auto', overflowX: 'hidden' }})
          each book in this.activeBooks
            div(
              key=book
              style={
                display: 'flex',
                height: 20,
                whiteSpace: 'nowrap',
                background: 'red',
                margin: 0,
                alignItems: 'center',
                border: '1px solid black',
                borderBottom: 'unset',
                background: colorFromBook(media[book]),
              }
              onClick=${e => media[book].goal && this.navTo(`/book_start`, { book })}
            )
              h4(
                key=book
                style=${{
                  color: media[book].goal ? 'white' : '#aaa',
                }}
              )
                = book
              h4(style={ marginLeft: 'auto' })
                = this.pomsRemaining(media[book])
              h4(style={ width: (media[book].pomsLeft === 0 ? 20 : 90) })
                = daysLeft(media[book])
        .flex-layer
          input.slider(
            type="range"
            min="0"
            max="30"
            value=${this.ppd}
            onChange=${e => this.setPPD(+e.target.value)})
          // .rows
          //   h1 History
          //   h1 Config
    `
  }

  get book_start() {
    if (!this.navState) {
      // Just temporarily, until I rejigger the rest; move to queryParams!
      this.navState = { book: 'staffeng' };
    }
    // TODO: repattern to obviate this:
    const { parsleyData } = this.props.common;
    const bookData = parsleyData && parsleyData.media[this.navState.book] ?
      parsleyData.media[this.navState.book] :
      null
    window.book = bookData;
    let fullTitle, startedOn, progress, avgRate, pomsLeft, estimatedEnd, summaries, pomsRemaining;
    if (bookData) {
      fullTitle = bookData.title;
      startedOn = bookData.tasks[0].date;
      const { progUnit } = bookData;
      const progressLabel = progUnit === 'percentage' ? '%' : ` of ${bookData.goal} pages`;
      progress = bookData.tasks[bookData.tasks.length - 1].progress + progressLabel;
      avgRate = bookData.weightedProgPerPom.toFixed(1) + (bookData.progUnit === 'percentage' ? '%' : ' pages') + ' per pom';
      summaries = bookData.tasks.map((n, i, a) => {
        const lastProgress = i ? a[i - 1].progress : 0;
        const progress =
          `${progUnit === 'pages' ? 'pp.' : ''}${lastProgress}-${n.progress}${progUnit == 'percentage' ? '%' : ''}`;
        // TODO: temporary kludge; Parsley should be doing this
        let description = n.description.split(',').slice(1).join(',').trim();
        description = description.substr(0, 1).toUpperCase() + description.substr(1);
        return `(${n.duration}) ${description} (${progress})`
      });
      pomsRemaining = this.pomsRemaining(bookData);
    }
    // const fullTitle = bookData &&
    // const startedOn = bookData &&

    // TODO: Refactor this, either with helper functions or changing model
    // const startedOn = bookData.tasks[0]
    const bookDataWithStore = {
      ...bookData,
      common: this.props.common,
    };

    const progAfter = (pomCount, b = bookData) => {
      if (!b) return NBSP;
      return (bookData.progUnite === 'percentage' ? '' : '')
        + Math.round(b.progToDate + b.weightedProgPerPom*pomCount)
        + (bookData.progUnit === 'percentage' ? '%' : '');
    };

    return pug`
      .screen.start.book
        h1.center Start from Book
        p.center ${fullTitle || NBSP}
        br
        p Started On: ${startedOn}
        p Progress: ${progress}
        p Poms Left: ${pomsRemaining}
        p Est Rate: ${avgRate}
        // p End: 11/27/2020-12/8/2020
        // p Accuracy: Unknown
        BookBurnDown(...bookDataWithStore)
        br
        h3 Summaries
        div(style=${{ maxHeight: 219, overflow: 'auto' }})
          each task, i in summaries
            p.s(key=i) ${task}
        .flex-layer
          .rows(style=${{
            margin: '0px 2px',
          }})
            each pomCount in [1,2,4,6]
              .pom-container(
                key=pomCount
                style=${{
                  background: '#4349',
                  border: '1px solid black',
                  margin: 8,
                  padding: 7,
                  paddingBottom: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              )
                h2.prog-after ${progAfter(pomCount)}
                .pom ${pomCount}
          .rows
            h1(
              onClick=${e => this.navTo('/book_running')
      }
            ) Start
    `;
  }

  get book_running() {
    return pug`
      .screen.running.book
        h3.center Running Book
        p.center SitAnth
        p Poms: 4
        p Start Time: 13:25
        p End: 15:30-15:50
        p Reading Range: 18%-20%
        p Poms Left: 10
        p Pauses: 2
        p Pause Time: 5:20
        TimerProgress(
          end=${e => this.navTo('/book_complete')}
        )
    `;

  }

  get book_complete() {
    return pug`
      .screen.complete.book
        h1.center Book Complete
        p.center SitAnth
        p Poms: 4
        p Elapsed: 110 minutes
        p Pauses: 3
        p Pause Time: 15:20

        br
        br.dx
        .flex-layer
          .rows
            h2 18%
            h1 19%
            h2 20%
          br
          input.done(type="text" minLength="0" maxLength="50" spellCheck="false" placeholder="scopes, abstract classes, generics, constraints 5/7")
    `;
  }

  render() {
    return this[this.path];
  }
}

function SprintBurnDown({ common, parsleyData, ppd, diegesis, legend }) {
  if (!parsleyData) return null;
  // assume they're just one task, split as needed, just as with books:
  const day = diegesis.day; // note: this won't update appropriately
  const binduColors = generateBinduColors(parsleyData, 'category');

  const tasks = Array(day).fill().reduce((acc, _, offset) => {
    const daysAgo = day-offset-1;
    return acc.concat(common.tasksDaysAgo(daysAgo));
  }, []);
  const sprintGoal = ppd*2;


  const splitTasks = [];
  const cats = {};
  tasks && tasks.forEach((task, i, a) => {
    const duration = +task.duration;
    const cat = task.category;
    cats[cat] = !cats[cat] ? duration : cats[cat] + duration;
    if (duration === 1) return splitTasks.push({ task, last: true, first: true });
    Array(duration).fill().forEach((_, j) => {
      splitTasks.push({ task, last: j === duration-1, first: j === 0});
    });
  });
  const pomsLeft = Math.max(0, sprintGoal - splitTasks.length);

  // Need to get poms for task; can move this out to somewhere else whenever:
  let legendRef;

  const adjustTransform = () => {
    setTimeout(() => {
      const $legend = document.querySelector('.sprint-burndown-component .legend')
      if (!$legend) return;
      if ($legend.clientWidth >= $legend.scrollWidth) return;
      $legend.style.transform = `scale(${($legend.clientWidth/$legend.scrollWidth).toFixed(2)})`;
    },0);
  }

  adjustTransform();
  return pug`
    .sprint-burndown-component(style=${{
      width: '100%',
    }})
      .legend(
        style=${{
          marginTop: -10,
          display: 'flex',
          opacity: legend ? 1 : 0,
          transformOrigin: '0% 100%',
        }}
      )
        each cat, i in Object.entries(cats).sort((a, b) => a[1] - b[1])
          .cat(
            key=i
            style=${{
              fontSize: 10,
              padding: '0px 0px',
              border: '1px solid black',
              margin: 2,
              marginLeft: 0,
              display: 'flex',
              background: binduColors[cat[0]] || 'red',
              filter: 'saturate(180%) hue-rotate(0deg)',
            }}
          )
            .name(style=${{
              width: '100%',
              // paddingBottom: 1,
              padding: '2px 0px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}) ${cat[0]}
            .count(style=${{
              borderLeft: '1px solid #0008',
              width: 30,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}) ${cat[1]}
      .chart(style=${{
          marginBottom: 10,
          // marginTop: -10,
          position: 'relative',
          overflow: 'hidden',
      }})
        .percentage-container
          each singlePom, i in splitTasks.slice(0, sprintGoal)
              .bar-container(key=i style=${{
                // margin: 0,
                // marginRight: singlePom.last ? 1 : 0,
                // opacity: i%2 ? 1 : 0.9,
                filter: 'saturate(180%) hue-rotate(0deg)',
              }})
                .bar-top(
                  style=${{
                    height: (1 - i/sprintGoal)*100 + '%',
                    background: binduColors[singlePom.task.category],
                    opacity: 0.5,
                  }}
                )
                .bar-body(
                  style=${{
                    height: (1 - (i+1)/sprintGoal)*100 + '%',
                    background: binduColors[singlePom.task.category],
                    writingMode: 'vertical-rl',
                    textOrientation: 'upright',
                    fontSize: 10,
                    letterSpacing: -1,
                    color: '#fff9',
                    textAlign: 'right',
                  }}
                )
                // ${!singlePom.last ? '' : singlePom.task.category[0]}
          each _, i in Array(pomsLeft).fill()
            .bar-forecast(
              key=i
              style=${{
                height: (1 - (i + 1 + splitTasks.length)/sprintGoal)*100 + '%',
              }}
            )
        .mid-bar(style=${{
          position: 'absolute',
          height: '100%',
          width: '1px',
          borderLeft: '1px dashed black',
          left: '50%',
        }})
  `;
}

function BookBurnDown({
  goal, tasks, progToDate, pomsLeft, progPerPom, common, weightedProgPerPom, weightedPomsLeft,
}) {
  const splitTasks = [];
  tasks && tasks.forEach((task, i, a) => {
    const duration = +task.duration;
    if (duration === 1) return splitTasks.push({ task, progress: task.progress });
    const lastProg = !i ? 0 :  a[i-1].progress;
    const progDelta = task.progress-lastProg;
    Array(duration).fill().forEach((_, j) => {
      const pomProg = lastProg+Math.round(progDelta/duration*(j+1));
      splitTasks.push({ task, progress: pomProg });
    });
  });

  if (!goal) return null;
  const weightedBarHeight = (i) =>
    `${(1-(i+1)*weightedProgPerPom/goal-(splitTasks.length*progPerPom/goal))*100}%`;
  const normalBarHeight = (i) =>
  `${(1-(splitTasks.length+i+1)*progPerPom/goal)*100}%`;

  return pug`
    .chart
      .percentage-container
        each singlePom, i in splitTasks
          .bar-container(key=i)
            .bar-top(
              style=${{
                height: (!i ? 100 : (1 - splitTasks[i-1].progress/goal)*100) + '%',
                background: getColorFromTask(singlePom.task, common.parsleyData.lastUTC),
              }}
            )
            .bar-body(
              style=${{
                height: (1 - singlePom.progress/goal)*100 + '%',
                background: getColorFromTask(singlePom.task, common.parsleyData.lastUTC),
              }}
            )
        each _, i in Array(weightedPomsLeft).fill()
          .bar-forecast(
            key=i
            style=${{
              height: weightedBarHeight(i),
            }}
          )
  `;
}

// FOR NOW! It's cool that this is Bindu Colors, RIIIIGHT???
function generateBinduColors(parsley, property) {
  var colors = {}
  var stats = Object.keys(parsley.stats[property]);
  var seed;

  stats.forEach( function(stat) {
    // sums the ascii values of each character in the stat to use as seed
    var charSum = stat.split('').reduce( function(sum,item,i) { return sum + item.charCodeAt()*i+2 },0);
    seed = charSum;

    var color = {
      r: parseInt(seededRandom()*100+50),
      g: parseInt(seededRandom()*100+50),
      b: parseInt(seededRandom()*100+100)
    }
    var colorString = "rgb("+color.r+','+color.g+','+color.b+")";

    colors[stat] = colorString;

    // $("#output").append('<div style="background:'+colorString+'">'+stat+' '+colorString+' '+charSum+'</div>');
  });
  return colors;

  function seededRandom() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }
}

function getColorFromTask(task, nowUTC, hexAlpha = '') {
  const daysAgo = time.countDaysToDate(task.baseDate, nowUTC);
  switch (true) {
    case (daysAgo === 0):
      return '#f93' + hexAlpha; // orange
    case (daysAgo >= -1):
      return '#f3d' + hexAlpha; // pink
    case (daysAgo >= -7):
      return '#b37' + hexAlpha; // rose
    case (daysAgo >= -30):
      return '#75a' + hexAlpha; // purplish
    case (daysAgo >= -90):
      return '#67a' + hexAlpha; // cobalt blue
    case (daysAgo >= -182):
      return '#6a9' + hexAlpha; // lighter teal
    default:
      return '#cba' + hexAlpha; // beige
  }
}