import { observer, inject } from 'mobx-react';
import React, { Component } from 'react';

/*
  Note: this is really bad. There is no attention
  being paid whatever to specific instances of the decorated class!

  This means that you can't add multiple instances with props!
  Pretty much everything in this app that uses this is accruing this 
  kind of technical debt!
 */
export default function yop(Class) {
  return @inject('common')  @observer
  class Yop extends Component {
    constructor(props) {
      super(props);
      Object.keys(this).forEach(key => {
        Class.prototype[key] = this[key];
      })
      Object.keys(Class.prototype).forEach(key => {
        if (key === 'render') {
          this[key] = Class.prototype[key].bind(Class.prototype, this.props.common);
          return;
        }
        this[key] = Class.prototype[key];
      });
    }
  }
}