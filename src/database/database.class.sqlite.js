import path from 'path'
import {Sequelize} from 'sequelize'
import Helper from '../helper.class.js'
import schemaLoader from './loadSchemas.js'
import Database from './database.class.js'

/**
 * Database class
 *
 * @class SQLiteDatabase
 * @classdesc SQLite class
 */
export default class extends Database {
  /**
   * Configure, build models and intialise connection.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function init
   */
  init = async () => {
    let storage = ':memory:'
    if (!this.memoryOnly) {
      let databaseFilePath = this.databaseFile
      if (!databaseFilePath) {
        const databaseDir = `${path.resolve('.')}/datastore`
        Helper.mkdir(databaseDir)
        databaseFilePath = `${databaseDir}/database.db`
      }
      const doesFileExist = await Helper.fileExists(databaseFilePath)
      if (!doesFileExist) {
        Helper.mkdir(path.dirname(databaseFilePath))
      }
      storage = databaseFilePath
    }
    this.sequelize = new Sequelize({
      dialect: 'sqlite',
      storage
    })

    const {fields, tests, virtuals} = await schemaLoader(
      Helper.DATABASE_TYPE_SQLITE,
      this.userDataModelsPath,
      this.sequelize
    )
    await this.sequelize.sync()
    // TODO: migrations
    await this.initAccount()
    this.models = this.sequelize.models
    this.fields = fields
    this.tests = tests
    this.virtuals = virtuals
    this.defineModels()
  }

  /**
   * Connection facade.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function connect
   * @returns {Promise<Database>}
   */
  connect = async () => {
    await this.init()
    return this
  }

  /**
   * End connection.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function disconnect
   */
  disconnect = async () => {
    await this.sequelize.close()
  }

  /**
   * Drop the database.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function dropDatabase
   */
  dropDatabase = async () => {
    await Helper.deleteFile(this.sequelize.options.storage)
  }

  /**
   * Count rows.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function count
   * @param {String} model - Name of the database model.
   * @param {Object} where - An object that specifies filter parameters.
   * @returns {Promise<Number>}
   */
  count = async (model, data) => {
    try {
      const number = await this.sequelize.models[model].count(
        Helper.gaurdedCondition(data, Helper.IS_SQL)
      )
      return parseInt(number)
    } catch (error) {
      Helper.developerPrinter(error)
      return -1
    }
  }

  /**
   * Find one row.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function findOne
   * @param {String} model - Name of the database model.
   * @param {Object} where - An object that specifies filter parameters.
   * @param {Object} options - An object that specifies options.
   * @returns {Promise<Object>}
   */
  findOne = async (model, data, options = {}) => {
    try {
      const where = {
        ...Helper.gaurdedCondition(data, Helper.IS_SQL),
        ...this.setSelectOptions(model, options)
      }
      const response = await this.sequelize.models[model].findOne(where)
      return response !== null ? response.toJSON() : null
    } catch (error) {
      Helper.developerPrinter(error)
      return undefined
    }
  }

  /**
   * Find one row by its Id.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function findById
   * @param {String} model - Name of the database model.
   * @param {String|Number} id - An integer or string that specifies the row Id.
   * @param {Object} options - An object that specifies options.
   * @returns {Promise<Object>}
   */
  findById = async (model, id, options = {}) => {
    try {
      const response = await this.sequelize.models[model].findByPk(
        id,
        this.setSelectOptions(model, options)
      )
      return response !== null ? response.toJSON() : null
    } catch (error) {
      Helper.developerPrinter(error)
      return undefined
    }
  }

  /**
   * Find one or more rows.
   *
   * @memberof SQLiteDatabase
   * @function find
   * @param {String} model - Name of the database model.
   * @param {Object} where - An object that specifies filter parameters.
   * @param {Object} options - An object that specifies options.
   * @returns {Promise<Array>}
   */
  find = async (model, data, options = {}) => {
    try {
      const where = {
        ...Helper.gaurdedCondition(data, Helper.IS_SQL),
        ...this.setSelectOptions(model, options)
      }
      const responses = await this.sequelize.models[model].findAll(where)
      return responses !== null ? responses.map(response => response.toJSON()) : null
    } catch (error) {
      Helper.developerPrinter(error)
      return undefined
    }
  }

  /**
   * Insert a row.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function insert
   * @param {String} model - Name of the database model.
   * @param {Object} data - An object that specifies the row contents.
   * @returns {Promise<Object>}
   */
  insert = async (model, data) => {
    try {
      const response = await this.sequelize.models[model].create(data)
      return response !== null ? response.toJSON() : null
    } catch (error) {
      Helper.developerPrinter(error)
      return undefined
    }
  }

  /**
   * Update one row.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function updateOne
   * @param {String} model - Name of the database model.
   * @param {Object} where - An object that specifies filter parameters.
   * @param {Object} data - An object that specifies the row contents.
   * @returns {Promise<Number>}
   */
  updateOne = async (model, where, data) => {
    try {
      const response = await this.sequelize.models[model].update(data, {
        ...Helper.gaurdedCondition(where, Helper.IS_SQL),
        limit: 1
      })
      const count = Array.isArray(response) ? response[0] : response
      return parseInt(count)
    } catch (error) {
      Helper.developerPrinter(error)
      return -1
    }
  }

  /**
   * Update one or more rows.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function update
   * @param {String} model - Name of the database model.
   * @param {Object} where - An object that specifies filter parameters.
   * @param {Object} data - An object that specifies the row contents.
   * @returns {Promise<Number>}
   */
  update = async (model, where, data) => {
    try {
      const response = await this.sequelize.models[model].update(
        data,
        Helper.gaurdedCondition(where, Helper.IS_SQL)
      )
      const count = Array.isArray(response) ? response[0] : response
      return parseInt(count)
    } catch (error) {
      Helper.developerPrinter(error)
      return -1
    }
  }

  /**
   * Update or Insert a row.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function upsert
   * @param {String} model - Name of the database model.
   * @param {Object} where - An object that specifies filter parameters.
   * @param {Object} data - An object that specifies the row contents.
   * @returns {Promise<Object>}
   */
  upsert = async (model, where, data) => {
    try {
      await this.sequelize.models[model].upsert(data, Helper.gaurdedCondition(where, Helper.IS_SQL))
      return await this.findOne(model, where)
    } catch (error) {
      Helper.developerPrinter(error)
      return undefined
    }
  }

  /**
   * Delete a row.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function delete
   * @param {String} model - Name of the database model.
   * @param {Object} where - An object that specifies filter parameters.
   * @returns {Promise<Number>}
   */
  delete = async (model, where) => {
    try {
      const number = await this.sequelize.models[model].destroy(
        Helper.gaurdedCondition(where, Helper.IS_SQL, Helper.REQUIRES_CONDITION)
      )
      return parseInt(number)
    } catch (error) {
      Helper.developerPrinter(error)
      return -1
    }
  }

  /**
   * Validate and create options object.
   *
   * @memberof Database
   * @function setSelectOptions
   * @param {String} modelName - Name of the database model.
   * @param {Object} options - An object.
   * @returns {Object}
   */
  setSelectOptions = (modelName, options) => {
    if (!this.hasOptions(options)) {
      return {}
    }
    const {populate} = options
    const virtuals = this.virtuals[modelName]
    const selectOptions = {}
    if (Array.isArray(populate) && populate.length > 0) {
      const populateQuery = []
      populate.forEach(populateKey => {
        const modelObject = this.sequelize.models[virtuals[populateKey].ref]
        populateQuery.push({model: modelObject, as: populateKey})
      })
      selectOptions.include = populateQuery
    }
    return selectOptions
  }
}
