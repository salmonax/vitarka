// import yop from 'yop';
import React from 'react';
import { observable, reaction } from 'mobx';

import { inject, observer } from 'mobx-react';

const googleKey = process.env.GOOGLE_BOOKS;
import axios from 'axios';
window.wat = {};

import classList from 'react-classlist-helper';
import './index.scss';

import Highcharts from 'highcharts';
import uuid from 'uuid'
/*
  {
    matches: [
      {
        title: ''
        subtitle: '',
        authors: []
        pageCount: 300
        industryIdentifiers: [],
        imageLinks: {}
        pageCount
      }
      ...
    ]
    data: {
      tasks:
      page:
      percent:
    }
  }


 */

@inject('common') @observer
class BookChart extends React.Component {
  chartInfo = {
    chart: {
      backgroundColor: 'transparent',
      color: 'white',
    },
    credits: {
      enabled: false,
    },
    title: {
        text: 'Selected Book',
        style: {
          color: 'white',
        }
        // enabled: false,
        // text: 'Solar Employment Growth by Sector, 2010-2016'
    },
    xAxis: {
      title: {
        style: { color: 'white' },
      },
      labels: {
        style: { color: 'white'},
      }
    },

    yAxis: {
        labels: {
          style: { color: 'white' },
        },
        title: {
            text: 'Number of Pages',
            style: { color: 'white' },
        }
    },
    legend: {
        enabled: false,
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle'
    },

    plotOptions: {
        series: {
            label: {
                connectorAllowed: false
            },
            pointStart: 2010
        }
    },

    series: [{
        name: 'Installation',
        data: [[2001, 43934], [2002, 52503], [2008, 57177], [2009, 69658]]
    }]
  }

  componentWillMount() {
    this.id = uuid.v4();
  }
  componentDidMount() {
    window.wat = this;
    this.chart = Highcharts.chart(this.id, this.chartInfo);

    reaction(() => this.props.common.selectedBook, text => {
      this.chart.setTitle({ text }, null, true);
      this.data = this._formatBurndownChartData();
      // this.chart.yAxis[0].setExtremes(0, this.data.maxBound);
      // console.log(this.data.maxBound);
      this.chart.xAxis[0].update({ min: 0 });
      this.chart.yAxis[0].update({ min: 0, max: this.data.maxBound, tickInterval: 20 });
      this.chart.series[0].setData(this.data.pointsActual,true);
      this.chart.addSeries([]);
      this.chart.series[1].setData(this.data.pointsIfDaily,true);
      this.chart.addSeries([]);
      this.chart.series[2].setData(this.data.pointsIfWeekly,true);

    });
  }

  _formatBurndownChartData() {
    // Not bothering to wait for parsleyData;
    // If the user has clicked a book, it's presumed
    // that the data has already been loaded
    const { common: c } = this.props;
    const bookData = c.parsleyData.media[c.selectedBook];
    const { goal, tasks } = bookData;
    // Parsley sorts tasks by progress
    let byDate = {};
    let minUtc = Infinity;
    for (let task of tasks) {
      const utc = Date.parse(task.date);
      minUtc = Math.min(minUtc, utc);
      byDate[utc] = byDate[utc] ?
        Math.max(byDate[utc], task.progress) :
        task.progress;
    }
    window.shit = byDate;
    window.minUtc = minUtc;
    minUtc = minUtc-8.64e7;
    const pointsActual = Object.keys(byDate).map(n => [(+n - minUtc)/8.64e7/7, goal - byDate[n]]);
    pointsActual.unshift([0, goal]);

    // Need to add day
    const pointsIfDaily = Object.keys(byDate).map((n, i) => {
      return [i/7, goal - byDate[n]];
    });

    // Nee dto add week
    const pointsIfWeekly = Object.keys(byDate).map((n, i) => {
      return [i, goal - byDate[n]];
    })
    const maxBound = goal;
    return { pointsActual, maxBound, pointsIfWeekly, pointsIfDaily };
    // Object.keys(byDate).map(date => {
    // })
    /*
      {
        actualOutput: [
          [daysFromStart, pagesLeft],
          [daysFromStart, pagesLeft],
        ],
        everydayOutput: [
          [daysFromStart, pagesLeft],
          [daysFromStart, pagesLeft],
        ]
      }
    */
  }

