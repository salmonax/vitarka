import { inject, observer } from 'mobx-react';
import { observable, runInAction, action } from 'mobx';
import React, { Component } from 'react';

/*
  The original idea was to have a nice contenteditable with
  autocomplete, but it was too buggy to get working on multiple
  platforms, so I've given up and made this one instead 

*/

@observer
export default class LazyInput extends Component {
  @observable mirror = ''
  @observable activeButtons = `Read Workthrough Play Write`.split(' ');
  @observable selectedButton = 'Read'
  @observable caretPosition = 0
  @observable futz = 'no trigger'
  @observable key = null
  @observable keyCount = 0
  @observable changeCount = 0
  @observable row = 0
  @observable col = 1
  @observable converted = []
  _lastCaretPos = null

  componentDidMount() {
    window.thing = this;
    this._inputRef.addEventListener('keydown', () => {
      setTimeout(() => {
        this.updatePosInfo();
      }, 0)
    });
  }

  _parsleyize(input) {
    if (!input.length) return input;
    const commaSplit = input.split(',');
    if (commaSplit.length <= 2) return input;
    const spaceSplit = commaSplit[0].split(' ');
    if (spaceSplit.length === 1) return input;
    return spaceSplit[0] + '\t' + this.selectedButton + ': ' + spaceSplit.slice(1, spaceSplit.length).join(' ');
  }

  getPos(cb) {
    const sel = document.getSelection();
    window.sel = sel
    const nd = window.wat = sel.anchorNode;
    if (!nd) {
      return { row: 0, col: 0, text: '' };
    }

    const text = nd.textContent.slice(0, sel.focusOffset);


    const row = this._textChildren.findIndex(n => n === nd);
    const col = text.split("\n").pop().length;
    return { row, col, text };
  }

  _getCaretPosition() {

    let caretOffset = 0;

    if (typeof window.getSelection !== "undefined") {
      const selection = window.getSelection();
      const range = selection.rangeCount ? 
        selection.getRangeAt(0) : 
        document.createRange();

      const selected = range.toString().length;
      const preCaretRange = range.cloneRange();

      preCaretRange.selectNodeContents(this._inputRef);
      preCaretRange.setEnd(range.endContainer, range.endOffset);

      const text = this._inputRef.innerText;
      caretOffset = preCaretRange.toString().length - selected;

      // newLineOffset = /\n/.test(text[caretOffset]) ? 1 : 0;
    } else {
      this.caretPosition = 'No window.getSelection()';
    }
    this.caretPosition = caretOffset;
    return caretOffset;
  }


