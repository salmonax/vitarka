import React from 'react'
import { Link } from 'react-router-dom'

module.exports = props => {
  return <div className='ui secondary pointing menu'>
    <Link className='item' to='/'>Table</Link>
    <Link className='item' to='/tree'>Tree</Link>
    <Link className='item' to='/gant'>Gant</Link>
    <div className='right menu'>
      <a className='ui item'>
        {/* Logout */}
      </a>
    </div>
  </div>
}