  render() {
    return pug`
      .book-chart-component
        .chart(id=${this.id} style=${{
          width: 300,
          height: 200,
        }}) Hello
    `;

  }
}


class BoringCache {
  constructor(topKey) {
    this.topKey = topKey;
    this._cache = this._load(topKey) || {};
  }
  _load() { return JSON.parse(window.localStorage.getItem(this.topKey)); }
  get(key) {
    return this._cache[key];
  }
  getThumb(key) {
    const book = this._cache[key];
    if (!book || typeof book === 'string') return book;
    return book[0].imageLinks.smallThumbnail;
  }
  all() {
    return this._cache;
  }
  set(key, val) {
    this._cache[key] = val;
    window.localStorage.setItem(this.topKey, JSON.stringify(this._cache));
  }
}
const $boringCache = window.bc = new BoringCache('__vitarka_cache__');

@inject('common') @observer
export default class BookCovers extends React.Component {
  @observable isThumbLoadedAt = []
  @observable thumbSrcs = []
  @observable isThumbnailLoaded = false
  @observable thumbnailSrc
  @observable thumbSrcsByTitle = {}
  @observable titles = []
  __onBookDataCbs = []

  _pluckTitlesFromMedia(media) {
    return Object.keys(media).map(maybeTitle => media[maybeTitle].title || maybeTitle);
  }
  componentDidMount() {
    window.b = this;
    const { common } = this.props;
    // Bit of a bad pattern.. This needs to be
    // removed on unmount, and reactions would provide
    // the same sort of functionality.
    common.onParsleyData(parsleyData => {
      console.log(parsleyData);

      const titles = this._pluckTitlesFromMedia(parsleyData.media);
      console.error(titles);

      this._loadThumbnails(titles)
      .then(googleData => {
         console.error('!!!!!!');
         // holy shit man, fix this!
         // 2020: Wait, fix WHAT?!
         this._initBookItems(parsleyData.media, googleData);
         this.forceUpdate();
      })
      

      // this._onBookData((bookData) => {
      //   console.error('DATA IS LOADED HOSS', bookData);
      // });

      
    });
  }

  _pagesReadToday() {
    if (!parsleyData) return 0;
    const { common: c } = this.props;
    const { media } = parsleyData;
    let readToday = {} 
    c.tasksToday.filter(n => n.media).forEach(n => {
      readToday[n.media] = true;
    });
    let count;
  } 
  
  _onBookData(func) {
    this.__onBookDataCbs.push(func)
  }
  __runBookDataCbs(data) {
    this.onBookDataCbs.forEach(func => {
      if (typeof func === 'function') {
        func(data);
      }
    })
  }

  _initBookItems(media, googleData) {
    let count = 0;
    console.log('??', googleData);

    for (let title in media) {
      const book = media[title];
      if (book.goal) {
        console.log('####', title)
        const progToDate = book.tasks[book.tasks.length-1].progress;
        const pomsToDate = book.tasks.reduce((acc, n) => acc+(+n.duration), 0);
        const progPerPom = progToDate/pomsToDate;
        // not on a map, so won't render the component
        book.vitarka = {
          progPerPom,
          pomsToDate,
          pomsLeft: Math.round((book.goal-progToDate)/progPerPom),
        }
      } else {
        console.log(book);
      }

      count++;
    }
  }
  // yuck, move elsewhere; think about making a book model.
  __getUniqueDates(book) {
    let dates = {}
    book.tasks.forEach(task => {
      if (!dates[task.date]) {
        dates[task.date] = [];
      }
      dates[task.date].push(task);
    });
    return dates;
  }

