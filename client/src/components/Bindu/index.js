import React, { Component } from 'React';
import './index.scss';
import { inject, observer } from 'mobx-react';

@inject('common') @observer
export default class Bindu extends Component {
  componentDidMount() {
    const { common } = this.props;
    common.waitForParsley()
    .then(_ => {
      window.startBindu(common.parsleyData);
    });
    common.onParsleyData(
      () => {
        // Quick fix, but:
        // 1. Should preserve necessary state info for each view, can do quickly in query string
        //      Example: hoursOffset for week
        console.log('$%@#$%@#$%@#$%@#$ %@#$%@#$ %#@$ %@#$ %# um?')
        window.$('#calendar').empty();
        window.startBindu(common.parsleyData);
      }
    );

  }
  render() {
    return pug`
      .bindu-component
        #container
          #output
          #calendar
    `;
  }
}