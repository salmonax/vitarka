import React from 'react'

export const Row = (props) => {
  return <span className='row'>
    {props.children}
  </span>
}

export const Col = (props) => {
  const styles = {
    flexGrow: 1,
    flexShrink: 0
  }

  if (typeof props.grow !== 'undefined') {
    styles.flexGrow = props.grow
  }

  if (typeof props.shrink !== 'undefined') {
    styles.flexShrink = props.shrink
  }

  return <span style={styles}>
    {props.children}
  </span>
}

export const Padding = (props) => {
  const styles = {
    paddingRight: get('right', 'x', props)
  }

  return <span style={styles}>
    {props.children}
  </span>

  function get (dir, axis, props) {
    if (typeof props[dir] !== void 0) return props[dir]
    if (typeof props[axis] !== void 0) return props[axis]
    if (typeof props['all'] !== void 0) return props['all']
    return 0
  }
}
