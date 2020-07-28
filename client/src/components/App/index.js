import React, { Component } from 'react';
import { observer, inject, computed } from 'mobx-react';
import { withRouter } from 'react-router';
import axios from 'axios';

import classList from 'react-classlist-helper';

import { observable, action } from 'mobx';

import prefix from 'react-prefixer';
window.prefix = prefix;

const gapi = window.gapi; // just being honest

import yop from 'yop';
import {
  Blocks,
  Sprints,
  TotalToday,
  BlockIntervals,
 } from 'Boxen';


import Timer from 'Timer';
import BookCovers from 'BookCovers';
import LazyInput from 'LazyInput';
import AndroidMain from 'android/Main';
import Bindu from 'Bindu';


const googleKey = process.env.GOOGLE_BOOKS;
window.axios = axios;

import './index.scss';

import DiegesisWidget from 'DiegesisWidget';

@withRouter @inject('common') @observer
export default class App extends Component {
  @observable lastFocusTime = (new Date()).toLocaleString()
  last = null

  componentDidMount() {
    const { common } = this.props;
    window.c = window._s = common;
    window._app = this;

    common.startNetworkHeartbeat();
    common.loginAndParsley();

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.warn('---- triggered visibility change')
        common.setDiegesisOnChange()
        common.checkAndUpdatePomsheet();
        common.resumeSyncBus();
        this.__lastVisibilityChange = Date.now();
      }
    });
    window.addEventListener('focus', () => {
      // Putting this here because I'm irritated,
      // but it should ideally only
      console.warn('---- triggered focus change');
      if (Date.now() - this.__lastVisibilityChange < 1000) return;
      common.setDiegesisOnChange();
      common.checkAndUpdatePomsheet();
      common.resumeSyncBus();
    });

    window.p = (...args) => { console.log(...args); return args[args.length-1] };

    setTimeout(() => {
      console.log('woot', common.intervalTurnips);
    }, 1500)
  }

  _checkAgent() {
    const { userAgent } = navigator;
    if ( userAgent.match(/Mobile/) && userAgent.match(/Android/)) {
      return 'AndroidPhone';
    } else {
      return 'Desktop';
    }
  }
  _mobileLayout() {
    return (
      <div style={{color: 'white'}}>
        <AndroidMain/>
      </div>

    );
  }


  render() {
    const { common } = this.props;
    console.log('___rendered app___');

    if (this._checkAgent() === 'AndroidPhone') {
      return this._mobileLayout();
    }

    return(
      <Bindu/>
    );

    return(
      <div style={{color: 'white'}}>
        <div className="fuck">
          {this._checkAgent()}
          {' '}Hiyo!
        </div>
        <div style={{
          padding: common.debugText ? 10 : 0,
          fontSize: 20,
          position: 'absolute',
          bottom: 0,
          zIndex: 101,
          background: 'green',
          opacity: 0.8,
          color: 'white',
          width: common.debugText ? '100vw' : 0,
        }}>
          {common.debugText}
        </div>
        <div
          className="overlay-wrapper"
          style={{
            // don't like this but it works for android problem for now
            height: (window.innerHeight / document.body.clientHeight)*100+'vh',
          }}
        >
          <TotalToday/>
          <div>
            <Blocks/>
            <Sprints/>
            <BlockIntervals wat={1}/>
            <BlockIntervals wat={2}/>
          </div>
          <div
            onClick={() => {
              navigator.serviceWorker.controller.postMessage('hello');
              console.log(navigator.serviceWorker.controller);
            }}
            onTouchStart={() => {
              // alert("Touch is working, it's gotta be something else");
              navigator.serviceWorker.controller.postMessage('hello');
              console.log("well, this should show up:", navigator.serviceWorker.controller);
            }}
            style={{
               width: 50,
               height: 50,
               left: 20,
               top: 100,
               position: 'absolute',
               background: 'orange',
               zIndex: 100,
          }}>
          </div>
          <div
            className="timer-button"
            style={prefix({
              position: 'absolute',
              display: 'flex',
              fontSize: 40,
              bottom: 50,
              width: 50,
              height: 50,
              right: 30,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#aab',
              border: '1px solid black',
              padding: 20,
              borderRadius: 100,
              zIndex: 100,
            })}
            onClick={common.handleTimerClick}
          >
            GO
          </div>
          <div
            className='red-header'
            style={prefix({
              backgroundColor: '#a23',
              opacity: 1,
              // pointerEvents: 'none',
              WebkitTransition: 'opacity 500ms',
              width: '100vw',
              color: 'white',
              height: 100,
              border: '1px solid black',
              fontSize: 75,
              display: 'flex',
              position: 'absolute',
              right: 0,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: -1,
            })}></div>
          <Timer/>
          <div style={{ background: 'red'}}>
            {common.money}
          </div>
        </div>
        <div className="app-wrapper">
          <div style={{paddingTop: 100, paddingLeft: 5}}>
            <BookCovers/>
          </div>
          <div>
            <div>{common.bullshit}</div>
            {/*<LazyInput/>*/}
            <pre id="raw-pomsheet" style={{color: 'white'}}>
              {common.rawPomsheet}
            </pre>
          </div>
        </div>
      </div>
    );
  }
}
