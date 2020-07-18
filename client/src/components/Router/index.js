import React, { Component } from 'react'
import './index.scss'

import { observable } from 'mobx'
import { observer, inject } from 'mobx-react'

import { withRouter } from 'react-router'
import { Route, Switch, Redirect } from 'react-router-dom'

import SitePlanContainer from 'SitePlanContainer'
// import App from 'App'
import ModifyDump from 'ModifyDump'
import SitePlan from 'SitePlan'

import Daily from 'Mobile/Daily'
import MobileMain from 'Mobile'

import initFastClick from 'react-fastclick'

import _DEBUG from 'shared/debug'
const DEBUG = _DEBUG.Router

// initFastClick()

// import ActivityDetail from 'views/ActivityDetail'
// import ActivityTable from 'views/ActivityTable'
// import ActivityTree from 'views/ActivityTree'
// import Gant from 'views/Gant'
// import NavBar from '../NavBar'


@withRouter @inject('common') @observer
export default class Router extends Component {
  constructor (props) {
    super(props)

    props.common.initHistory(props.history)
  }

  componentDidMount () {
    const {history, common} = this.props
    const splash = document.getElementById('preload')
    const app = document.getElementById('app')

    common.initHistory(history)

    splash.addEventListener('transitionend', (e) => {
      document.body.style.overflow = 'visible'
      splash.parentNode.removeChild(splash)
    })
    splash.style.opacity = 0
    if (DEBUG.forceStartRoute) {
      console.warn('Loading DEBUG start route from Router component...')
      this.props.history.push(DEBUG.forceStartRoute)
    }
  }

  render () {
    return (
      <main style={{height: '100%'}}>
        {/* <NavBar */}
        <Switch>
          <Route exact path='/' component={() => <Redirect to='/mobile/daily' />} />
          <Route path='/dump' component={ModifyDump} />
          <Route path='/laydown' component={SitePlanContainer} />
          <Route path='/mobile' component={MobileMain} />
          {/* <Route path='/table' component={ActivityTable} />
          <Route path='/tree' component={ActivityTree} />
          <Route path='/gant' component={Gant} /> */}
        </Switch>
      </main>
    )
  }
}
