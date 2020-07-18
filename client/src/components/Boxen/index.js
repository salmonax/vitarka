import yop from 'yop';
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import { observable } from 'mobx';

@inject('common') @observer
export class BlockIntervals extends Component {
  render() {
    const { common: c } = this.props;
    if (!c.parsleyData) return null;

    const sequence = [3,4,3];
    let _count = 0;

    const intervalTurnips = c.intervalTurnips;
    return (
      <div style={prefix({
        display: 'flex',
        position: 'absolute',
        right: 135,
        top: 60,
      })}>
        <div style={{color: 'white', margin: 4, fontSize: 12, opacity: 0.6}}>
          {c.blockStart}
        </div>
        {c.parsleyData && Array(3).fill().map((n, i) => {
          const isCurrentInterval = (c.diegesis.interval - 1 === i);
          return (
            <div key={i}>
              <div
                key={i}
                style={prefix({
                  display: 'flex',
                  margin: 3,
                })}
               >
                {Array(sequence[i]).fill().map((n, j) => {
                  _count++;
                  const isCurrentPom = (c.diegesis.pom === _count);
                  const willBeCurrent = (c.diegesis.pom === _count + 1);
                  const curTask = c.getTaskAtBlockPom(_count);
                  // here's where I would get the color
                  // from Bindu colors
                  return (
                    <div key={j} style={{
                      border: '1px solid ' + (isCurrentPom ? 'white' : 'black'),
                      zIndex: isCurrentPom ? 2 : 1,
                      margin: -1,
                      backgroundColor: isCurrentPom ? '#888' : '#555',
                      width: 15,
                      height: 15,
                    }}>
                      {
                        <div style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: 'blue',
                          WebkitTransition: 'opacity 300ms',
                          // Use BinduColors later for this.
                          opacity: curTask ? 0.3 : 0,
                        }}/>
                      }
                    </div>
                  );
                })}
              </div>
              <div style={prefix({
                 margin: 3,
                 display: 'flex',
                 justifyContent: 'center',
                 alignItems: 'center',
               })}>
                <div style={prefix({
                  margin: -1,
                  marginTop: 2,
                  backgroundColor: '#38a',
                  border: '1px solid ' + (isCurrentInterval ? 'white' : 'black'),
                  height: 18,
                  width: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                })}>
                  {intervalTurnips[i]}
                </div>
              </div>
            </div>
          );
        })}
        {}
        <div style={{color: 'white', margin: 4, fontSize: 12, opacity: 0.6}}>
          {c.blockEnd}
        </div>
      </div>
    )
  }
}

@yop
export class TotalToday {
  render(c) {
    return (
      <div style={prefix({
        position: 'absolute',
        right: 18,
        top: 15,
        fontSize: 50,
        backgroundColor: '#aac',
        width: 100,
        height: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid black',
        pointerEvents: 'none',
      })}>
        <div>
          {c.pomsToday}
        </div>
        <div style={{fontSize: 11}}>
          Today
        </div>
      </div>
    );
  }
}

@yop
export class Blocks {
  render(c) {
    if (!c.parsleyData) return null;

    const { counts, tasks: { decimalMap }} = c.blockInfoToday;
    return (
      <div style={prefix({
        flexDirection: 'row',
        display: 'flex',
        position: 'absolute',
        top: 12,
        right: 135,
      })}>
        {c.blockTurnipsToday.map((value, i) => {
          const blockNum = i + 1;
          const isSelected = blockNum === c.diegesis.block;
          return (
             <div key={i} style={prefix({
               width: 35,
               height: 35,
               margin: 4,
               display: 'flex',
               justifyContent: 'center',
               alignItems: 'center',
               WebkitTransition: 'border-color 300ms, font-weight 300ms, color 300ms, text-shadow 300ms',
               fontWeight: isSelected && 'bold',
               color: isSelected ? 'white' : 'black',
               textShadow: isSelected && '-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black',
               border: '1px solid '+ (isSelected ? 'white' : 'black'),
               backgroundColor: colorMixer([80,143,47],[100,100,100],1-value/6),
             })}>
               {value}
             </div>
           );
        })}
      </div>
    );
  }
}

@yop
export class Sprints {
  render(c) {
    return (
      <div style={prefix({
        position: 'absolute',
        flexDirection: 'row',
        display: 'flex',
        width: 175,
        right: 138,
        top: 82,
      })}>
        {c.parsleyData && Array(c.diegesis._meta.counts.sprint).fill().map((n, i, a) => {
          const isSelected = (c.diegesis.sprint === i + 1)
          return (
            <div
              key={i}
              style={prefix({
                flexGrow: (i === a.length - 1) ? 1 : 2,
                height: 10,
                margin: 3,
                backgroundColor: 'red',
                border: '1px solid ' + (isSelected ? 'white' : 'black'),
            })}/>
          );
        })}
      </div>
    );
  }
}



function colorChannelMixer(colorChannelA, colorChannelB, amountToMix){
    var channelA = colorChannelA*amountToMix;
    var channelB = colorChannelB*(1-amountToMix);
    return parseInt(channelA+channelB);
}
//rgbA and rgbB are arrays, amountToMix ranges from 0.0 to 1.0
//example (red): rgbA = [255,0,0]
function colorMixer(rgbA, rgbB, amountToMix){
    var r = colorChannelMixer(rgbA[0],rgbB[0],amountToMix);
    var g = colorChannelMixer(rgbA[1],rgbB[1],amountToMix);
    var b = colorChannelMixer(rgbA[2],rgbB[2],amountToMix);
    return "rgb("+r+","+g+","+b+")";
}
