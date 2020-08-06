import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import { withRouter } from 'react-router';
import { observable, action } from 'mobx';

import * as Droid from 'lib/droid';

import '../main.scss';

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
  @observable state

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

  @action.bound navTo(path, state,) {
    this.loadPath(path, state);
    window.history.pushState(undefined, undefined, path);
  }

  @action.bound loadPath(path = window.location.pathname, state) {
    path = path.substr(1);
    if (!this[path]) path = 'main';
    this.path = path;
    this.state = state;
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

  get main() {
    return pug`
      .screen
        h1.center Main
        p.center A2.M3.W3 : S2.1.B2
        br
        p Poms Done Today: 8
        p Saturation: 10:00 
        p Blocks: 20: 25 30 35
        br
        h3 Active Topics
        each topic in this.topics.toJS()
          h4(
            key=topic
            onClick=${e => this.navTo('/topic_start', { topic })}
          )= topic
        br
        h3 Active Books
        each book in this.books.toJS()
          h4(
            key=book
            onClick=${e => this.navTo('/book_start', { book })}
          )= book
        .flex-layer
          .rows
            h1 History
            h1 Config
    `
  }

  get book_start() {
    return pug`
      .screen.start.book
        h1.center Start from Book
        p.center SitAnth
        br
        p Started On: 11/4/2020
        p Progress: 17% (100/250)
        p Avg Rate: 2% per pom
        p Poms Left: 10/50
        p End: 11/27/2020-12/8/2020
        p Accuracy: Missing Records
        br
        h3 Summaries
        p.s 1-4% lettrist psychogeography, guide to detournment
        p.s 4-6% future of detournement, Alba conf, Jorn's great intro
        p.s 6-16% on exclusion, 4th conference, insurrection
        p.s 16-17%, Vaneigem polemics on everyday life, delivered on tape
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

