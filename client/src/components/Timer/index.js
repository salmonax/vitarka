import yop from 'yop';
import React from 'react';
import prefix from 'react-prefixer';


@yop 
export default class Timer {
  render(c) {
    return (
      <div 
        style={prefix({
          position: 'relative',
          zIndex: 3,
          backgroundColor: '#a23',
          opacity: c.syncState.isTimerActive ? 0.9 : 0,
          pointerEvents: c.syncState.isTimerActive ? 'auto' : 'none',
          WebkitTransition: 'opacity 500ms',
          width: '100vw',
          color: 'white',
          height: '100vh',
          fontSize: 75,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        })}>
        {c.elapsed}
        <div style={{paddingTop: 10, fontSize: 24}}>
          {c.money}
        </div>
      </div>
    );
  }
}