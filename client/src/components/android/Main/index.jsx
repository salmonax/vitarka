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

  get main() {
    const { common } = this.props;
    const media = common.parsleyData && this.activeBooks.length ? common.parsleyData.media : {};
    // NOTE: extract all the garbage the template to methods and otherwise clean it up
    const daysLeft =
      ({ goal, pomsLeft }, ppd = 6) =>
        goal ?
          `${pomsLeft ? '(' + Math.ceil(pomsLeft / ppd) + ' days)' : ''}` :
          '';

    return pug`
      .screen
        h1.center Main
        p.center ${this.diegesisTitle}
        p.center ${this.blocksInScratchNotation}
        br
        p Poms Done Today: ${common.pomsToday}
        p Saturation: <WIP>
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
        div(style=${{ minHeight: 72, maxHeight: 370, overflow: 'auto', overflowX: 'hidden' }})
          each book in this.activeBooks
            div(key=book style={
              display: 'flex',
              height: 16,
              whiteSpace: 'nowrap',
            })
              h4(
                key=book
                onClick=${e => media[book].goal && this.navTo(`/book_start`, { book })}
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
          .rows
            h1 History
            h1 Config
    `
  }

  get book_start() {
    if (!this.navState) {
      // Just temporarily, until I rejigger the rest; move to queryParams!
      this.navState = { book: 'progphoenix' };
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
      avgRate = bookData.progPerPom.toFixed(1) + (bookData.progUnit === 'percentage' ? '%' : ' pages') + ' per pom';
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
    return pug`
      .screen.start.book
        h1.center Start from Book
        p.center ${fullTitle || NBSP}
        br
        p Started On: ${startedOn}
        p Progress: ${progress}
        p Poms Left: ${pomsRemaining}
        p Avg Rate: ${avgRate}
        // p End: 11/27/2020-12/8/2020
        // p Accuracy: Unknown
        BookBurnDown(...bookDataWithStore)
        br
        h3 Summaries
        div(style=${{ maxHeight: 219, overflow: 'auto' }})
          each task, i in summaries
            p.s(key=i) ${task}
        .flex-layer
          .rows
            h1 1 2 3 4
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
  const getColorFromTask = (splitTask) => {
    const daysAgo = time.countDaysToDate(splitTask.task.baseDate, common.parsleyData.adjustedUTC());
    switch (true) {
      case (daysAgo === 0):
        return '#f93f'; // orange
      case (daysAgo >= -1):
        return '#f3d'; // pink
      case (daysAgo >= -7):
        return '#b37'; // rose
      case (daysAgo >= -30):
        return '#75a'; // purplish
      case (daysAgo >= -90):
        return '#67a'; // cobalt blue
      case (daysAgo >= -182):
        return '#6a9'; // lighter teal
      default:
        return '#cba'; // beige
    }

  }

  if (!goal) return null;
  const weightedBarHeight = (i) =>
    `${(1-(i+1)*weightedProgPerPom/goal-(splitTasks.length*progPerPom/goal))*100}%`;
  const normalBarHeight = (i) =>
  `${(1-(splitTasks.length+i+1)*progPerPom/goal)*100}%`;

  return pug`
    .chart(style=${{
      marginTop: 10,
      marginBottom: -10,
      border: '1px solid black',
      backgroundColor: '#4349',
      width: '100%',
      height: 100,
      color: 'white',
      display: 'flex',
    }})
      .percentage-container(style=${{
        width: '100%',
        // Uncomment following if removing the future-projected bars:
        // width: Math.floor((progToDate/goal)*100) + '%',
        height: '100%',
        display: 'flex',
      }})
        each singlePom, i in splitTasks
          .bar-container(
            key=i
            style=${{
              position: 'relative',
              flexDirection: 'column',
              display: 'flex',
              margin: 0.5,
              marginTop: 'auto',
              marginBottom: 0,
              width: '100%',
              height: '100%',
              justifyContent: 'flex-end',
            }}
            )
            .bar(
              style=${{
                position: 'absolute',
                bottom: 0,
                width: '100%',
                background: getColorFromTask(singlePom),
                opacity: 0.33,
                height: (!i ? 100 : (1 - splitTasks[i-1].progress/goal)*100) + '%',
                background: getColorFromTask(singlePom),
              }}
            )
            .bar(
              style=${{
                position: 'absolute',
                bottom: 0,
                width: '100%',
                height: (1 - singlePom.progress/goal)*100 + '%',
                background: getColorFromTask(singlePom),
              }}
            )
        each _, i in Array(weightedPomsLeft).fill()
          .bar(
            key=i
            style=${{
              display: 'flex',
              margin: 0.5,
              marginTop: 'auto',
              marginBottom: 0,
              width: '100%',
              height: weightedBarHeight(i),
              background: '#9995',
            }}
          )
  `;
}