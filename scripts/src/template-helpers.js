import * as fs from 'fs'
import * as os from 'os'
import * as readline from 'readline'

export default class TemplateHelpers {
  /**
   * Path to root
   * @returns {string}
   */
  static get systemRoot () {
    return process.cwd().replace(/\\/g, '/')
  }

  /**
   * Colorize string
   * @param {string} text
   * @param {object} options
   * @param {string} options.color
   * @param {string} options.bgColor
   * @param {boolean} options.bold
   * @param {boolean} options.underline
   * @param {boolean} options.output
   * @returns {string}
   */
  static ansiFormat (text, { color, bgColor, bold = false, underline = false, output = false } = {}) {
    const colors = {
      black: 30,
      red: 31,
      green: 32,
      yellow: 33,
      blue: 34,
      purple: 35,
      cyan: 36,
      white: 37
    }
    const codes = []
    if (bold) {
      codes.push('1')
    }
    if (underline) {
      codes.push('4')
    }
    if (typeof colors[color] !== 'undefined') {
      codes.push(colors[color])
    }
    if (typeof colors[bgColor] !== 'undefined') {
      codes.push(parseInt(colors[bgColor], 10) + 10)
    }
    const formatted = (codes.length === 0 ? `\x1b[0m${text}` : '\x1b[' + codes.join(';') + 'm' + text + '\x1b[0m')
    if (output) {
      console.log(formatted)
    }
    return formatted
  }

  /**
   * Prompt for FoundryVTT
   * @returns {Promise<string>}
   */
  static inputFoundryVTTPath () {
    return new Promise(resolve => {
      console.log('')
      console.log('Enter the path to the FoundryVTT User Data Path')
      console.log('')
      console.log('This can be found in the FoundryVTT Setup page, Configure, User Data Path')
      console.log('Examples: ' + TemplateHelpers.ansiFormat('C:\\Users\\' + os.userInfo().username + '\\AppData\\Local\\FoundryVTT', { color: 'green' }) + ' (You can use this path style if you are using WSL, it will automatically be converted)')
      console.log('          ' + TemplateHelpers.ansiFormat('~/Library/Application Support/FoundryVTT', { color: 'green' }))
      console.log('          ' + TemplateHelpers.ansiFormat('/home/' + os.userInfo().username + '/.local/share/FoundryVTT', { color: 'green' }))
      console.log('')
      TemplateHelpers.inputFoundryVTTPathTry().then((value) => {
        resolve(value)
      })
    })
  }

  /**
   * Check for valid FoundryVTT User Data Path
   * @returns {Promise<string>}
   */
  static inputFoundryVTTPathTry () {
    return new Promise(resolve => {
      TemplateHelpers.inputText({ prompt: 'Path (empty to end)' }).then((value) => {
        if (value !== '') {
          value = value.replace(/\\/g, '/')
          if (os.type() === 'Linux') {
            const drive = value.match(/^([a-z]):(.+)$/i)
            if (drive) {
              // Attempting to use a Windows path in WSL
              value = '/mnt/' + drive[1].toLowerCase() + drive[2]
            }
          }
          if (!fs.existsSync(value + '/Data/modules') || !fs.existsSync(value + '/Data/systems') || !fs.existsSync(value + '/Data/worlds')) {
            console.log('')
            TemplateHelpers.ansiFormat('The path does not contain a FoundryVTT User Data Path', { color: 'red', output: true })
            TemplateHelpers.inputFoundryVTTPathTry().then((value) => {
              resolve(value)
            })
            return
          }
        }
        resolve(value)
      })
    })
  }