  _restoreCaretPosition(pos) {
    const firstNode = this._inputRef.childNodes[this.row];
    if (!firstNode) return;
    const range = document.createRange();
    var sel = window.getSelection();
    // sel.collapse(this._inputRef.childNodes[0], pos);
    console.warn(this.row);
    range.setStart(this._textChildren[this.row], this.col);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  @action onChange = (e) => {
    const { row, col, text } = this.getPos();
    const curRowCount = this.getRowCount();
    console.warn(curRowCount, this._lastRowCount);
    console.error(curRowCount, this._lastRowCount);

    const lines = this._textChildren.map(n => n.textContent);

    const newConverted = [];
    lines.forEach((line, i) => {
      const found = this.converted.find(n => n.rawText === line);
      if (found) {
        console.log('pushing found', i)
        newConverted.push(found)
      } else {
        console.log('not found, making new', i);
        newConverted.push({
          topic: this.selectedButton,
          date: 'whatever',
          rawText: line,
          parsleyText: this._parsleyize(line),
          valid: false,
        })
      }
    });
    this.converted = newConverted;

    // const line = this._textChildren[row].textContent;

    // if (curRowCount < this._lastRowCount) {
      // console.error('DERRETED', this._lastRow, this.row);
      // const newConverted = [];
      // const lines = this._textChildren.map(n => n.textContent);
      // console.error(lines);
      // for (let i = 0; i < lines.length; i++) {
      //   const found = this.converted.find(n => n.rawText === lines[i]);
      //   console.warn(lines[i], found)
      //   if (found) {
      //     newConverted.push(found);
      //   }
      // }
      // this.converted = newConverted;
    // }
    // if (curRowCount > this._lastRowCount) {
      // console.warn('wewe');
      // const lines = this._textChildren.map(n => n.textContent);
      // this.converted.splice(row-1, 0, {
      //   fuck: 'woo',
      // })
    // }
    


    // this.converted[row] = {
    //   topic: this.selectedButton,
    //   date: 'whatever',
    //   rawText: line,
    //   parsleyText: this._parsleyize(line),
    //   valid: false,
    // }
    this._lastRowCount = curRowCount;
  }

  getRowCount() {
    // Might chang
    return this._textChildren.length;
  }


  _handleClick(topic) {
    console.log(document.activeElement);
    this.selectedButton = topic;
    if (!this.converted.length) return;

    const dataItem = this.converted[this.row];
    if (dataItem) {
      dataItem.topic = topic;
    }
    this._restoreCaretPosition(this._lastCaretPos);
    // Take a look at which row is selected and switch the thing over
    
  }
  __walkChildrenGood(node) {
    function walk(node){
      var output = [];
      for (node = node.firstChild; node ; node = node.nextSibling) {
        if (node.nodeName === '#text') {
          output.push(node);
        } else if (node.nodeName === 'BR') {
          // If it's an empty line, return the parent div rather than the
          // BR itself. This is necessary for returning the caret position
          // correctly.
          // HOWEVER, only push the parent div if there's no other text.
          if (!node.parentNode || !node.parentNode.textContent.length) {
            output.push(node.parentNode);
          }
        } else {
          output = output.concat(walk(node));
        }
      }
      return output;
    }
    return walk(node);
  }

  get _textChildren() {   
    if (!this._inputRef.childNodes.length) return [this._inputRef];
    return this.__walkChildrenGood(this._inputRef);
    // let output = [];
    // this._inputRef.childNodes.forEach((node) => {
    //   // When the contenteditable has been deleted, it will leave a BR
    //   // if this has happened, just return the input ref
    //   if (node.nodeName === 'BR') output.push(this._inputRef);
    //   let candidateNode = node.nodeName === '#text' ? node : node.childNodes[0];
    //   // if it finds a BR, it's a blank line, so just return the parent node
    //   candidateNode = candidateNode.nodeName === 'BR' ? candidateNode.parentNode : candidateNode;
    //   output.push(candidateNode);
    // });
    // return output;
  }

  @action.bound updatePosInfo() {
    const { row, col } = this.getPos();
    this._lastCaretPos = this._getCaretPosition();
    this._lastRow = this.row;
    this.row = row;
    this.col = col;
    if (this.converted.length) {
      if (this.converted[row]) {
        this.selectedButton = this.converted[row].topic;
      }
    }
  }


  render() {
    return(
      <div style={{
        color: 'white',
      }}>
        <pre style={{
          position: 'absolute',
          width: 500,
          marginRight: 100,
          fontSize: 10,
          pointerEvents: 'none',
          right: 0,
          background: 'rgba(100,100,0,0.5)',
          zIndex: 2,
        }}>
          {JSON.stringify(this.converted, null, 8)}
        </pre>
        <div>
          {this.row}
        </div>
        <div>
          {this.col}
        </div>
        <div style={{display: 'flex'}}>
          {this.activeButtons.map((topic, i) => {
            const isSelected = this.selectedButton === topic;
            return (
              <div key={i} style={{
                cursor: 'pointer',
                padding: 10,
                margin: 5,
                color: isSelected ? 'white' : 'black',
                backgroundColor: isSelected ? '#8aa' : '#244',
              }} onClick={e => this._handleClick(topic)}>
                {topic}
              </div>
            )
          })}
        </div>
        <div
          ref={ref => this._inputRef = ref}
          suppressContentEditableWarning={true}
          style={{
            top: 0,
            boxSizing: 'border-box',
            outlineStyle: 'none',
            position: 'absolute',
            height: '50vh',
            width: '100%',
            whiteSpace: 'pre-wrap',
            color: 'white',
            backgroundColor: '#22a',
            padding: 10,
          }}
          contentEditable
          onInput={this.onChange}
          onClick={this.updatePosInfo}
          onTouchStart={this.updatePosInfo}
        >
        </div>
        <div style={{
          boxSizing: 'border-box',
          bottom: 0,
          position: 'absolute',
          height: '50vh',
          width: '100%',
          background: 'orange',
          color: 'black',
          padding: 10,
        }}>
          {this.converted.map(n => {
            return (
              <div style={{whiteSpace: 'pre-wrap'}}>
                {n.parsleyText}
              </div>
            )
          })}
        </div>
      </div>

    );
  }
}
