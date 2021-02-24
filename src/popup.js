import browser from 'webextension-polyfill'


(function (window) {
  'use strict'
  let CalculatorMain = document.querySelector('.calculatorMain')
  let screen = CalculatorMain.querySelector('.calculatorDisplay span')
  let frozen
  let secondActive = false
  let state = CalculatorMain.querySelector('.calculatorRadians')
  let lNeper = CalculatorMain.querySelector('.calculatorlNeper')
  let bracketKey
  let hold = CalculatorMain.querySelector('.calculatorHold')
  let alerts = CalculatorMain.querySelector('.notification')
  let keybrd = {}
  let helpButton = CalculatorMain.querySelector('.calculatorInfo')
  let degreeMode = false
  let parenthesis = 0
  let calculator = []
  let smallKeys = CalculatorMain.querySelector('.calculatorSmaller')
  let pressed
  let memory = 0
  let hidden = CalculatorMain.querySelector('areaHidden')
  let resBuffer = '0'
  let bigger = true // calc size
  let ln = 0
  let buffStr = []
  let sav = ['secondActive', 'deg', 'memory', 'buffStr', 'resBuffer']
  let secondaryKeys = [].slice.call(CalculatorMain.querySelector('.calc-left').children, 12, 20)
  let secondLayer = [
    ['sin', 'cos', 'tan', 'ln', 'sinh', 'cosh', 'tanh', 'e<sup>x</sup>'],
    [
      'sin<sup>-1</sup>',
      'cos<sup>-1</sup>',
      'tan<sup>-1</sup>',
      'log<sub>2</sub>',
      'sinh<sup>-1</sup>',
      'cosh<sup>-1</sup>',
      'tanh<sup>-1</sup>',
      '2<sup>x</sup>',
    ],
  ]
  let Calculator = function () { // for every '(' a new instance
    this.stack = [],
    this.num = 0,
    this.res = 0,
    this.buff = [false, false]

    this.curr = true

    this.rank = {
      '=': 0,
      '+': 1,
      '-': 1,
      '/': 2,
      '*': 2,
      'yx': 3,
      'x√y': 3,
      'EE': 3,
    }
  }

  Calculator.prototype.calc = function (key, val) {
    let rank = this.rank

    if (key === '%') {
      this.curr = 'funk'
      return `${this.stack[0] ? this.stack[this.num - 1][0] / 100 * val : val / 100}`
    }
    key = key.replace('×', '*').replace('÷', '/').replace('–', '-')
    if (key !== '=') {
      this.buff[1] = key
    } else if (this.buff[0] === false) {
      this.buff[0] = val // feed buffer for repeating '='
    }
    if (key === '=' && !this.stack[0] && this.curr && this.buff[1]) { // repeating '='
      return `${this.buff[1] === 'yx' ? Math.pow(val, this.buff[0]) : this.buff[1] === 'x√y'
        ? Math.pow(val, 1 / this.buff[0]) : [1] === 'EE' ? val * Math.pow(10, this.buff[0])
        : eval(`(${val})${this.buff[1]}(${this.buff[0]})`)}`
    }
    if (!this.stack[0] && key !== '=') { 
      this.buff[0] = false
      this.stack[this.num++] = [val, key]
      this.curr = true
      return `${val}`
    }
    if (this.stack[0] && this.curr && this.curr !== 'funk' && key !== '=') { 
      this.stack[this.num - 1] = [val, key]
      return `${val}`
    }
    if (!this.stack[0]) {
      return `${val}`
    }
    if (rank[key] <= rank[this.stack[this.num - 1][1]]) {
      this.stack[this.num - 1] = [
        this.stack[this.num - 1][1] === 'yx' ? Math.pow(this.stack[this.num - 1][0], val)
        : this.stack[this.num - 1][1] === 'x√y' ? Math.pow(this.stack[this.num - 1][0], 1 / val)
        : this.stack[this.num - 1][1] === 'EE' ? this.stack[this.num - 1][0] * Math.pow(10, val)
        : eval(`(${this.stack[this.num - 1][0]})${this.stack[this.num - 1][1]}(${val})`),
        key,
      ]
    }
    if (rank[key] > rank[this.stack[this.num - 1][1]]) {
      this.stack[this.num++] = [val, key]
    } else if (this.stack[this.num - 2] && rank[key] <= rank[this.stack[this.num - 2][1]]) {
      this.calc(key, this.stack[--this.num][0])
    }
    this.res = `${this.stack[this.num - 1] ? this.stack[this.num - 1][0] : this.res}`
    if (key === '=') {
      this.init('AX')
    }
    this.curr = true
    return this.res
  }

  Calculator.prototype.init = function (key) {
    if (key.match(/A/)) {
      this.stack = []
      this.num = 0
    };
    if (key === 'AC') {
      this.buff = [false, false]
    }
    return '0'
  }

  for (let k = 2; k--;) {
    for (let l = CalculatorMain.children[k + 1], m = l.children, n = m.length; n--;) {
      keybrd[l.children[n].textContent.replace(/\s*/g, '')] = l.children[n]
    }
  }
  keybrd['C'] = keybrd['AC']
  keybrd['Rad'] = keybrd['Deg']
  for (let m = secondLayer[0], n = m.length; n--;) {
    keybrd[secondLayer[1][n].replace(/<\/*\w+>/g, '')] = keybrd[m[n]]
  }
  keybrd['2x'] = keybrd['ex']


  calculator[0] = new Calculator();

  (function (localStorage) {
    if (!localStorage || !localStorage['resBuffer']) {
      return
    }
    bigger = localStorage['bigger'] ? eval(localStorage['bigger']) : true
    toggleCalc()
    if (Number(localStorage['ln'])) {
      ln = localStorage['ln']
      switchGrouping()
    }
    try {
      if (!localStorage['secondActive'].match(/false|null/)) {
        keyDown(false, keybrd['2nd'])
        doKey('2nd', true)
      }
      if (eval(localStorage['deg'])) doKey('Deg', true)
      if (localStorage['memory']) {
        render(localStorage['memory'])
        doKey('m+', true)
      }
      render(localStorage['resBuffer'])
      let buffStrX = localStorage['buffStr'].split(',')
      for (let n = 0, m = buffStrX.length; n < m; n++) {
        if (buffStrX[n]) doKey(buffStrX[n], true)
      }
      render(localStorage['resBuffer'])
      resBuffer = localStorage['resBuffer']
    } catch (e) {
      for (let n = sav.length; n--;) {
        localStorage.removeItem(sav[n])
      }
    }
  })(window.localStorage)

  

  document.addEventListener('keypress', function (e) {
    let key = e.which
    let holdKey = hold.textContent
    let keyMatch = (',|.|-|–|/|÷|*|×|#|+/–|x|x!|E|EE|e|ex| |2nd|r|x√y|R|√|p|π|^|yx|\'|yx|"|yx|m|mr|v|mc|b|m+|n|m-|' +
              's|sin|c|cos|t|tan|S|sin-1|C|cos-1|T|tan-1|d|Deg|°|Deg|l|ln|L|log|\\|1/x|X|2x').split('|')
    let keyMatchHold = ('sin|sinh|cos|cosh|tan|tanh|m-|Rand|Deg|Rand|sin-1|sinh-1|cos-1|cosh-1|tan-1|tanh-1|' +
              '1|1/x|2|x2|3|x3|x√y|√|ln|log2|ex|2x').split('|')

    if (key === 13) key = 61
    key = String.fromCharCode(key)
    for (let n = 0, m = keyMatch.length; n < m; n = n + 2) {
      if (key === keyMatch[n]) {
        key = key.replace(key, keyMatch[n + 1])
        break
      }
    }
    if (holdKey) {
      for (let n = 0, m = keyMatchHold.length; n < m; n = n + 2) {
        if (key == keyMatchHold[n]) {
          key = key.replace(key, keyMatchHold[n + 1])
          break
        }
      }
      hold.textContent = ''
    }
    if ((key === 'h' || key === 'H') && !holdKey) hold.textContent = 'hold'
    if (key === 'G' && holdKey) switchGrouping(true)
    if (!keybrd[key]) return false
    if ((key.match(/-1$|log2$|2x$/) && !secondActive) || (key.match(/h$|n$|cos$|ex$/) && secondActive)) {
      keyDown(false, keybrd['2nd'])
      doKey('2nd', true)
    }
    keyDown(false, keybrd[key])
    doKey(key, true)
  }, false)

  document.addEventListener('keydown', function (e) {
    let str = resBuffer.replace(/\s/g, '')
    let strLen = str.split('').length - 1

    toggleOptions()
    if (e.which === 8 && calculator[parenthesis].curr !== true &&
          calculator[parenthesis].curr !== 'funk' && str !== '0') {
      e.preventDefault()
      while (buffStr.length && !keybrd[buffStr[buffStr.length - 1]]) { // bull shit key(s)
        buffStr.pop()
      }
      if (buffStr[buffStr.length - 1] === '+/–') {
        doKey('+/–', true)
        buffStr.pop()
      } // +/-
      else if (resBuffer.match(/\-\d$/) || resBuffer.match(/^\d$/)) {
        buffStr.pop()
        doKey('C', true)
        render('0')
      } else {
        render(str.substring(0, strLen), true)
      }
      buffStr.pop()
      if (buffStr[buffStr.length - 1] === '.') {
        render(str.substring(0, strLen - 1))
        buffStr.pop()
      }
    }
    if (e.which === 220) {
      keyDown(false, keybrd['xy'])
    }
    if (e.which === 46 || (e.keyCode == 8 && e.shiftKey)) {
      keyDown(false, keybrd['AC'])
      doKey(keybrd['AC'].textContent, true)
      buffStr.pop()
      doKey('C', true)
      render('0')
    }
  }, false)

  document.addEventListener('keyup', function () {
    keyUp()
    saveState()
  }, false)

  document.body.addEventListener('paste', function (e) {
    render(`${parseFloat(`${e.clipboardData.getData('Text')}`)}`)
    calculator[parenthesis].curr = true
    keybrd['AC'].children[0].firstChild.data = 'C'
    if (frozen) freezeKey(frozen, true)
    e.preventDefault()
    alerts.innerHTML = 'Paste'
    fade(alerts)
    alerts.style.display = 'unset'
  }, false)

  document.body.addEventListener('copy', function (e) {
    hidden.textContent = resBuffer.replace(/\s/g, '')
    hidden.focus()
    hidden.select()
    alerts.innerHTML = 'Copy'
    fade(alerts)
    alerts.style.display = 'unset'
  }, false)


  screen.addEventListener('dblclick', function (e) {
    hidden.textContent = resBuffer.replace(/\s/g, '')
    hidden.focus()
    hidden.select()
    document.execCommand('copy')
    alerts.innerHTML = 'Copy'
    fade(alerts)
    alerts.style.display = 'unset'
  }, false)


  function fade(element) {
    let opacity = 1
    let timer = setInterval(function () {
      if (opacity <= 0.1) {
        clearInterval(timer)
        element.style.display = 'none'
      }
      element.style.opacity = opacity
      element.style.filter = `alpha(opacity=${opacity * 100})`
      opacity -= opacity * 0.1
    }, 50)
  };


  CalculatorMain.onmousedown = function (e) {
    keyDown(e)
    if (!pressed) return false
    document.addEventListener('mouseout', keyUp, false)
    document.addEventListener('mouseover', keyDown, false)
    return false
  }

  document.addEventListener('mouseup', function (e) {
    let event = e || window.event
    let target = getTargetKey(event.target)
    let keyText = target.textContent.replace(/\s*/g, '')
    let key = keybrd[keyText]

    if (event.target === smallKeys) {
      toggleCalc(false)
    }
    if (event.target === lNeper) {
      switchGrouping(true)
    }
    if (event.target !== lNeper) {
      toggleOptions()
    }
    document.removeEventListener('mouseout', keyUp, false)
    document.removeEventListener('mouseover', keyDown, false)
    if (!pressed) {
      return false
    }
    if (key) {
      doKey(keyText)
      saveState()
    }
  }, false)

  screen.parentElement.addEventListener('dblclick', function () {
    if (!helpButton.active) {
      toggleCalc(false)
    }
  }, false)

  helpButton.addEventListener('mouseover', function () {
    toggleOptions(true)
  }, false)


  function keyDown(e, obj) { 
    let event = e || window.event
    let target = obj || getTargetKey(event.target)
    let keyText = target.textContent.replace(/\s*/g, '')
    let key = keybrd[keyText]

    if (key) {
      keyUp() 
      pressed = key
      key.className = `${key.className} calc-press`
    }
    return false
  }

  function getTargetKey(elm) {
    while (elm !== CalculatorMain && elm.parentNode && elm.parentNode.style &&
          !/calc-(?:left|right)/.test(elm.parentNode.className)) {
      elm = elm.parentNode
    }
    return elm
  }

  function keyUp() {
    if (pressed && pressed !== secondActive) {
      pressed.className = pressed.className.replace(' calc-press', '')
      pressed = null
    }
  }

  function freezeKey(key, del) {
    let obj = (!del || del !== 2) ? frozen : key
    if (obj) obj.className = obj.className.replace(' calc-active', '')
    if (!del) {
      key.className = `${key.className} calc-active`
      frozen = key
    }
    return obj
  }

  function saveState() {
    for (let n = sav.length; n--;) {
      localStorage[sav[n]] = eval(sav[n])
    }
  }

  function toggleOptions(doIt) {
    helpButton.active = Boolean(doIt)
  }

  function toggleCalc(doIt) {
    let classname = CalculatorMain.className

    if (doIt) {
      bigger = !bigger
    }
    localStorage['bigger'] = bigger
    CalculatorMain.className = bigger
      ? classname.replace(' calc-small', '')
      : `${classname} calc-small`

    smallKeys.firstChild.data = bigger ? '>' : '<'
    render(resBuffer)
  }

  function switchGrouping(doIt) {
    if (doIt) {
      ln = ++ln > 3 ? 0 : ln
    }
    lNeper.firstChild.data = !ln ? '.' : ln === 1 ? ',' : ln === 2 ? ',.' : '.,'
    render(resBuffer)
    localStorage['ln'] = ln
  }

  function render(val, inp) {
    let rege = /(\d+)(\d{20})/
    let comma = val.match(/\./)
    let temporal
    let value = Math.abs(Number(val))
    let displayScreen = screen.style

    if (val.match(/NaN|Inf|Error/)) {
      temporal = 'Error'
    } else {
      resBuffer = val
      if (value >= 1e+16) {
        val = `${(Number(val)).toExponential(13)}`
      }
      if (!bigger && ((!inp || inp === '+/–') && value !== 0)) {
        val = (Number(val)).toPrecision(9)
      }
      temporal = (`${val}`).split('.')
      if (temporal[1]) {
        temporal[2] = temporal[1].split('e')
        if (temporal[2][1]) {
          temporal[1] = temporal[2][0]
        }
        if (!inp || inp === '+/–') {
          temporal[1] = (`${(Number(`1.${temporal[1]}`)).toPrecision(bigger ? 9 : temporal[2][1] ? 7 : 9)}`)
          if (temporal[1] >= 2) {
            temporal[0] = `${Number(temporal[0]) + 1}`
          }
          temporal[1] = temporal[1].substr(2).replace(/0+$/, '')
        }
      }
      while (rege.test(temporal[0])) {
        temporal[0] = temporal[0].replace(rege, '$1' + ' ' + '$2')
      }
      temporal = temporal[0] + ((temporal[1] || comma) ? `.${temporal[1]}` : '')
        .replace('.undefined', '')
        .replace(inp ? '' : /\.$/, '') + (temporal[2] && temporal[2][1] ? `e${temporal[2][1]}` : '')
    }
    if (ln) {
      temporal = temporal.replace(/\./g, '#')
        .replace(/\s/g, ln === 1 ? ' ' : ln === 2 ? ',' : '.')
        .replace(/#/g, ln === 2 ? '.' : ',')
    }
    screen.firstChild.data = temporal
    let screenDigitSize = document.getElementById('box').innerHTML.length
    if (screenDigitSize > 18) {
      displayScreen.fontSize = '23px'
    } else if (screenDigitSize > 15) {
      displayScreen.fontSize = '26px'
    } else {
      displayScreen.fontSize = '29px'
    }
  }

  function doKey(text, alt) {
    let key = keybrd[text] 

    if (text === '2nd') {
      secondActive = secondActive ? null : true
      key.className = secondActive ? 'calc-press calc-second' : 'trigo-keys' // !!!
      for (let n = secondaryKeys.length; n--;) {
        secondaryKeys[n].children[0].innerHTML = secondLayer[secondActive ? 1 : 0][n]
      }
    } else if (text.match(/^[+|–|÷|×|yx|x√y|E]+$/) && text !== '√') {
      freezeKey(key)
    } else if (text.match(/^[\d|\.|π]$/)) {
      freezeKey(key, true)
      keybrd['AC'].children[0].firstChild.data = 'C'
    } else if (text === 'C') {
      key.children[0].firstChild.data = 'AC'
      if (frozen) freezeKey(frozen)
    } else if (text.match(/AC|=/)) {
      if (bracketKey) freezeKey(bracketKey, 2)
      freezeKey(key, true)
      frozen = null
    } else if (text.match(/Deg|Rad/)) {
      state.firstChild.data = degreeMode ? 'Rad' : 'Deg'
      key.children[0].firstChild.data = degreeMode ? 'Deg' : 'Rad'
      degreeMode = !degreeMode
    } else if (text === '(') {
      bracketKey = key
      freezeKey(bracketKey, 2).className += ' calc-active'
    } else if (text === ')' && parenthesis === 1 && bracketKey) {
      freezeKey(bracketKey, 2)
    } else if (text.match(/^mr$/) && memory) {
      keybrd['AC'].children[0].firstChild.data = 'C'
    }

    evalKey(text)

    if (!alt) {
      keyUp()
    }
    if (text.match(/^m[c|+|-]/)) {
      freezeKey(keybrd['mr'], 2).className += (memory ? ' calc-active' : '')
    }
  }

  function evalKey(key) {
    let displayValue = `${resBuffer.replace(/\s/g, '').replace(/Error|∞|-∞/, '0')}`
    let pi = Math.PI
    let last

    if (!key.match(/2nd|Deg|Rad|m/)) {
      buffStr.push(key)
      if ((buffStr[buffStr.length - 2] === '=' && key !== '=' &&
              calculator[parenthesis].curr) || key === 'AC') {
        buffStr = [key]
      }
    }
    last = buffStr[buffStr.length - 2]
    if (key.match(/^[\d|\.]$/) || key === '+/–') {
      if (calculator[parenthesis].curr && key !== '+/–' || (key === '+/–' &&
              last && last.match(/^[+|–|÷|×|yx|x√y|E|^C]+$/))) {
        displayValue = '0'
        calculator[parenthesis].curr = false
      }
      if ((Math.abs(Number(displayValue + key)) > (bigger ? 1e15 : 1e9) ||
              displayValue.replace(/^-/, '').length > 15 ||
              (displayValue.replace('-', '').replace(/\./g, '').length > (bigger ? 14 : 8)) ||
              (displayValue.match(/\.|\e\+/) && key === '.')) && key !== '+/–') {
        buffStr.pop()
      } else if (key === '+/–') {
        render(!(displayValue.replace(/e[\+|\-]/, '')).match('-')
          ? `-${displayValue}` : displayValue.replace(/^-/, ''), '+/–')
      } else {
        render((displayValue + key).replace(/^(-)*?0(\d)$/, '$1' + '$2'), true)
      }
    } else if (key.match(/^C|AC/)) {
      render(calculator[parenthesis].init(key))
      hold.textContent = ''
    } else if (key.match(/^[+|–|÷|×|-|\/|*|yx|x√y|%|E]+$/) && key !== '√') {
      render(calculator[parenthesis].calc(key, displayValue))
    } else {
      if (parenthesis > -1) {
        calculator[parenthesis].curr = 'funk'
      }
      switch (key) {
        case '=':
          while (parenthesis > -1) {
            render(displayValue = calculator[parenthesis--].calc('=', displayValue))
          }
          parenthesis = 0
          calculator[parenthesis].curr = true
          break
        case '(':
          calculator[++parenthesis] = new Calculator()
          calculator[parenthesis].curr = true
          break
        case ')':
          if (parenthesis) {
            render(calculator[parenthesis--].calc('=', displayValue))
          }
          if (parenthesis > -1) {
            calculator[parenthesis].curr = false
          }
          break
        case 'mc':
          memory = 0
          break
        case 'm+':
          memory += Number(displayValue)
          break
        case 'm-':
          memory -= Number(displayValue)
          break
        case 'mr':
          render(`${memory}`)
          break
        case '1/x':
          render(`${1 / displayValue}`)
          break
        case 'x2':
          render(`${Math.pow(displayValue, 2)}`)
          break
        case 'x3':
          render(`${Math.pow(displayValue, 3)}`)
          break
        case 'x!':
          render(`${(function fak(n) {
            return n < 0 || n > 170 ? NaN : n <= 1 ? 1 : n * fak(n - 1)
          })(Math.round(Number(displayValue)))}`)
          break
        case '√':
          render(`${Math.sqrt(displayValue)}`)
          break
        case 'log':
          render(`${Math.log(displayValue) / Math.log(10)}`)
          break
        case 'sin':
          render(!degreeMode && Math.abs(displayValue) === pi ? '0'
            : `${Math.sin(displayValue * (degreeMode ? pi / 180 : 1))}`)
          break
        case 'sin-1':
          render(`${Math.asin(displayValue) * (degreeMode ? 180 / pi : 1)}`)
          break
        case 'cos':
          render(`${Math.cos(displayValue * (degreeMode ? pi / 180 : 1))}`)
          break
        case 'cos-1':
          render(`${Math.acos(displayValue) * (degreeMode ? 180 / pi : 1)}`)
          break
        case 'tan':
          render(!degreeMode && Math.abs(displayValue) === pi ? '0'
            : `${Math.tan(displayValue * (degreeMode ? pi / 180 : 1))}`)
          break
        case 'tan-1':
          render(`${Math.atan(displayValue) * (degreeMode ? 180 / pi : 1)}`)
          break
        case 'ln':
          render(`${Math.log(displayValue)}`)
          break
        case 'log2':
          render(`${Math.log(displayValue) / Math.log(2)}`)
          break
        case 'sinh':
          render(`${(Math.pow(Math.E, displayValue) - Math.pow(Math.E, -displayValue)) / 2}`)
          break
        case 'sinh-1':
          render(`${Math.log(Number(displayValue) + Math.sqrt(1 + Math.pow(displayValue, 2)))}`)
          break
        case 'cosh':
          render(`${(Math.pow(Math.E, displayValue) + Math.pow(Math.E, -displayValue)) / 2}`)
          break
        case 'cosh-1':
          render(`${2 * Math.log(Math.sqrt((Number(displayValue) + 1) / 2) + Math.sqrt((Number(displayValue) - 1) / 2))}`)
          break
        case 'tanh':
          (function (e1, e2) {
            render(`${(e1 - e2) / (e1 + e2)}`)
          })(Math.pow(Math.E, displayValue), Math.pow(Math.E, -displayValue))
          break
        case 'tanh-1':
          render(`${(Math.log(Number(displayValue) + 1) - Math.log(1 - displayValue)) / 2}`)
          break
        case 'ex':
          render(`${Math.exp(displayValue)}`)
          break
        case '2x':
          render(`${Math.pow(2, (displayValue))}`)
          break
        case 'π':
          render(`${pi}`)
          break
        case 'Rand':
          render(`${Math.random()}`)
          break
        default:
          buffStr.pop()
          break
      }
    }
  }

  let radchange = document.getElementById('rad')
  let sign = document.getElementsByClassName('sign')[0]

  function signChanger() {
    if (radchange.getElementsByTagName('div')[0].innerText === 'Rad') {
      sign.innerText = '360º'
    } else if (radchange.getElementsByTagName('div')[0].innerText === 'Deg') {
      sign.innerText = '2π'
    }
  };
  radchange.addEventListener('click', signChanger)
  window.addEventListener('load', signChanger)
})(window)