  _searchBooks(title) {
    const { __search } = this
    return (this._books ?
    __search(title) :
    (this._clientPromise || this.__loadBookClient()).then(books => __search(title, books)))
  }
  __search = (title, books = this._books) => {
    return books.volumes.list({ q: title, maxResults: 3 }).then(data => {
      return data.result.items;
    });
  }
  __loadBookClient() {
    let _resolve;
    this._clientPromise = new Promise(r => _resolve = r);
    gapi.load('client', () => {
      gapi.client.setApiKey(googleKey);
      gapi.client.load('https://www.googleapis.com/discovery/v1/apis/books/v1/rest').then(n => {
        this._books = gapi.client.books;
        _resolve(this._books)
      });
    });
    return this._clientPromise;
  }

  _fetchItems(title) {
    return this._searchBooks(title).then(items => {
      window.items = items;
      // return items[0].volumeInfo.imageLinks.smallThumbnail;
      return items;
    });
  }

  /*
    parsleyData[title]
      .startDate
      .lastDate
      .pomsToDate
      .pagesPerPom
      .pomsLeft
      .google
        .pageCount
        .authors
        .imageLinks
   */

  /*
    This is cleverly designed to use $magicCache instead of
    either loading the Google client or pinging the Google Books
    API five hundred million times.
   */
  __pushViewThumb(thumb, title) {
    // This is gross, but it's better here for now
     this.thumbSrcs.push(thumb);
     this.titles.push(title);
    // The ONLY reason this exists is to do a check for
    // an already existing thumb on pomsheet update
     this.thumbSrcsByTitle[title] = thumb;
  }
  _loadThumbnails(titles) {
    // For this to run efficiently on every update,
    // it should definitely be rewritten.
    // It also won't bother to delete items if they've
    // been removed from the pomsheet on each update,
    // but this isn't really something that usually happens
    const allDonePromises = [];
    titles.forEach((title, i) => {
      const thumb = $boringCache.getThumb(title);
      let _resolve;
      let _promise = new Promise(_r => _resolve = _r);
      allDonePromises.push(_promise);
      if (this.thumbSrcsByTitle[title]) {
        _resolve();
        return;
      }
      if (thumb) {
        console.warn('Wonderful, hit the cache!');
        _resolve();
        this.__pushViewThumb(thumb, title);
        return;
      }
      (this._clientPromise || this.__loadBookClient())
      .then(_ => this._fetchItems(title))
      .then(items => {
        const resultsToSave = items.map(({ volumeInfo }) => {
          let { title, authors, imageLinks, pageCount } = volumeInfo;
          if (!imageLinks) {
            // TOTALLY wasteful; push this to $boringCache later
            imageLinks = {
              smallThumbnail: '/static/unknown-book.jpeg',
            };
          }
          return { title, authors, imageLinks, pageCount };
        });
        $boringCache.set(title, resultsToSave);
        _resolve();
        let thumb = resultsToSave[0].imageLinks.smallThumbnail;
        this.__pushViewThumb(thumb, title);
      })
      .catch(err => {
        console.error('what the fuck!' + err);
        this.lastFocusTime = "I shat myself again " + err;
      });
    });
    return Promise.all(allDonePromises).then(_ => $boringCache.all());
  }
  _getTitleInfo(title) {
    const { common: c } = this.props;
    if (!c.parsleyData) return {};
    const { media } = c.parsleyData;
    // TODO: don't like this implementation in parsley.
    // Consider keying parsleyData.media to the full title
    // instead of keeping an aliasMap
    return media[title] || media[c.parsleyData.aliasMap[title]];
  }