  /**
   * Get user input
   * @param {object} options
   * @param {string} options.prompt
   * @param {string} options.defaultText
   * @param {Array|undefined} options.defaultOptions
   * @returns {Promise<string>}
   */
  static inputText ({ prompt = '', defaultText = '', defaultOptions = undefined } = {}) {
    return new Promise(resolve => {
      const options = {
        input: process.stdin,
        output: process.stdout
      }
      if (typeof defaultOptions !== 'undefined') {
        options.completer = (line) => {
          const lcl = line.toString().toLowerCase()
          const found = defaultOptions.filter(t => t.toString().toLowerCase().indexOf(lcl) === 0)
          return [found, line]
        }
        console.log('')
        console.log(TemplateHelpers.ansiFormat('Suggested Values (tab to auto complete)', { color: 'blue', bold: true }))
        for (const value of defaultOptions) {
          console.log(' ' + value)
        }
      }
      const rl = readline.createInterface(options)
      rl.question(TemplateHelpers.ansiFormat(prompt + (defaultText !== '' ? ' (' + defaultText + ')' : '') + ': ', { color: 'blue', bold: true }), (answer) => {
        const text = answer.trim()
        if (text.length === 0) {
          resolve(defaultText)
        } else {
          resolve(text)
        }
        rl.close()
      })
    })
  }

