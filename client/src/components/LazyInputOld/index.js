import { inject, observer } from 'mobx-react';
import { observable } from 'mobx';
import React, { Component } from 'react';

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

  componentDidMount() {
    window.thing = this;
    this.__lastLength = this._inputRef.innerText.length;
    // this.__lastText = this._inputRef.innerText;
    // 
    this._inputRef.addEventListener('keydown', e => {
      console.log(e.key);
      this._lastKey = e.key;
      window.fuck = e
      this.keyCount += 1;
    }, false);
  }

  _parsleyize(input) {
    if (!input.length) return input;
    const commaSplit = input.split(',');
    if (commaSplit.length <= 2) return input;
    const spaceSplit = commaSplit[0].split(' ');
    if (spaceSplit.length === 1) return input;

    return spaceSplit[0] + '\t' + this.selectedButton + ': ' + spaceSplit.slice(1, spaceSplit.length).join(' ');
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

  _setCaretPosition(pos) {
    const firstNode = this._inputRef.childNodes[0];
    if (!firstNode) return;
    const range = document.createRange();
    var sel = window.getSelection();
    // sel.collapse(this._inputRef.childNodes[0], pos);
    range.setStart(this._inputRef.childNodes[0], pos);
    sel.removeAllRanges();
    sel.addRange(range);
  }



  onChange = (e) => {
    this.changeCount++;
    console.log(e)
    e.persist();
    window.wat = e;
    console.log(Object.keys(e));

    // This is inconsistent; will probably depricate
    // const nativeData = e.nativeEvent.data;

    const wasEnterOrBackspace = 
      // e.nativeEvent.data === null || // deprecate this
      ['Enter', 'Backspace'].includes(this._lastKey);

    let parsleyized = this._parsleyize(e.target.innerText);

    this.futz = wasEnterOrBackspace ? 'wasEnterOrBackspace' : 'was not';

    const lastPos = this._getCaretPosition();
    if (!wasEnterOrBackspace) {
      console.warn(lastPos, this.__lastPos);
      const offset = (this.__lastPos === lastPos) ? 1 : 0;
      this.futz = `${this.__lastPos} ${lastPos}`;
      this._inputRef.innerHTML = parsleyized 
      this._setCaretPosition(lastPos + offset);
      // this.futz = 'normal text type: '
    } else if (parsleyized.length > this.__lastLength) {
      // Uh... checking for three newlines, OR being at the start of the text
      if ((/\n/.test(parsleyized[lastPos-1]) || !parsleyized[lastPos-1]) &&
        /\n/.test(parsleyized[lastPos]) &&
        /\n/.test(parsleyized[lastPos+1])) {
          // this.futz = "triggered slice"
          parsleyized = parsleyized.slice(0, lastPos) + parsleyized.slice(lastPos+1, parsleyized.length);
      }
      this._inputRef.innerHTML = parsleyized;
      this._setCaretPosition(lastPos+1);
    } else {
      // this.futz = 'no trigger slice'
      this._inputRef.innerHTML = parsleyized 
      this._setCaretPosition(lastPos);
      console.warn('deleting');
    }
    this.__lastPos = this._getCaretPosition();
    this.__lastLength = parsleyized.length;
    // this.__lastText = parsleyized;
  }

  _handleClick(topic) {
    this.selectedButton = topic;
  }

  render() {
    return(
      <div style={{color: 'white'}}>
        <div>
          {this.caretPosition}
        </div>
        <div>
          {this.keyCount + ' '}
          {this.changeCount}
        </div>
        <div>
          {this._lastKey}
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
            whiteSpace: 'pre-wrap',
            color: 'white',
            backgroundColor: '#22a',
            padding: 10
          }}
          contentEditable
          onInput={this.onChange}
        >
          Herrow
        </div>

      </div>

    );
  }
}
