import React from 'react'

export const _p = context => __p => context.setState({ __p })
export const $p = context => _ => context.state.__p ? pug`.__debug ${JSON.stringify(context.state.__p, null, 2)}` : null

export default function p (Component) {
  return class extends React.Component {
    componentWillMount() {
      this._p = _p(this)
      this.$p = $p(this)
    }
    render() {
      return (
        <div>
          <Component {...this.props} _p={this._p} />
        </div>
      )

    }
  }
}