  render() {
    const { common: c } = this.props;

    console.error('__rendered book covers___');
    return (
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
      }}>
        <BookDetails/>
        <GoalSelector/>
        <div>
          Pages read today
        </div>
        {this.thumbSrcs.map((src,i) => {
          const parsleyBook = this._getTitleInfo(this.titles[i]);
          return (
            <div 
              key={i}
              style={{
                position: 'relative',
              }}
            >
              <img 
                title={this.titles[i]}
                onMouseOver={() => {
                  const bookInfo = this._getTitleInfo(this.titles[i]);
                  console.log(bookInfo);
                  console.log(bookInfo.tasks.map(n => n.description).join('\n'))
                }}
                onClick={() => {
                  c.selectedBook = this.titles[i]
                  console.log(this.titles[i]);
                }}
                key={i} 
                style={{
                height: 192,
                border: '1px solid black',
                margin: 4,
                opacity: this.isThumbnailLoaded ? 1 : 0,
                transition: 'opacity 400ms linear',
              }} src={src} onLoad={() => {
                this.isThumbnailLoaded = true;
              }}/>
              {
                <div style={{
                  display: 'flex',
                  border: '1px solid black',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: 4,
                  marginBottom: 8,
                  width: 24,
                  height: 24,
                  zIndex: 1,
                  opacity: this.isThumbnailLoaded ? 0.9 : 0,
                  position: 'absolute',
                  color: 'white',
                  bottom: 0,
                  right: 0,
                  transition: 'opacity 400ms linear',
                  backgroundColor: '#a35',
                }}>
                {parsleyBook && parsleyBook.vitarka && parsleyBook.vitarka.pomsLeft}
              </div>
              }
            </div>
          );
        })}
      </div>
    );
  }
}




@inject('common') @observer
class BookDetails extends React.Component {

  render() {
    const { common: c } = this.props;
    return pug`
      .book-details-component(style=${{
         position: 'absolute',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         right: 20,
         bottom: 20,
         height: 300,
         width: 400,
         background: 'green',
         zIndex: 30,
      }})
        BookChart
    `
  }
}

@inject('common') @observer
class GoalSelector extends React.Component {
  @observable isActivePeriod = true
  render() {
    const { common: c } = this.props;
    if (!c.diegesis) return null;
    const { counts } = c.diegesis._meta;
    return pug`
      .goal-selector-component(style=${{
        position: 'absolute',
        left: 20,
        bottom: 20,
        background: 'orange',
        width: 400,
        height: 250,
        zIndex: 20,
      }}) 
        .stuff-container(style=${{boxSizing: 'border-box', padding: 5, height: 30}})
          .book-label ${c.selectedBook}
        .goal-selector-container(style=${{
          display: 'flex',
        }})
          .button-container
            ${Array(counts.arc).fill().map((n, arcIndex) => {
              return pug`
                .goal-button(
                  className=${classList({
                    active: c.diegesis.arc === arcIndex + 1,
                  })}
                  key=${arcIndex}
                  style=${{
                    margin: 5,
                    padding: 10,
                    background: '#aa0',
                  }}
                ) Arc ${arcIndex+1}
              `;
            })}
          .button-container
            ${Array(counts.month).fill().map((n, monthIndex) => {
              const isActive = c.diegesis.month === monthIndex + 1;
              const isInactive = this.isActivePeriod && 
                c.diegesis.month > monthIndex + 1;
              return pug`
                .goal-button(
                  className=${classList({
                    active: isActive,
                    inactive: isInactive, 
                  })}
                  key=${monthIndex}
                  style=${{
                    margin: 5,
                    padding: 10,
                    background: '#0aa',  
                  }}
                ) Month ${monthIndex+1}
            `;
          })}
          .button-container
            ${Array(counts.week).fill().map((n, weekIndex) => {
              const isActive = c.diegesis.week === weekIndex + 1;
              const isInactive = this.isActivePeriod && 
                c.diegesis.week > weekIndex + 1;
              return pug`
                .goal-button(
                  className=${classList({
                    active: isActive,
                    inactive: isInactive,
                  })}
                  key=${weekIndex}
                  style=${{
                    margin: 5,
                    padding: 10,
                    background: '#0aa',  
                  }}
                ) Week ${weekIndex+1}
            `;
          })}
          .button-container
            ${Array(counts.sprint).fill().map((n, sprintIndex) => {
              const isActive = c.diegesis.sprint === sprintIndex + 1;
              const isInactive = this.isActivePeriod && 
                c.diegesis.sprint > sprintIndex + 1;
              return pug`
                .goal-button(
                  className=${classList({
                     active: isActive,
                     inactive: isInactive,
                   })}
                  key=${sprintIndex}
                  style=${{
                    margin: 5,
                    padding: 10,
                    background: '#a0a',  
                  }}
                ) Sprint ${sprintIndex+1}
            `;
          })}

    `
  }


}