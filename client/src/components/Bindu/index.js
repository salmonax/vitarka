import React, { Component } from 'react';
import './index.scss';
import { inject, observer } from 'mobx-react';

@inject('common') @observer
export default class Bindu extends Component {
  componentDidMount() {
    const { common } = this.props;
    common.onParsleyData(
      (parsleyData) => {
        // Quick fix, but:
        // 1. Should preserve necessary state info for each view, can do quickly in query string
        //      Example: hoursOffset for week

        // NOTE: sneakily using OUR parsley rather than the one provided by
        // legacy Bindu code.
        window.startBindu(common.parsleyData, common.getSunriseFn(), common.getWeatherFn());
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