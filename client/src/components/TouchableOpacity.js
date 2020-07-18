import React from 'react'

export default class TouchableOpacity extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      isTouched: false
    }
  }
  render () {
    const styles = Object.assign({}, this.props.style || {}, {
      opacity: this.state.isTouched ? 0.5 : 1
    })
    return (
      <div
        onTouchStart={() => this.setState({ isTouched: true })}
        onTouchEnd={() => this.setState({ isTouched: false })}
        style={styles}
      >
        {this.props.children}
      </div>
    )
  }
}
