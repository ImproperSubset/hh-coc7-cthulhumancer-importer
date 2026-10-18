import * as fs from 'fs'
import * as path from 'path'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import TemplateHelpers from './src/template-helpers.js'
import TerserPlugin from 'terser-webpack-plugin'
import WebpackBar from 'webpackbar'

export default class WebpackConfig {
  #args
  #config
  #validated

  /**
   * Constructor
   */
  constructor () {
    TemplateHelpers.requireNodeVersion()

    this.#args = TemplateHelpers.parseNodeArguments('Webpack command line extender', {
      mode: { message: 'Production or Development', group: false },
      debug: { message: 'Show the config before passing to Webpack.', group: false },
      env: { message: 'Allow passing arguments to this config script', group: true }
    })
    this.#config = {}
    this.#validated = false
  }

  /**
   * Read fvtt.config.json and the module manifest, and check the build folders
   */
  async validate () {
    this.#config.rootFolder = TemplateHelpers.systemRoot

    if (!fs.existsSync(path.join(this.#config.rootFolder, 'fvtt.config.json'))) {
      throw new Error('No fvtt.config try running "npm run init"')
    }

    const jsonConfig = JSON.parse(fs.readFileSync(path.join(this.#config.rootFolder, '/fvtt.config.json'), 'utf8'))
    if (typeof jsonConfig?.currentSelection === 'undefined') {
      throw new Error('No currentSelection found in ./fvtt.config.json file')
    } else if (typeof jsonConfig[jsonConfig.currentSelection] === 'undefined') {
      throw new Error('No ' + jsonConfig?.currentSelection + ' found in ./fvtt.config.json file')
    }

    if (!['development', 'production'].includes(this.#args.mode ?? '')) {
      throw new Error('Mode should be "production" or "development"')
    }

    this.#config.buildMode = this.#args.mode
    this.#config.debugOutput = (this.#args.env ?? []).includes('debug')
    this.#config.folderId = TemplateHelpers.loadModuleManifest().id
    this.#config.suffixFolder = path.join('/Data/modules', this.#config.folderId)
    if (typeof jsonConfig[jsonConfig.currentSelection] === 'string') {
      this.#config.prefixFolders = {
        [jsonConfig.currentSelection]: jsonConfig[jsonConfig.currentSelection]
      }
    } else {
      this.#config.prefixFolders = jsonConfig[jsonConfig.currentSelection]
    }

    this.#config.entryPath = path.join(this.#config.rootFolder, this.#config.folderId, 'module.js')
    if (!fs.existsSync(this.#config.entryPath)) {
      throw new Error('Entry point ' + this.#config.entryPath + ' not found')
    }

    for (const prefixFolder in this.#config.prefixFolders) {
      const outputFolder = path.join(this.#config.prefixFolders[prefixFolder], this.#config.suffixFolder)
      if (fs.existsSync(outputFolder)) {
        const check = fs.lstatSync(outputFolder)
        if (!check.isDirectory()) {
          throw new Error('Build location ' + fs.realpathSync(outputFolder) + ' is not a directory')
        }
      }
      if (fs.existsSync(outputFolder) && !fs.existsSync(path.join(outputFolder, 'module.json'))) {
        const complete = await TemplateHelpers.selectText({ prompt: 'This will ' + (this.#args.mode === 'production' ? 'empty' : 'write to') + ' the folder ' + fs.realpathSync(outputFolder), defaultText: 'Quit', defaultOptions: ['Okay', 'Quit'] })
        if (complete === false || complete === 'Quit') {
          process.exit(1)
        }
      }
    }

    this.#validated = true
  }

  /**
   * Webpack config for one build folder
   * @param {string} name
   * @param {string} outputFolder
   * @returns {object}
   */
  #folderConfig (name, outputFolder) {
    const production = this.#config.buildMode === 'production'
    const root = this.#config.rootFolder
    return {
      name,
      bail: production,
      context: root,
      entry: this.#config.entryPath,
      devtool: production ? false : 'inline-source-map',
      mode: this.#config.buildMode,
      optimization: production
        ? {
          minimize: true,
          minimizer: [
            new TerserPlugin({
              terserOptions: {
                mangle: false
              }
            })
          ]
        }
        : undefined,
      output: {
        clean: production,
        path: outputFolder,
        filename: 'module.js'
      },
      plugins: [
        new WebpackBar({}),
        new CopyWebpackPlugin({
          patterns: [
            { from: path.join(root, 'static/module.json'), to: 'module.json' },
            { from: path.join(root, 'static/lang/'), to: 'lang/' },
            { from: path.join(root, 'README.md'), to: 'README.md' },
            { from: path.join(root, 'LICENSE'), to: 'LICENSE', toType: 'file' },
            { from: path.join(root, 'LICENSING.md'), to: 'LICENSING.md' }
          ]
        })
      ],
      resolve: {
        extensions: ['.js']
      },
      watch: this.#config.buildMode === 'development'
    }
  }

  /**
   * Generate one webpack config per build folder
   * @returns {Array<object>}
   */
  generate () {
    if (this.#validated !== true) {
      throw new Error('Not validated')
    }

    const configs = []
    for (const prefixFolder in this.#config.prefixFolders) {
      configs.push(this.#folderConfig(prefixFolder, path.join(this.#config.prefixFolders[prefixFolder], this.#config.suffixFolder)))
    }

    if (this.#config.debugOutput) {
      console.log(TemplateHelpers.ansiFormat('config =', { color: 'green' }) + JSON.stringify(this.#config, null, 2))
      console.log(TemplateHelpers.ansiFormat('output =', { color: 'green' }) + JSON.stringify(configs, null, 2))
      process.exit(1)
    }

    return configs
  }
}