  /**
   * Load static/module.json
   * @returns {object}
   */
  static loadModuleManifest () {
    const manifestPath = TemplateHelpers.systemRoot + '/static/module.json'
    if (!fs.existsSync(manifestPath)) {
      throw new Error('No static/module.json')
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    if (typeof manifest?.id === 'undefined') {
      throw new Error('No id found in static/module.json')
    }
    return manifest
  }

  /**
   * Parse Node argv into array
   * @param {string} message
   * @param {object} options
   * @param {string} options.<key>.message
   * @param {boolean} options.<key>.group
   * @returns {object}
   */
  static parseNodeArguments (message, options) {
    const args = {}
    const regEx = new RegExp('^--(help|' + Object.keys(options).map(t => TemplateHelpers.quoteRegExp(t)).join('|') + ')(=(.+))?$')
    for (let i = 2, im = process.argv.length; i < im; i++) {
      const match = process.argv[i].match(regEx)
      if (match) {
        const key = match[1]
        let value = match[3]
        if (!match[3]) {
          if ((process.argv[i + 1] ?? '--').match(/^--/)) {
            value = true
          } else {
            value = process.argv[i + 1] ?? ''
            i++
          }
        }
        if (value === 'false') {
          value = false
        } else if (value === 'true') {
          value = true
        }
        if (key === 'help' || options[key].group === false) {
          args[key] = value
        } else if (options[key].group === true) {
          if (typeof args[key] === 'undefined') {
            args[key] = []
          }
          args[key].push(value)
        }
      }
    }
    if (args.help) {
      if (message.length) {
        TemplateHelpers.ansiFormat(message, { color: 'green', output: true })
      }
      console.log('')
      console.log('npm run ' + process.env.npm_lifecycle_event + ' -- <options>')
      console.log('')
      for (const key in options) {
        console.log(TemplateHelpers.ansiFormat(key, { color: 'green' }) + ': ' + options[key].message)
      }
      console.log('')
      process.exit(0)
    }
    return args
  }

  /**
   * Escape a string for use in a Regular Expression
   * @param {string} string
   * @returns {string}
   */
  static quoteRegExp (string) {
    // RegExp.escape needs Node 24; package.json allows 22.13
    return string.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&')
  }

  /**
   * Check node version and exit if below required version
   */
  static requireNodeVersion () {
    const currentNodeVersion = process.versions.node
    const [major, minor] = currentNodeVersion.split('.').map(Number)

    if (major < 20 || (major === 20 && minor < 9)) {
      TemplateHelpers.ansiFormat('Requires Node 20.9 or higher.\n' + 'You are currently using Node ' + currentNodeVersion + '.\n' + 'Please update your version of Node.', { color: 'red', output: true })
      process.exit(1)
    }
  }

  /**
   * Get user selected option
   * @param {object} options
   * @param {string} options.prompt
   * @param {string} options.defaultText
   * @param {Array|undefined} options.defaultOptions
   * @returns {Promise<string|false>}
   */
  static selectText ({ prompt = '', defaultText = '', defaultOptions = [] } = {}) {
    return new Promise(resolve => {
      const options = {
        input: process.stdin,
        output: process.stdout
      }

      let letters = defaultOptions.map(w => w.toString().substring(0, 1).toLowerCase()).join('')
      letters = letters + letters
      const optionCount = defaultOptions.length - 1
      let selectIndex = defaultOptions.findIndex(t => t === defaultText)
      if (selectIndex === -1) {
        selectIndex = optionCount
      }

      let max = 1
      for (const offset in defaultOptions) {
        max = Math.max(max, defaultOptions[offset].length)
      }
      for (const offset in defaultOptions) {
        defaultOptions[offset] = ' ' + defaultOptions[offset].padEnd(max) + ' '
      }

      readline.emitKeypressEvents(options.input)
      options.input.setRawMode(true)
      options.input.resume().on('keypress', (value, key) => {
        if (key) {
          if (key.name === 'escape' || (key.name === 'c' && key.ctrl)) {
            options.input.setRawMode(false)
            options.input.removeListener('keypress', options.input.rawListeners('keypress')[0])
            resolve(false)
            return
          }
          if (key.name === 'return') {
            options.input.setRawMode(false)
            options.input.removeListener('keypress', options.input.rawListeners('keypress')[0])
            resolve(defaultOptions[selectIndex].trim())
            return
          }
          if (key.name === 'down' && selectIndex < optionCount) {
            TemplateHelpers.#selectTextDisplay(options.output, defaultOptions[selectIndex], optionCount, selectIndex, false)
            selectIndex++
            TemplateHelpers.#selectTextDisplay(options.output, defaultOptions[selectIndex], optionCount, selectIndex, true)
          } else if (key.name === 'up' && selectIndex > 0) {
            TemplateHelpers.#selectTextDisplay(options.output, defaultOptions[selectIndex], optionCount, selectIndex, false)
            selectIndex--
            TemplateHelpers.#selectTextDisplay(options.output, defaultOptions[selectIndex], optionCount, selectIndex, true)
          } else {
            const match = (key.name ?? '').match(/^[a-z]$/)
            if (match) {
              const position = letters.indexOf(match, selectIndex + 1)
              if (position > -1) {
                TemplateHelpers.#selectTextDisplay(options.output, defaultOptions[selectIndex], optionCount, selectIndex, false)
                selectIndex = position % (1 + optionCount)
                TemplateHelpers.#selectTextDisplay(options.output, defaultOptions[selectIndex], optionCount, selectIndex, true)
              }
            }
          }
        }
      })

      TemplateHelpers.ansiFormat(prompt + (defaultText !== '' ? ' (' + defaultText + ')' : '') + ': ', { color: 'blue', bold: true, output: true })

      for (const offset in defaultOptions) {
        const ending = (offset !== optionCount ? '\n' : '')
        const option = TemplateHelpers.ansiFormat(defaultOptions[offset], { color: (offset === selectIndex.toString() ? 'black' : 'white'), bgColor: (offset === selectIndex.toString() ? 'white' : 'black') })
        options.output.write(option + ending)
      }
    })
  }

  /**
   * Replace selected line on screen
   * @param {stdout} output
   * @param {string} text
   * @param {int} optionCount
   * @param {int} selectIndex
   * @param {bool} selected
   */
  static #selectTextDisplay (output, text, optionCount, selectIndex, selected) {
    const oldUps = (optionCount - selectIndex) + 1
    const option = TemplateHelpers.ansiFormat(text, { color: (selected ? 'black' : 'white'), bgColor: (selected ? 'white' : 'black') })
    output.write('\u001B[' + oldUps + 'A' + option + '\u001B[G\u001B[' + oldUps + 'B')
  }

  /**
   * Show caught error and exit
   * @param {Error} e
   */
  static showErrorAndExit (e) {
    const match = (e.stack ?? '').match(/([^/\\]*):(\d+):(\d+)/)
    const stack = (match ? match[1] + ':' + match[2] + ' col ' + match[3] : '')
    TemplateHelpers.ansiFormat('ERROR: ' + e.message + '\n' + stack, { color: 'red', output: true })
    process.exit(1)
  }
}
