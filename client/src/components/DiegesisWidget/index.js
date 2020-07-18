import React, { Component } from 'react';
import { observer, inject, computed } from 'mobx-react'

import './index.scss';
import Turnip from 'lib/turnip.js';

window.Turnip = Turnip;

function BoxRow(props) {
  const { count, current, style } = props;
  console.log( current);
  const f = (n) => Array(n).fill();
  return pug`
    .boxes
      ${f(count).map((n, i) => {
        return pug`
          .box(key=${i} style=${{ 
            backgroundColor: current !== i+1 ? null : '#a64'
          }})
        `
      })}
  `;
}

@inject('common') @observer
export default class DiegesisWidget extends Component {
  @observable diegesis = Turnip.getDiegesis()
  diegesisCounts = this.diegesis._meta.counts

  componentDidMount() {
    window.setInterval(() => {
      this.diegesis = Turnip.getDiegesis();
    }, 60000);
    window.wat = this
  }
  render() {
    // const { odyssey, saga, chapter, arc, week, sprint, stanza, block } = this.diegesis;
    const counts = this.diegesisCounts;
    const f = (n) => Array(n).fill();
    // const categories = Object.keys(counts);
    const categories = `block stanza sprint week`.split(' ').reverse();
    return pug`
      .diegesis-widget-component
        ${categories.map((category, i) => pug`
          div(key=${i} className=${category+'-container'})
            | ${category.charAt(0).toUpperCase() + category.slice(1)}
            BoxRow(
              key=${i}
              count=${counts[category]} 
              current=${this.diegesis[category]})
        `)}
    `;
  }
}



            



    //   .odyssey Odyssey ${odyssey}
    //     BoxRow(count=${counts.odyssey} current=${odyssey})
    //   .saga Saga ${saga}
    //     .blocks
    //         ${f(counts.saga).map((n, i) => pug`
    //           div WAT
    //         `)}
    //   .chapter Chapter ${chapter}
    //     .blocks
    //       ${f(counts.chapter).map((n, i) => pug`
    //         div WAT
    //       `)}
    //   .arc Arc ${arc}
    //     .blocks
    //       ${f(counts.arc).map((n, i) => pug`
    //         div WAT
    //       `)}
    //   .week Week ${week}
    //     .blocks
    //       ${f(counts.week).map((n, i) => pug`
    //         div WAT
    //       `)}
    //   .sprint Sprint ${sprint}
    //     .blocks
    //       ${f(counts.sprinta).map((n, i) => pug`
    //         div WAT
    //       `)}
    //   .stanza Stanza ${stanza}
    //     .blocks
    //       ${f(counts.stanza).map((n, i) => pug`
    //         div WAT
    //       `)}
    //   .block Block ${block}
    //     .blocks
    //       ${f(counts.block).map((n, i) => pug`
    //         div WAT
    //       `)}
    // `;