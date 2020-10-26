import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import { withRouter } from 'react-router';
import { observable, action, computed } from 'mobx';

import * as Droid from 'lib/droid';

import '../main.scss';

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

const Setting = ({ label })=> pug`
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
    return this.props.common.booksByLastRead.slice(0, 16).map(n => n.title);
  }

  get main() {
    const { common } = this.props;
    // NOTE: extract all the garbage the template to methods and otherwise clean it up
    const leftOfTotal = (book) => book.pomsLeft ? book.pomsLeft + '/' + (book.pomsLeft + book.pomsToDate) : false;

    return pug`
      .screen
        h1.center Main
        p.center ${this.diegesisTitle}
        p.center ${this.blocksInScratchNotation}
        br
        p Poms Done Today: ${common.pomsToday}
        p Saturation: <WIP>
        br
        h3 Active Topics
        h4 <WIP>
        // each topic in this.topics.toJS()
        //   h4(
        //     key=topic
        //     onClick=${e => this.navTo('/topic_start', { topic })}
        //   )= topic
        br
        h3 Active Books
        each book in this.activeBooks
          div(key=book style={
            display: 'flex',
            height: 16,
          })
            h4(
              key=book
              onClick=${e => this.navTo(`/book_start`, { book })}
            )= book
            h4(style={ marginLeft: 'auto' })
              = common.parsleyData.media[book].pomsLeft !== undefined ? leftOfTotal(common.parsleyData.media[book]) || 'DONE' : ''
            h4(style={ width: (common.parsleyData.media[book].pomsLeft === 0 ? 45 : 90) }) ${common.parsleyData.media[book].pomsLeft ? '('+Math.ceil(common.parsleyData.media[book].pomsLeft/6) + ' days)' : ''}
        .flex-layer
          .rows
            h1 History
            h1 Config
    `
  }

  get book_start() {
    if (!this.navState) {
      // Just temporarily, until I rejigger the rest
      this.navState = { book: 'SitAnth' };
    }
    // TODO: repattern to obviate this:
    const { parsleyData } = this.props.common;
    const bookData = parsleyData && parsleyData.media[this.navState.book] ?
      parsleyData.media[this.navState.book] :
      null
    window.book = bookData;
    let fullTitle, startedOn, progress, avgRate, pomsLeft, estimatedEnd, summaries;
    if (bookData) {
      fullTitle = bookData.title;
      startedOn = bookData.tasks[0].date;
      const { progUnit } = bookData;
      const progressLabel = progUnit === 'percentage' ? '%' : ` of ${bookData.goal} pages`;
      progress = bookData.tasks[bookData.tasks.length - 1].progress + progressLabel;
      avgRate = bookData.progPerPom.toFixed(1) + (bookData.progUnit === 'percentage' ? '%' : ' pages') + ' per pom';
      summaries = bookData.tasks.map((n, i, a) => {
        const lastProgress = i ? a[i-1].progress : 0;
        const progress =
          `${progUnit === 'pages' ? 'pp.' : '' }${lastProgress}-${n.progress}${progUnit == 'percentage' ? '%' : ''}`;
        // TODO: temporary kludge; Parsley should be doing this
        let description = n.description.split(',').slice(1).join(',').trim();
        description = description.substr(0,1).toUpperCase() + description.substr(1);
        return `(${n.duration}) ${description} (${progress})`
      });
    }
    // const fullTitle = bookData &&
    // const startedOn = bookData &&

    // TODO: Refactor this, either with helper functions or changing model
    // const startedOn = bookData.tasks[0]

    return pug`
      .screen.start.book
        h1.center Start from Book
        p.center ${fullTitle || NBSP}
        br
        p Started On: ${startedOn}
        p Progress: ${progress}
        p Avg Rate: ${avgRate}
        p Poms Left: 10/50
        p End: 11/27/2020-12/8/2020
        p Accuracy: Unknown
        br
        h3(style=${{ maxHeight: 290, overflow: 'auto'}}) Summaries
          each task, i in summaries
            p.s(key=i) ${task}
        .flex-layer
          .rows
            h1 1 2 3 4
          .rows
            h1(
              onClick=${
                e => this.navTo('/book_running')
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

